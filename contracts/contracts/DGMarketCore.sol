// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {euint256, ebool, e} from "@inco/lightning/src/Lib.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DGMarketCore - Enhanced with Dynamic Categories
 * @dev Simplified gift card marketplace with FHE encryption and dynamic category management
 */
contract DGMarketCore is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using e for *;

    // =============================================================================
    // ROLES AND CONSTANTS
    // =============================================================================
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AUTOMATION_ROLE = keccak256("AUTOMATION_ROLE");
    
    uint256 public constant MAX_FEE_PERCENT = 1000; // Maximum 10%
    address public constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC
    address public constant USDT_ADDRESS = 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2; // Base Sepolia USDT

    // =============================================================================
    // ENHANCED STRUCTS
    // =============================================================================

    // Gift Card Core Data (Simplified with PIN instead of value)
    struct GiftCard {
        uint256 cardId;             // Unique card ID
        euint256 encryptedCode;     // FHE encrypted voucher code
        euint256 encryptedPin;      // FHE encrypted PIN (instead of value)
        uint256 publicPrice;        // Public price (NOT encrypted) - already in USDC/USDT
        address owner;              // Current owner
        address creator;            // Original creator
        uint256 expiryDate;         // 0 = no expiry
        string category;
        string description;
        string imageUrl;
        bool isActive;
        bool isRevealed;            // Revelation tracking
        uint256 createdAt;          // Creation timestamp
    }

    // Enhanced Category Data with ID
    struct CategoryData {
        uint256 categoryId;         // Category ID (index in array)
        string name;                // Category name
        uint256 count;              // Current gift cards count
        uint256 threshold;          // Restocking threshold
        bool active;                // Whether category is active
        uint256 createdAt;          // When category was added
    }

    // Public gift card data for frontend (no encrypted fields)
    struct GiftCardPublicData {
        uint256 cardId;
        uint256 publicPrice;
        address owner;
        address creator;
        uint256 expiryDate;
        string category;
        string description;
        string imageUrl;
        bool isActive;
        bool isRevealed;
        uint256 createdAt;
    }

    // Category Management
    struct CategoryInventory {
        uint256 count;
        uint256 threshold;
        bool active;
        uint256 createdAt;
    }

    // Marketplace Listing Data
    struct Listing {
        uint256 listingId;
        uint256 cardId;
        address seller;
        address paymentToken;
        uint256 price;
        bool isActive;
        uint256 listedAt;
    }

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================

    mapping(uint256 => GiftCard) public giftCards;
    mapping(address => uint256[]) public userGiftCards; // User's owned card IDs
    mapping(string => uint256[]) public categoryCards;  // Cards by category
    mapping(string => CategoryInventory) public categoryInventory;
    
    // Marketplace mappings
    mapping(uint256 => Listing) public listings;
    mapping(address => bool) public supportedTokens;
    address[] public supportedTokensList;
    uint256[] public activeListingIds;
    
    // Counters
    uint256 private nextCardId = 1;
    uint256 private nextListingId = 1;
    
    // Fee configuration
    uint256 public marketplaceFeePercent = 250; // 2.5% default
    
    // Categories list - Enhanced for dynamic access
    string[] public categories;
    
    // Chainlink automation integration
    address public chainlinkManager;
    bool public autoRestockEnabled = true;

    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event GiftCardCreated(uint256 indexed cardId, address indexed creator, uint256 publicPrice, string category);
    event GiftCardRevealed(uint256 indexed cardId, address indexed owner);
    event GiftCardRedeemed(uint256 indexed cardId, address indexed redeemer, uint256 publicPrice);
    event OwnershipTransferred(uint256 indexed cardId, address indexed from, address indexed to);
    
    event ListingCreated(uint256 indexed listingId, uint256 indexed cardId, address indexed seller, uint256 price);
    event ListingPurchased(uint256 indexed listingId, uint256 indexed cardId, address indexed buyer, address seller);
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    
    event CategoryAdded(string category, uint256 threshold, uint256 categoryId);
    event InventoryUpdated(string category, uint256 newCount);
    event AutoRestockTriggered(string category, uint256 currentStock, uint256 threshold);
    
    event TokenAdded(address indexed token);

    // =============================================================================
    // CUSTOM ERRORS
    // =============================================================================
    
    error CardNotOwned(uint256 cardId);
    error CardAlreadyRevealed(uint256 cardId);
    error CardNotActive(uint256 cardId);
    error CardExpired(uint256 cardId);
    error CannotResellRevealedCard(uint256 cardId);
    error InvalidCategory(string category);
    error UnsupportedToken(address token);
    error ChainlinkManagerNotSet();

    // =============================================================================
    // MODIFIERS
    // =============================================================================
    
    modifier validCard(uint256 cardId) {
        require(cardId < nextCardId && cardId > 0, "Invalid card ID");
        require(giftCards[cardId].isActive, "Card not active");
        _;
    }
    
    modifier onlyCardOwner(uint256 cardId) {
        if (giftCards[cardId].owner != msg.sender) revert CardNotOwned(cardId);
        _;
    }
    
    modifier notExpired(uint256 cardId) {
        GiftCard storage card = giftCards[cardId];
        if (card.expiryDate != 0 && card.expiryDate <= block.timestamp) {
            revert CardExpired(cardId);
        }
        _;
    }
    
    modifier onlySupportedToken(address token) {
        if (!supportedTokens[token]) revert UnsupportedToken(token);
        _;
    }

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Add default supported tokens
        _addSupportedToken(USDC_ADDRESS);
        _addSupportedToken(USDT_ADDRESS);
        
        // Initialize default categories
        _initializeCategories();
    }

    /**
     * @dev Initialize default categories
     */
    function _initializeCategories() internal {
        string[5] memory defaultCategories = [
            "Food & Dining",
            "Shopping", 
            "Entertainment",
            "Travel",
            "Gaming"
        ];
        
        for (uint256 i = 0; i < defaultCategories.length; i++) {
            categories.push(defaultCategories[i]);
            categoryInventory[defaultCategories[i]] = CategoryInventory({
                count: 0,
                threshold: 5,
                active: true,
                createdAt: block.timestamp
            });
        }
    }

    // =============================================================================
    // ENHANCED CATEGORY MANAGEMENT
    // =============================================================================
    
    /**
     * @dev Get all categories (just names)
     * @return Array of category names
     */
    function getAllCategories() external view returns (string[] memory) {
        return categories;
    }
    
    /**
     * @dev Get all categories with their IDs and data
     * @return categoryIds Array of category IDs (indices)
     * @return categoryNames Array of category names
     * @return categoryCounts Array of current counts
     * @return categoryThresholds Array of thresholds
     * @return categoryActive Array of active status
     */
    function getAllCategoriesWithData() external view returns (
        uint256[] memory categoryIds,
        string[] memory categoryNames,
        uint256[] memory categoryCounts,
        uint256[] memory categoryThresholds,
        bool[] memory categoryActive
    ) {
        uint256 length = categories.length;
        
        categoryIds = new uint256[](length);
        categoryNames = new string[](length);
        categoryCounts = new uint256[](length);
        categoryThresholds = new uint256[](length);
        categoryActive = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            categoryIds[i] = i;
            categoryNames[i] = categories[i];
            
            CategoryInventory storage inventory = categoryInventory[categories[i]];
            categoryCounts[i] = inventory.count;
            categoryThresholds[i] = inventory.threshold;
            categoryActive[i] = inventory.active;
        }
        
        return (categoryIds, categoryNames, categoryCounts, categoryThresholds, categoryActive);
    }
    
    /**
     * @dev Get category data by index/ID
     * @param categoryId The category index
     * @return categoryData Complete category data
     */
    function getCategoryById(uint256 categoryId) external view returns (CategoryData memory categoryData) {
        require(categoryId < categories.length, "Invalid category ID");
        
        string memory categoryName = categories[categoryId];
        CategoryInventory storage inventory = categoryInventory[categoryName];
        
        return CategoryData({
            categoryId: categoryId,
            name: categoryName,
            count: inventory.count,
            threshold: inventory.threshold,
            active: inventory.active,
            createdAt: inventory.createdAt
        });
    }
    
    /**
     * @dev Get total number of categories
     * @return Total count of categories
     */
    function getCategoryCount() external view returns (uint256) {
        return categories.length;
    }

    /**
     * @dev Add a new category
     * @param category Category name
     * @param threshold Restocking threshold
     */
    function addCategory(string calldata category, uint256 threshold) external onlyRole(ADMIN_ROLE) {
        require(bytes(category).length > 0, "Empty category");
        require(!categoryInventory[category].active, "Category exists");
        
        uint256 categoryId = categories.length;
        categories.push(category);
        
        categoryInventory[category] = CategoryInventory({
            count: 0,
            threshold: threshold,
            active: true,
            createdAt: block.timestamp
        });
        
        emit CategoryAdded(category, threshold, categoryId);
    }

    // =============================================================================
    // GIFT CARD CREATION (ENHANCED)
    // =============================================================================
    
    /**
     * @dev Creates a new gift card (admin only) - Enhanced with better validation
     * @param encryptedCodeInput The encrypted voucher code as bytes
     * @param encryptedPinInput The encrypted PIN as bytes  
     * @param publicPrice The public price (NOT encrypted) - already in USDC/USDT
     * @param description Public description
     * @param category Gift card category
     * @param imageUrl Public image URL
     * @param expiryDate Expiry timestamp (0 for no expiry)
     * @return cardId The ID of the newly created gift card
     */
    function adminCreateGiftCard(
        bytes memory encryptedCodeInput,
        bytes memory encryptedPinInput,
        uint256 publicPrice,
        string calldata description,
        string calldata category,
        string calldata imageUrl,
        uint256 expiryDate
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256 cardId) {
        cardId = _createGiftCard(
            encryptedCodeInput,
            encryptedPinInput,
            publicPrice,
            description,
            category,
            imageUrl,
            expiryDate,
            msg.sender
        );
        
        // Update inventory for admin-created cards
        categoryInventory[category].count++;
        emit InventoryUpdated(category, categoryInventory[category].count);
        
        return cardId;
    }
    
    /**
     * @dev Creates gift cards via automation (Chainlink Functions)
     */
    function automationCreateGiftCard(
        bytes memory encryptedCodeInput,
        bytes memory encryptedPinInput,
        uint256 publicPrice,
        string calldata description,
        string calldata category,
        string calldata imageUrl,
        uint256 expiryDate
    ) external onlyRole(AUTOMATION_ROLE) whenNotPaused returns (uint256 cardId) {
        cardId = _createGiftCard(
            encryptedCodeInput,
            encryptedPinInput,
            publicPrice,
            description,
            category,
            imageUrl,
            expiryDate,
            address(this) // Automation creates cards owned by contract initially
        );
        
        // Update inventory
        categoryInventory[category].count++;
        emit InventoryUpdated(category, categoryInventory[category].count);
        
        return cardId;
    }
    
    /**
     * @dev Internal function to create gift cards with enhanced validation
     */
    function _createGiftCard(
        bytes memory encryptedCodeInput,
        bytes memory encryptedPinInput,
        uint256 publicPrice,
        string calldata description,
        string calldata category,
        string calldata imageUrl,
        uint256 expiryDate,
        address initialOwner
    ) internal returns (uint256 cardId) {
        require(publicPrice > 0, "Price must be positive");
        require(bytes(description).length > 0, "Description required");
        require(categoryInventory[category].active, "Category not active");
        require(bytes(imageUrl).length > 0, "Image URL required");
        
        cardId = nextCardId++;
        
        // Create FHE encrypted data (code + pin)
        euint256 encryptedCode = encryptedCodeInput.newEuint256(msg.sender); 
        euint256 encryptedPin = encryptedPinInput.newEuint256(msg.sender); 
        
        // Set permissions for contract and owner
        e.allow(encryptedCode, address(this));
        e.allow(encryptedPin, address(this));
        e.allow(encryptedCode, initialOwner);
        e.allow(encryptedPin, initialOwner);
        
        // Store gift card data
        giftCards[cardId] = GiftCard({
            cardId: cardId,
            encryptedCode: encryptedCode,
            encryptedPin: encryptedPin,
            publicPrice: publicPrice,
            owner: initialOwner,
            creator: initialOwner,
            expiryDate: expiryDate,
            category: category,
            description: description,
            imageUrl: imageUrl,
            isActive: true,
            isRevealed: false,
            createdAt: block.timestamp
        });
        
        // Add to user's cards and category
        userGiftCards[initialOwner].push(cardId);
        categoryCards[category].push(cardId);
        
        emit GiftCardCreated(cardId, initialOwner, publicPrice, category);
        return cardId;
    }

    // =============================================================================
    // ENHANCED VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Get all created gift cards (public data only) - Enhanced
     * @return Array of gift card public data
     */
    function getAllGiftCards() external view returns (GiftCardPublicData[] memory) {
        GiftCardPublicData[] memory result = new GiftCardPublicData[](nextCardId - 1);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextCardId; i++) {
            if (giftCards[i].isActive) {
                result[count] = _getPublicData(i);
                count++;
            }
        }
        
        // Resize array to actual count
        GiftCardPublicData[] memory finalResult = new GiftCardPublicData[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }
        
        return finalResult;
    }
    
    /**
     * @dev Get gift card by ID (public data only)
     * @param cardId The gift card ID
     * @return Gift card public data
     */
    function getGiftCard(uint256 cardId) external view returns (GiftCardPublicData memory) {
        require(cardId < nextCardId && cardId > 0, "Invalid card ID");
        return _getPublicData(cardId);
    }
    
    /**
     * @dev Get gift cards by category with enhanced data
     * @param category The category name
     * @return Array of gift card public data
     */
    function getGiftCardsByCategory(string calldata category) external view returns (GiftCardPublicData[] memory) {
        uint256[] memory cardIds = categoryCards[category];
        GiftCardPublicData[] memory result = new GiftCardPublicData[](cardIds.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < cardIds.length; i++) {
            if (giftCards[cardIds[i]].isActive) {
                result[count] = _getPublicData(cardIds[i]);
                count++;
            }
        }
        
        // Resize array to actual count
        GiftCardPublicData[] memory finalResult = new GiftCardPublicData[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }
        
        return finalResult;
    }

    /**
     * @dev Get category inventory with enhanced data
     * @param category The category name
     * @return count Current count
     * @return threshold Restocking threshold
     * @return active Whether category is active
     */
    function getCategoryInventory(string calldata category) external view returns (
        uint256 count,
        uint256 threshold,
        bool active
    ) {
        CategoryInventory storage inventory = categoryInventory[category];
        return (inventory.count, inventory.threshold, inventory.active);
    }
    
    /**
     * @dev Internal function to get public data
     */
    function _getPublicData(uint256 cardId) internal view returns (GiftCardPublicData memory) {
        GiftCard storage card = giftCards[cardId];
        return GiftCardPublicData({
            cardId: card.cardId,
            publicPrice: card.publicPrice,
            owner: card.owner,
            creator: card.creator,
            expiryDate: card.expiryDate,
            category: card.category,
            description: card.description,
            imageUrl: card.imageUrl,
            isActive: card.isActive,
            isRevealed: card.isRevealed,
            createdAt: card.createdAt
        });
    }

    // =============================================================================
    // MARKETPLACE OPERATIONS (Enhanced)
    // =============================================================================
    
    /**
     * @dev Reveal gift card code and pin (marks as non-resellable)
     * @param cardId The gift card ID to reveal
     * @return encryptedCode The encrypted code for client-side decryption
     * @return encryptedPin The encrypted pin for client-side decryption
     */
    function revealGiftCard(
        uint256 cardId
    ) external validCard(cardId) onlyCardOwner(cardId) notExpired(cardId) returns (euint256 encryptedCode, euint256 encryptedPin) {
        if (giftCards[cardId].isRevealed) revert CardAlreadyRevealed(cardId);
        
        // Mark as revealed (prevents resale)
        giftCards[cardId].isRevealed = true;
        
        // Allow access to encrypted code and pin for the owner
        euint256 code = giftCards[cardId].encryptedCode;
        euint256 pin = giftCards[cardId].encryptedPin;
        e.allow(code, msg.sender);
        e.allow(pin, msg.sender);
        
        emit GiftCardRevealed(cardId, msg.sender);
        return (code, pin);
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Check inventory and trigger automatic restocking if needed
     * @param category The category to check
     */
    function _checkAndTriggerAutoRestock(string memory category) internal {
        if (!autoRestockEnabled || chainlinkManager == address(0)) {
            return;
        }
        
        CategoryInventory storage inventory = categoryInventory[category];
        if (inventory.active && inventory.count <= inventory.threshold) {
            // Call Chainlink Manager to trigger restocking
            try IChainlinkManager(chainlinkManager).triggerRestock(category) {
                emit AutoRestockTriggered(category, inventory.count, inventory.threshold);
            } catch {
                // Silently fail to avoid reverting the main transaction
            }
        }
    }

    // =============================================================================
    // ADMIN FUNCTIONS (Enhanced)
    // =============================================================================
    
    /**
     * @dev Update marketplace fee
     * @param newFeePercent New fee percentage (basis points)
     */
    function updateMarketplaceFee(uint256 newFeePercent) external onlyRole(ADMIN_ROLE) {
        require(newFeePercent <= MAX_FEE_PERCENT, "Fee too high");
        marketplaceFeePercent = newFeePercent;
    }
    
    /**
     * @dev Add supported token
     * @param token Token address to add
     */
    function addSupportedToken(address token) external onlyRole(ADMIN_ROLE) {
        _addSupportedToken(token);
    }
    
    /**
     * @dev Internal function to add supported token
     */
    function _addSupportedToken(address token) internal {
        require(token != address(0), "Invalid token");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        supportedTokensList.push(token);
        emit TokenAdded(token);
    }
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}

// Interface for ChainlinkGiftCardManager
interface IChainlinkManager {
    function triggerRestock(string calldata category) external returns (bytes32 requestId);
}