// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./DGMarketCore.sol";

/**
 * @title ChainlinkGiftCardManager
 * @dev Automation-only contract for DGMarket restocking via Chainlink Functions
 * @notice Handles automated gift card creation when inventory is low in DGMarketCore
 * @notice NO inventory storage - all inventory management happens in DGMarketCore
 */
contract ChainlinkGiftCardManager is AccessControl, Pausable, FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;
    
    // =============================================================================
    // ROLES AND CONSTANTS
    // =============================================================================
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    
    // =============================================================================
    // STRUCTS (Added to fix stack too deep)
    // =============================================================================
    
    // Gift card creation parameters struct (Fixes stack too deep)
    struct CreateGiftCardParams {
        bytes encryptedCode;
        bytes encryptedValue;
        uint256 price;
        string description;
        string category;
        string imageUrl;
        uint256 expiry;
    }
    
    // Request tracking
    struct RestockRequest {
        bytes32 requestId;
        string category;
        uint256 timestamp;
        bool fulfilled;
    }
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    // Core contract reference
    DGMarketCore public immutable coreContract;
    
    // Chainlink Functions configuration
    bytes32 private donId;
    uint64 private subscriptionId;
    uint32 private gasLimit;
    
    mapping(bytes32 => RestockRequest) public restockRequests;
    bytes32[] public pendingRequests;
    
    // OKX API configuration
    string private okxApiBaseUrl;
    
    // =============================================================================
    // JAVASCRIPT SOURCE CODE FOR CHAINLINK FUNCTIONS
    // =============================================================================
    
    string private constant RESTOCK_SOURCE_CODE = 
        "const category = args[0];"
        "const apiUrl = args[1];"
        "const fullUrl = `${apiUrl}/api/restock?category=${category}`;"
        ""
        "const restockRequest = Functions.makeHttpRequest({"
        "  url: fullUrl,"
        "  method: 'GET',"
        "  headers: {"
        "    'Content-Type': 'application/json'"
        "  }"
        "});"
        ""
        "const restockResponse = await restockRequest;"
        "if (restockResponse.error) {"
        "  throw Error('Restock API request failed');"
        "}"
        ""
        "// Parse response and return gift card data"
        "const giftCardData = restockResponse.data;"
        "if (!giftCardData || !giftCardData.vouchers || giftCardData.vouchers.length === 0) {"
        "  throw Error('No gift cards available for restocking');"
        "}"
        ""
        "// Return the gift card data as JSON string"
        "return Functions.encodeString(JSON.stringify(giftCardData));";

    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event RestockRequested(bytes32 indexed requestId, string category);
    event RestockFulfilled(bytes32 indexed requestId, string category, uint256 cardsAdded);
    event RestockFailed(bytes32 indexed requestId, string category, string reason);
    event ChainlinkConfigUpdated(bytes32 donId, uint64 subscriptionId, uint32 gasLimit);
    event APIConfigUpdated(string newApiUrl);
    event RestockTriggered(string category, address triggeredBy);
    event BatchRestockCompleted(uint256 categoriesProcessed, uint256 requestsSent);

    // =============================================================================
    // CUSTOM ERRORS
    // =============================================================================
    
    error RequestNotFound(bytes32 requestId);
    error RequestAlreadyFulfilled(bytes32 requestId);
    error EmptyResponse();
    error InvalidGiftCardData(string reason);
    error CoreContractCallFailed(string reason);

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor(
        address _coreContract,
        address _router,
        bytes32 _donId,
        uint64 _subscriptionId,
        string memory _okxApiBaseUrl
    ) FunctionsClient(_router) {
        require(_coreContract != address(0), "Invalid core contract");
        
        coreContract = DGMarketCore(_coreContract);
        donId = _donId;
        subscriptionId = _subscriptionId;
        gasLimit = 300000; // Default gas limit
        okxApiBaseUrl = _okxApiBaseUrl;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(BACKEND_ROLE, address(this));
    }

    // =============================================================================
    // RESTOCKING AUTOMATION
    // =============================================================================
    
    /**
     * @dev Trigger restocking for a category (called by DGMarketCore or admin)
     * @param category The category to restock
     * @return requestId The Chainlink Functions request ID
     */
    function triggerRestock(string calldata category) external returns (bytes32 requestId) {
        // Only allow DGMarketCore or admin to trigger restocking
        require(
            msg.sender == address(coreContract) || hasRole(ADMIN_ROLE, msg.sender),
            "Unauthorized: Only DGMarketCore or admin can trigger restock"
        );
        
        requestId = requestRestock(category);
        emit RestockTriggered(category, msg.sender);
        return requestId;
    }
    
    /**
     * @dev Request gift card restocking for a category
     * @param category The category to restock
     * @return requestId The Chainlink Functions request ID
     */
    function requestRestock(string calldata category) public whenNotPaused returns (bytes32 requestId) {
        // Build Chainlink Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(RESTOCK_SOURCE_CODE);
        
        // Set arguments: [category, apiUrl]
        string[] memory args = new string[](2);
        args[0] = category;
        args[1] = okxApiBaseUrl;
        req.setArgs(args);
        
        // Send the request
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );
        
        // Track the request
        restockRequests[requestId] = RestockRequest({
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
     * @dev Fulfillment callback for Chainlink Functions
     * @param requestId The request ID
     * @param response The response from the API
     * @param err Any error that occurred
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        RestockRequest storage request = restockRequests[requestId];
        
        if (request.requestId != requestId) revert RequestNotFound(requestId);
        if (request.fulfilled) revert RequestAlreadyFulfilled(requestId);
        
        // Mark as fulfilled
        request.fulfilled = true;
        
        // Remove from pending requests
        _removePendingRequest(requestId);
        
        // Handle errors
        if (err.length > 0) {
            emit RestockFailed(requestId, request.category, string(err));
            return;
        }
        
        if (response.length == 0) {
            emit RestockFailed(requestId, request.category, "Empty response");
            return;
        }
        
        // Process successful response
        _processRestockResponse(requestId, request.category, response);
    }
    
    /**
     * @dev Process successful restock response and create gift cards
     * @param requestId The request ID
     * @param category The category being restocked
     * @param response The API response containing gift card data
     */
    function _processRestockResponse(
        bytes32 requestId,
        string memory category,
        bytes memory response
    ) internal {
        try this.parseAndCreateGiftCards(category, response) returns (uint256 cardsCreated) {
            emit RestockFulfilled(requestId, category, cardsCreated);
        } catch Error(string memory reason) {
            emit RestockFailed(requestId, category, reason);
        } catch {
            emit RestockFailed(requestId, category, "Unknown error in gift card creation");
        }
    }
    
    /**
     * @dev Parse API response and create gift cards in core contract (FIXED: Using struct parameters)
     * @param category The category being restocked
     * @return cardsCreated Number of gift cards created
     */
    function parseAndCreateGiftCards(
        string calldata category,
        bytes calldata /* response */
    ) external returns (uint256 cardsCreated) {
        require(msg.sender == address(this), "Internal function only");
        
        // Decode the response string for future JSON parsing
        // Note: Currently unused but will be needed for production JSON parsing
        // string memory responseString = abi.decode(response, (string));
        
        // TODO: Implement JSON parsing logic using responseString
        // For now, create a single test gift card
        // In production, parse the JSON response and create multiple cards
        
        // Create gift card parameters struct (Fixes stack too deep)
        CreateGiftCardParams memory params = CreateGiftCardParams({
            encryptedCode: abi.encode("MOCK_ENCRYPTED_CODE_123"),
            encryptedValue: abi.encode("MOCK_ENCRYPTED_VALUE_456"),
            price: 100, // $100
            description: string(abi.encodePacked("Auto-generated ", category, " gift card")),
            category: category,
            imageUrl: "https://example.com/default-gift-card.png",
            expiry: 0 // No expiry
        });
        
        // Call core contract with struct parameters
        try coreContract.automationCreateGiftCard(
            params.encryptedCode,
            params.encryptedValue,
            params.price,
            params.description,
            params.category,
            params.imageUrl,
            params.expiry
        ) returns (uint256 /* cardId */) {
            cardsCreated = 1;
            // In production, parse response and create multiple cards
        } catch Error(string memory reason) {
            revert CoreContractCallFailed(reason);
        } catch {
            revert CoreContractCallFailed("Unknown error calling core contract");
        }
        
        return cardsCreated;
    }

    // =============================================================================
    // CATEGORY MONITORING & BATCH OPERATIONS
    // =============================================================================
    
    /**
     * @dev Check if a category needs restocking and trigger if necessary
     * @param category The category to check
     * @return wasTriggered Whether restocking was triggered
     */
    function checkAndTriggerRestock(string calldata category) public returns (bool wasTriggered) {
        (uint256 currentCount, uint256 threshold, bool active) = coreContract.getCategoryInventory(category);
        
        if (active && currentCount <= threshold) {
            requestRestock(category);
            return true;
        }
        
        return false;
    }
    
    /**
     * @dev Batch check multiple categories for restocking
     * @param categories Array of category names to check
     * @return triggeredCategories Array of categories that were triggered for restocking
     */
    function batchCheckRestock(string[] calldata categories) external returns (string[] memory triggeredCategories) {
        uint256 triggeredCount = 0;
        string[] memory tempTriggered = new string[](categories.length);
        
        for (uint256 i = 0; i < categories.length; i++) {
            if (checkAndTriggerRestock(categories[i])) {
                tempTriggered[triggeredCount] = categories[i];
                triggeredCount++;
            }
        }
        
        // Create properly sized return array
        triggeredCategories = new string[](triggeredCount);
        for (uint256 i = 0; i < triggeredCount; i++) {
            triggeredCategories[i] = tempTriggered[i];
        }
        
        emit BatchRestockCompleted(categories.length, triggeredCount);
        return triggeredCategories;
    }
    
    /**
     * @dev Admin function to refill inventory from pending Chainlink responses
     * @dev This simulates processing multiple API responses and creating gift cards
     * @param categories Array of categories to refill
     * @param quantitiesPerCategory Array of quantities to add per category
     * @return totalCardsCreated Total number of gift cards created
     */
    function adminBatchRefill(
        string[] calldata categories,
        uint256[] calldata quantitiesPerCategory
    ) external onlyRole(ADMIN_ROLE) returns (uint256 totalCardsCreated) {
        require(categories.length == quantitiesPerCategory.length, "Arrays length mismatch");
        require(categories.length > 0, "Empty arrays");
        
        uint256 totalCreated = 0;
        
        for (uint256 i = 0; i < categories.length; i++) {
            string memory category = categories[i];
            uint256 quantity = quantitiesPerCategory[i];
            
            // Create multiple gift cards for this category
            for (uint256 j = 0; j < quantity; j++) {
                // Create gift card parameters struct
                CreateGiftCardParams memory params = CreateGiftCardParams({
                    encryptedCode: abi.encode(string(abi.encodePacked("BATCH_CODE_", category, "_", totalCreated + j))),
                    encryptedValue: abi.encode(string(abi.encodePacked("BATCH_VALUE_", category, "_", totalCreated + j))),
                    price: 100 + (j * 10), // Varying prices
                    description: string(abi.encodePacked("Batch refill ", category, " gift card #", totalCreated + j + 1)),
                    category: category,
                    imageUrl: string(abi.encodePacked("https://example.com/", category, "-gift-card.png")),
                    expiry: 0 // No expiry
                });
                
                // Create gift card in core contract
                try coreContract.automationCreateGiftCard(
                    params.encryptedCode,
                    params.encryptedValue,
                    params.price,
                    params.description,
                    params.category,
                    params.imageUrl,
                    params.expiry
                ) returns (uint256 /* cardId */) {
                    totalCreated++;
                } catch {
                    // Continue with next card if one fails
                    continue;
                }
            }
        }
        
        emit BatchRestockCompleted(categories.length, totalCreated);
        return totalCreated;
    }

    // =============================================================================
    // CONFIGURATION MANAGEMENT
    // =============================================================================
    
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
    ) external onlyRole(ADMIN_ROLE) {
        donId = _donId;
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        
        emit ChainlinkConfigUpdated(donId, subscriptionId, gasLimit);
    }
    
    /**
     * @dev Update OKX API base URL
     * @param _newApiUrl New API base URL
     */
    function updateAPIConfig(string calldata _newApiUrl) external onlyRole(ADMIN_ROLE) {
        okxApiBaseUrl = _newApiUrl;
        emit APIConfigUpdated(_newApiUrl);
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Get pending request count
     * @return count Number of pending requests
     */
    function getPendingRequestCount() external view returns (uint256) {
        return pendingRequests.length;
    }
    
    /**
     * @dev Get all pending request IDs
     * @return Array of pending request IDs
     */
    function getPendingRequests() external view returns (bytes32[] memory) {
        return pendingRequests;
    }
    
    /**
     * @dev Get request details
     * @param requestId The request ID
     * @return request The request details
     */
    function getRequest(bytes32 requestId) external view returns (RestockRequest memory) {
        return restockRequests[requestId];
    }
    
    /**
     * @dev Get current Chainlink configuration
     * @return donId_ Current DON ID
     * @return subscriptionId_ Current subscription ID
     * @return gasLimit_ Current gas limit
     */
    function getChainlinkConfig() external view returns (
        bytes32 donId_,
        uint64 subscriptionId_,
        uint32 gasLimit_
    ) {
        return (donId, subscriptionId, gasLimit);
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Remove a request from pending requests array
     * @param requestId The request ID to remove
     */
    function _removePendingRequest(bytes32 requestId) internal {
        for (uint256 i = 0; i < pendingRequests.length; i++) {
            if (pendingRequests[i] == requestId) {
                pendingRequests[i] = pendingRequests[pendingRequests.length - 1];
                pendingRequests.pop();
                break;
            }
        }
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Manual restock trigger for testing
     * @param category The category to restock
     * @return requestId The request ID
     */
    function manualRestock(string calldata category) external onlyRole(ADMIN_ROLE) returns (bytes32 requestId) {
        return requestRestock(category);
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Grant backend role
     * @param account Address to grant role to
     */
    function grantBackendRole(address account) external onlyRole(ADMIN_ROLE) {
        _grantRole(BACKEND_ROLE, account);
    }
}