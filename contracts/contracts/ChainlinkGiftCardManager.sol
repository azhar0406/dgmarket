// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@inco/lightning/src/Lib.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "./DGMarketCore.sol";
import "./ConfidentialGiftCard.sol";

/**
 * @title ChainlinkGiftCardManager
 * @dev Manages gift card inventory using Chainlink Functions for automated restocking
 * @notice Replaces AI-agent system with Chainlink Functions for API integration
 */
contract ChainlinkGiftCardManager is AccessControl, Pausable, ReentrancyGuard, FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    
    // Contracts
    DGMarketCore public immutable marketContract;
    ConfidentialGiftCard public immutable giftCardContract;
    
    // Chainlink Functions configuration
    bytes32 private donId;
    uint64 private subscriptionId;
    uint32 private gasLimit;
    
    // JavaScript source code for Chainlink Functions
    string private constant SOURCE_CODE = 
        "const category = args[0];"
        "const apiUrl = `https://api.dgmarket.com/restock?category=${category}`;"
        "const restockRequest = Functions.makeHttpRequest({"
        "  url: apiUrl,"
        "  method: 'GET',"
        "  headers: {"
        "    'Content-Type': 'application/json'"
        "  }"
        "});"
        "const restockResponse = await restockRequest;"
        "if (restockResponse.error) {"
        "  throw Error('API request failed');"
        "}"
        "return Functions.encodeString(JSON.stringify(restockResponse.data));";
    
    // Inventory tracking
    struct CategoryInventory {
        string name;
        uint256 count;
        uint256 threshold; // When inventory falls below this, trigger restock
        bool active;
    }
    
    // Category management
    mapping(string => CategoryInventory) public categoryInventory;
    string[] public categories;
    
    // Request tracking
    struct ChainlinkRequest {
        bytes32 requestId;
        string category;
        uint256 timestamp;
        bool fulfilled;
    }
    
    mapping(bytes32 => ChainlinkRequest) public chainlinkRequests;
    bytes32[] public pendingRequests;
    
    // Events
    event CategoryAdded(string category, uint256 threshold);
    event CategoryUpdated(string category, uint256 threshold);
    event InventoryUpdated(string category, uint256 newCount);
    event RestockRequested(bytes32 indexed requestId, string category);
    event RestockFulfilled(bytes32 indexed requestId, string category, bytes response);
    event GiftCardAdded(uint256 indexed cardId, string category, address creator);
    event ChainlinkFunctionUpdated(bytes32 donId, uint64 subscriptionId, uint32 gasLimit);
    
    // Custom errors
    error InvalidCategory(string category);
    error ThresholdTooLow(uint256 threshold);
    error RequestNotFound(bytes32 requestId);
    error RequestAlreadyFulfilled(bytes32 requestId);
    error UnauthorizedFulfillment(address sender);
    error EmptyResponse();
    
    /**
     * @dev Constructor initializes the contract with required addresses and configurations
     * @param _marketContract Address of the DGMarketCore contract
     * @param _giftCardContract Address of the ConfidentialGiftCard contract
     * @param _router Address of the Chainlink Functions Router
     * @param _donId DON ID for Chainlink Functions
     * @param _subscriptionId Chainlink Functions subscription ID
     */
    constructor(
        address _marketContract,
        address _giftCardContract,
        address _router,
        bytes32 _donId,
        uint64 _subscriptionId
    ) FunctionsClient(_router) {
        require(_marketContract != address(0), "Invalid market contract");
        require(_giftCardContract != address(0), "Invalid gift card contract");
        
        marketContract = DGMarketCore(_marketContract);
        giftCardContract = ConfidentialGiftCard(_giftCardContract);
        
        donId = _donId;
        subscriptionId = _subscriptionId;
        gasLimit = 300000; // Default gas limit
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Add a new gift card category with inventory threshold
     * @param category The category name
     * @param threshold The inventory threshold for automatic restocking
     */
    function addCategory(string calldata category, uint256 threshold) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(bytes(category).length > 0, "Empty category name");
        require(threshold > 0, "Threshold must be positive");
        require(!categoryInventory[category].active, "Category already exists");
        
        categoryInventory[category] = CategoryInventory({
            name: category,
            count: 0,
            threshold: threshold,
            active: true
        });
        
        categories.push(category);
        emit CategoryAdded(category, threshold);
    }
    
    /**
     * @dev Update category threshold
     * @param category The category name
     * @param threshold The new inventory threshold
     */
    function updateCategoryThreshold(string calldata category, uint256 threshold) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (!categoryInventory[category].active) revert InvalidCategory(category);
        if (threshold == 0) revert ThresholdTooLow(threshold);
        
        categoryInventory[category].threshold = threshold;
        emit CategoryUpdated(category, threshold);
    }
    
    /**
     * @dev Add a new gift card to inventory
     * @param valueInput The encrypted value of the gift card
     * @param description Public description of the gift card
     * @param imageUrl Public image URL for the gift card
     * @param expiryDate Expiry timestamp (0 for no expiry)
     * @param category The category of the gift card
     * @return cardId The ID of the newly created gift card
     */
    function addGiftCard(
        bytes memory valueInput,
        string calldata description,
        string calldata imageUrl,
        uint256 expiryDate,
        string calldata category
    ) 
        external 
        whenNotPaused 
        nonReentrant 
        onlyRole(ADMIN_ROLE) 
        returns (uint256 cardId) 
    {
        if (!categoryInventory[category].active) revert InvalidCategory(category);
        
        // Create gift card in the gift card contract
        cardId = giftCardContract.createGiftCard(
            valueInput,
            description,
            imageUrl,
            expiryDate
        );
        
        // Update inventory count
        categoryInventory[category].count++;
        
        emit GiftCardAdded(cardId, category, msg.sender);
        emit InventoryUpdated(category, categoryInventory[category].count);
        
        return cardId;
    }
    
    /**
     * @dev Backend role can add gift cards through this function
     * @param valueInput The encrypted value of the gift card
     * @param description Public description of the gift card
     * @param imageUrl Public image URL for the gift card
     * @param expiryDate Expiry timestamp (0 for no expiry)
     * @param category The category of the gift card
     * @return cardId The ID of the newly created gift card
     */
    function backendAddGiftCard(
        bytes memory valueInput,
        string calldata description,
        string calldata imageUrl,
        uint256 expiryDate,
        string calldata category
    ) 
        external 
        whenNotPaused 
        nonReentrant 
        onlyRole(BACKEND_ROLE) 
        returns (uint256 cardId) 
    {
        if (!categoryInventory[category].active) revert InvalidCategory(category);
        
        // Create gift card in the gift card contract
        cardId = giftCardContract.createGiftCard(
            valueInput,
            description,
            imageUrl,
            expiryDate
        );
        
        // Update inventory count
        categoryInventory[category].count++;
        
        emit GiftCardAdded(cardId, category, msg.sender);
        emit InventoryUpdated(category, categoryInventory[category].count);
        
        return cardId;
    }
    
    /**
     * @dev Decrease inventory count when a gift card is sold
     * @param category The category of the sold gift card
     */
    function decreaseInventory(string calldata category) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (!categoryInventory[category].active) revert InvalidCategory(category);
        
        if (categoryInventory[category].count > 0) {
            categoryInventory[category].count--;
            emit InventoryUpdated(category, categoryInventory[category].count);
            
            // Check if we need to restock
            checkAndTriggerRestock(category);
        }
    }
    
    /**
     * @dev Check if inventory is below threshold and trigger restock if needed
     * @param category The category to check
     */
    function checkAndTriggerRestock(string memory category) public {
        CategoryInventory storage inventory = categoryInventory[category];
        
        if (inventory.active && inventory.count < inventory.threshold) {
            // Trigger Chainlink Function to restock
            requestRestockFromAPI(category);
        }
    }
    
    /**
     * @dev Request gift card restock from API using Chainlink Functions
     * @param category The category to restock
     */
    function requestRestockFromAPI(string memory category) 
        public 
        whenNotPaused 
        returns (bytes32 requestId) 
    {
        if (!categoryInventory[category].active) revert InvalidCategory(category);
        
        // Build Chainlink Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE_CODE);
        
        // Set arguments
        string[] memory args = new string[](1);
        args[0] = category;
        req.setArgs(args);
        
        // Send the request
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );
        
        // Track the request
        chainlinkRequests[requestId] = ChainlinkRequest({
            requestId: requestId,
            category: category,
            timestamp: block.timestamp,
            fulfilled: false
        });
        
        pendingRequests.push(requestId);
        
        emit RestockRequested(requestId, category);
        return requestId;
    }
    
    /**
     * @dev Callback function for Chainlink Functions
     * @param requestId The request ID
     * @param response The response from the API
     * @param err Any error that occurred
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        ChainlinkRequest storage request = chainlinkRequests[requestId];
        
        if (request.requestId != requestId) revert RequestNotFound(requestId);
        if (request.fulfilled) revert RequestAlreadyFulfilled(requestId);
        
        // Mark as fulfilled
        request.fulfilled = true;
        
        // Remove from pending requests
        for (uint i = 0; i < pendingRequests.length; i++) {
            if (pendingRequests[i] == requestId) {
                // Replace with the last element and pop
                pendingRequests[i] = pendingRequests[pendingRequests.length - 1];
                pendingRequests.pop();
                break;
            }
        }
        
        // Handle errors
        if (err.length > 0) {
            // Log error and potentially retry
            return;
        }
        
        if (response.length == 0) revert EmptyResponse();
        
        // Emit event with the response for backend monitoring
        emit RestockFulfilled(requestId, request.category, response);
        
        // The backend should monitor RestockFulfilled events and call backendAddGiftCard
        // with the gift card data from the response
    }
    
    /**
     * @dev Manual function to trigger restock for testing purposes
     * @param category The category to restock
     */
    function manualRestock(string calldata category) 
        external 
        onlyRole(ADMIN_ROLE) 
        returns (bytes32 requestId) 
    {
        return requestRestockFromAPI(category);
    }
    
    /**
     * @dev Update Chainlink Functions configuration
     * @param _donId New DON ID
     * @param _subscriptionId New subscription ID
     * @param _gasLimit New gas limit
     */
    function updateChainlinkConfig(
        bytes32 _donId,
        uint64 _subscriptionId,
        uint32 _gasLimit
    ) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        donId = _donId;
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        
        emit ChainlinkFunctionUpdated(donId, subscriptionId, gasLimit);
    }
    
    /**
     * @dev Grant backend role to an address
     * @param account The address to grant the role to
     */
    function grantBackendRole(address account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _grantRole(BACKEND_ROLE, account);
    }
    
    /**
     * @dev Revoke backend role from an address
     * @param account The address to revoke the role from
     */
    function revokeBackendRole(address account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _revokeRole(BACKEND_ROLE, account);
    }
    
    /**
     * @dev Get all categories
     * @return Array of category names
     */
    function getAllCategories() external view returns (string[] memory) {
        return categories;
    }
    
    /**
     * @dev Get category details
     * @param category The category name
     * @return inventory The category inventory struct
     */
    function getCategoryDetails(string calldata category) 
        external 
        view 
        returns (CategoryInventory memory) 
    {
        return categoryInventory[category];
    }
    
    /**
     * @dev Get inventory count for a category
     * @param category The category name
     * @return count The current inventory count
     */
    function getInventoryCount(string calldata category) external view returns (uint256) {
        return categoryInventory[category].count;
    }
    
    /**
     * @dev Get pending request count
     * @return count The number of pending requests
     */
    function getPendingRequestCount() external view returns (uint256) {
        return pendingRequests.length;
    }
    
    /**
     * @dev Get request details
     * @param requestId The request ID
     * @return request The request details
     */
    function getRequestDetails(bytes32 requestId) 
        external 
        view 
        returns (ChainlinkRequest memory) 
    {
        return chainlinkRequests[requestId];
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause function
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}