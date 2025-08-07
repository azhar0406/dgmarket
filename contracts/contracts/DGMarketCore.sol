// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {euint256, ebool, e} from "@inco/lightning/src/Lib.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DGMarketCore - Frontend Compatible + Stack Optimized
 * @dev Maintains frontend compatibility while avoiding stack too deep errors
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
    address public constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC (6 decimals)
    
    // USDC has 6 decimals (not 18 like ETH)
    uint256 public constant USDC_DECIMALS = 6;
    uint256 public constant USDC_UNIT = 10**USDC_DECIMALS; // 1,000,000 = 1 USDC

    // =============================================================================
    // OPTIMIZED STRUCTS (FRONTEND COMPATIBLE)
    // =============================================================================

    // Core data struct (6 fields - within limits)
    struct GiftCardCore {
        uint256 cardId;
        uint256 publicPrice;
        address owner;
        address creator;
        bool isActive;
        bool isPurchased;
    }

    // Metadata struct (4 fields)
    struct GiftCardMeta {
        string category;
        string description;
        string imageUrl;
        uint256 expiryDate;
    }

    // Status struct (4 fields)
    struct GiftCardStatus {
        bool isRevealed;
        uint256 createdAt;
        uint256 purchasedAt;
        uint256 reserved; // For future use
    }

    // FRONTEND COMPATIBLE: Reduced public struct (8 fields - safe limit)
    struct GiftCardPublic {
        uint256 cardId;
        uint256 publicPrice;
        address owner;
        string category;
        string description;
        string imageUrl;
        bool isActive;
        bool isPurchased;
    }

    // Category Management
    struct CategoryInventory {
        uint256 count;
        uint256 threshold;
        bool active;
        uint256 createdAt;
    }

    /**
 * @dev Enhanced struct for gift cards with encrypted data
 */
struct GiftCardWithEncryption {
    uint256 cardId;
    uint256 publicPrice;
    address owner;
    string category;
    string description; 
    string imageUrl;
    bool isActive;
    bool isPurchased;
    bool isRevealed;
    euint256 encryptedCode;  // 0x0 if not revealed
    euint256 encryptedPin;   // 0x0 if not revealed
}

    // =============================================================================
    // STATE VARIABLES (OPTIMIZED STORAGE)
    // =============================================================================

    // Separate mappings to avoid large struct issues
    mapping(uint256 => euint256) private cardEncryptedCodes;
    mapping(uint256 => euint256) private cardEncryptedPins;
    mapping(uint256 => GiftCardCore) private cardCores;
    mapping(uint256 => GiftCardMeta) private cardMetas;
    mapping(uint256 => GiftCardStatus) private cardStatuses;
    
    mapping(address => uint256[]) public userGiftCards; 
    mapping(string => uint256[]) public categoryCards;  
    mapping(string => CategoryInventory) public categoryInventory;
    
    // Counters
    uint256 private nextCardId = 1;
    
    // Fee configuration
    uint256 public marketplaceFeePercent = 250; // 2.5% default
    
    // Categories list
    string[] public categories;
    
    // Chainlink automation integration
    address public chainlinkManager;
    bool public autoRestockEnabled = true;

    // Revenue tracking
    uint256 public totalRevenue;
    uint256 public totalFees;

    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event GiftCardCreated(uint256 indexed cardId, address indexed creator, uint256 publicPrice, string category);
    event GiftCardPurchased(uint256 indexed cardId, address indexed buyer, address indexed seller, uint256 price);
    event GiftCardRevealed(uint256 indexed cardId, address indexed owner);
    event OwnershipTransferred(uint256 indexed cardId, address indexed from, address indexed to);
    
    event CategoryAdded(string category, uint256 threshold, uint256 categoryId);
    event InventoryUpdated(string category, uint256 newCount);
    event AutoRestockTriggered(string category, uint256 currentStock, uint256 threshold);
    
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event RevenueCollected(uint256 amount, uint256 fees);

    // =============================================================================
    // CUSTOM ERRORS
    // =============================================================================
    
    error CardNotOwned(uint256 cardId);
    error CardAlreadyRevealed(uint256 cardId);
    error CardAlreadyPurchased(uint256 cardId);
    error CardNotPurchased(uint256 cardId);
    error CardNotActive(uint256 cardId);
    error CardExpired(uint256 cardId);
    error CannotPurchaseOwnCard(uint256 cardId);
    error InvalidCategory(string category);
    error InsufficientBalance(uint256 required, uint256 available);

    // =============================================================================
    // MODIFIERS
    // =============================================================================
    
    modifier validCard(uint256 cardId) {
        require(cardId < nextCardId && cardId > 0, "Invalid card ID");
        require(cardCores[cardId].isActive, "Card not active");
        _;
    }
    
    modifier onlyCardOwner(uint256 cardId) {
        if (cardCores[cardId].owner != msg.sender) revert CardNotOwned(cardId);
        _;
    }
    
    modifier notExpired(uint256 cardId) {
        uint256 expiryDate = cardMetas[cardId].expiryDate;
        if (expiryDate != 0 && expiryDate <= block.timestamp) {
            revert CardExpired(cardId);
        }
        _;
    }

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
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
                threshold: 2,
                active: true,
                createdAt: block.timestamp
            });
        }
    }

    // Add these functions to your DGMarketCore.sol contract

// =============================================================================
// NEW VIEW FUNCTIONS FOR REVEALED CARDS
// =============================================================================

/**
 * @dev Get revealed gift card data - FIXED VERSION using struct return
 * Same function name, but now returns the working struct format
 */
function getRevealedGiftCard(uint256 cardId) 
    external 
    view 
    validCard(cardId) 
    onlyCardOwner(cardId) 
    returns (GiftCardWithEncryption memory) 
{
    GiftCardCore storage core = cardCores[cardId];
    GiftCardMeta storage meta = cardMetas[cardId];
    GiftCardStatus storage status = cardStatuses[cardId];
    
    // Optional: Keep the validation if you want
    require(core.isPurchased, "Card not purchased");
    require(status.isRevealed, "Card not revealed yet");
    
    // Use the SAME pattern as getMyGiftCardsWithEncryption (which works!)
    euint256 code = cardEncryptedCodes[cardId];
    euint256 pin =  cardEncryptedPins[cardId];
    
    return GiftCardWithEncryption({
        cardId: cardId,
        publicPrice: core.publicPrice,
        owner: core.owner,
        category: meta.category,
        description: meta.description,
        imageUrl: meta.imageUrl,
        isActive: core.isActive,
        isPurchased: core.isPurchased,
        isRevealed: status.isRevealed,
        encryptedCode: code,
        encryptedPin: pin
    });
}

// FIXED: purchaseGiftCardOnBehalf function with auto-restock trigger
function purchaseGiftCardOnBehalf(address user, uint256 cardId) 
    external 
    onlyRole(ADMIN_ROLE)  // ✅ Use your existing role system!
    validCard(cardId) 
    notExpired(cardId) 
    nonReentrant 
    whenNotPaused 
{
    require(user != address(0), "Invalid user");
    
    GiftCardCore storage core = cardCores[cardId];
    GiftCardStatus storage status = cardStatuses[cardId];
    GiftCardMeta storage meta = cardMetas[cardId];
    
    // Validation
    require(!core.isPurchased, "Card already purchased");
    require(core.owner != user, "User already owns card");
    
    address previousOwner = core.owner;
    
    // Remove from previous owner's list
    if (previousOwner != address(this)) {
        _removeFromUserCards(previousOwner, cardId);
    }
    
    // Add to user's list
    userGiftCards[user].push(cardId);
    
    // Update state
    core.owner = user;
    core.isPurchased = true;
    status.purchasedAt = block.timestamp;
    
    // Set FHE permissions for user
    e.allow(cardEncryptedCodes[cardId], user);
    e.allow(cardEncryptedPins[cardId], user);
    
    // Update inventory
    categoryInventory[meta.category].count--;
    emit InventoryUpdated(meta.category, categoryInventory[meta.category].count);
    
    // ✅ FIXED: Add the missing auto-restock trigger
    _checkAndTriggerAutoRestock(meta.category);
    
    // Events
    emit GiftCardPurchased(cardId, user, previousOwner, core.publicPrice);
    emit OwnershipTransferred(cardId, previousOwner, user);
}

/**
 * @dev Get user's gift cards with encryption status and handles
 */
function getMyGiftCardsWithEncryption() external view returns (GiftCardWithEncryption[] memory) {
    uint256[] memory cardIds = userGiftCards[msg.sender];
    GiftCardWithEncryption[] memory result = new GiftCardWithEncryption[](cardIds.length);
    
    for (uint256 i = 0; i < cardIds.length; i++) {
        uint256 cardId = cardIds[i];
        GiftCardCore storage core = cardCores[cardId];
        GiftCardMeta storage meta = cardMetas[cardId];
        GiftCardStatus storage status = cardStatuses[cardId];
        
        // Only include encrypted handles if revealed
        euint256 code = status.isRevealed ? cardEncryptedCodes[cardId] : euint256.wrap(0);
        euint256 pin = status.isRevealed ? cardEncryptedPins[cardId] : euint256.wrap(0);
        
        result[i] = GiftCardWithEncryption({
            cardId: cardId,
            publicPrice: core.publicPrice,
            owner: core.owner,
            category: meta.category,
            description: meta.description,
            imageUrl: meta.imageUrl,
            isActive: core.isActive,
            isPurchased: core.isPurchased,
            isRevealed: status.isRevealed,
            encryptedCode: code,
            encryptedPin: pin
        });
    }
    
    return result;
}

/**
 * @dev Check if a gift card is revealed (helper function)
 */
function isGiftCardRevealed(uint256 cardId) external view validCard(cardId) returns (bool) {
    return cardStatuses[cardId].isRevealed;
}

    // =============================================================================
    // CATEGORY MANAGEMENT
    // =============================================================================
    
    /**
     * @dev Get all categories (just names)
     */
    function getAllCategories() external view returns (string[] memory) {
        return categories;
    }
    
    /**
     * @dev Get category inventory - CHAINLINK COMPATIBLE
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
     * @dev Add a new category
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
    // GIFT CARD CREATION (OPTIMIZED)
    // =============================================================================
    
    /**
     * @dev Creates a new gift card (admin only)
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
            address(this)
        );
        
        // Update inventory
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
            address(this)
        );
        
        // Update inventory
        categoryInventory[category].count++;
        emit InventoryUpdated(category, categoryInventory[category].count);
        
        return cardId;
    }
    
    /**
     * @dev Internal gift card creation - STACK OPTIMIZED
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
        require(publicPrice <= 2 * USDC_UNIT, "Price too high (max 2 USDC)");
        require(bytes(description).length > 0, "Description required");
        require(categoryInventory[category].active, "Category not active");
        require(bytes(imageUrl).length > 0, "Image URL required");
        
        cardId = nextCardId++;
        
        // Create and store encrypted data
        _storeEncryptedData(cardId, encryptedCodeInput, encryptedPinInput, initialOwner);
        
        // Store core data
        cardCores[cardId] = GiftCardCore({
            cardId: cardId,
            publicPrice: publicPrice,
            owner: initialOwner,
            creator: msg.sender,
            isActive: true,
            isPurchased: false
        });
        
        // Store metadata
        cardMetas[cardId] = GiftCardMeta({
            category: category,
            description: description,
            imageUrl: imageUrl,
            expiryDate: expiryDate
        });
        
        // Store status
        cardStatuses[cardId] = GiftCardStatus({
            isRevealed: false,
            createdAt: block.timestamp,
            purchasedAt: 0,
            reserved: 0
        });
        
        // Add to mappings
        userGiftCards[initialOwner].push(cardId);
        categoryCards[category].push(cardId);
        
        emit GiftCardCreated(cardId, msg.sender, publicPrice, category);
        return cardId;
    }
    
    /**
     * @dev Store encrypted data separately to manage stack depth
     */
    function _storeEncryptedData(
        uint256 cardId,
        bytes memory encryptedCodeInput,
        bytes memory encryptedPinInput,
        address initialOwner
    ) internal {
        // Create FHE encrypted data
        euint256 encryptedCode = encryptedCodeInput.newEuint256(msg.sender); 
        euint256 encryptedPin = encryptedPinInput.newEuint256(msg.sender); 
        
        // Set permissions
        e.allow(encryptedCode, address(this));
        e.allow(encryptedPin, address(this));
        e.allow(encryptedCode, initialOwner);
        e.allow(encryptedPin, initialOwner);
        
        // Store in separate mappings
        cardEncryptedCodes[cardId] = encryptedCode;
        cardEncryptedPins[cardId] = encryptedPin;
    }

    // =============================================================================
    // PURCHASE FUNCTIONALITY
    // =============================================================================
    
    /**
     * @dev Purchase a gift card with USDC
     */
    function purchaseGiftCard(uint256 cardId) 
        external 
        validCard(cardId) 
        notExpired(cardId) 
        nonReentrant 
        whenNotPaused 
    {
        GiftCardCore storage core = cardCores[cardId];
        
        // Validation checks
        if (core.isPurchased) revert CardAlreadyPurchased(cardId);
        if (core.owner == msg.sender) revert CannotPurchaseOwnCard(cardId);
        
        // Execute purchase through internal function
        _executePurchase(cardId, core);
    }
    
    /**
     * @dev Internal purchase execution to manage stack depth
     */
    function _executePurchase(uint256 cardId, GiftCardCore storage core) internal {
        uint256 price = core.publicPrice;
        address previousOwner = core.owner;
        
        // Process payment
        IERC20 usdc = IERC20(USDC_ADDRESS);
        uint256 buyerBalance = usdc.balanceOf(msg.sender);
        if (buyerBalance < price) {
            revert InsufficientBalance(price, buyerBalance);
        }
        
        // Calculate and transfer fees
        uint256 fee = (price * marketplaceFeePercent) / 10000;
        uint256 sellerAmount = price - fee;
        
        usdc.safeTransferFrom(msg.sender, address(this), fee);
        
        if (previousOwner != address(this)) {
            usdc.safeTransferFrom(msg.sender, previousOwner, sellerAmount);
        } else {
            usdc.safeTransferFrom(msg.sender, address(this), sellerAmount);
            totalRevenue += sellerAmount;
        }
        
        totalFees += fee;
        
        // Update ownership
        _updateCardOwnership(cardId, previousOwner);
        
        emit GiftCardPurchased(cardId, msg.sender, previousOwner, price);
        emit OwnershipTransferred(cardId, previousOwner, msg.sender);
        emit RevenueCollected(price, fee);
    }
    
    /**
     * @dev Update card ownership
     */
    function _updateCardOwnership(uint256 cardId, address previousOwner) internal {
        GiftCardCore storage core = cardCores[cardId];
        GiftCardStatus storage status = cardStatuses[cardId];
        GiftCardMeta storage meta = cardMetas[cardId];
        
        // Remove from previous owner's list
        if (previousOwner != address(this)) {
            _removeFromUserCards(previousOwner, cardId);
        }
        
        // Add to new owner
        userGiftCards[msg.sender].push(cardId);
        
        // Update core data
        core.owner = msg.sender;
        core.isPurchased = true;
        status.purchasedAt = block.timestamp;
        
        // Allow access to encrypted data
        e.allow(cardEncryptedCodes[cardId], msg.sender);
        e.allow(cardEncryptedPins[cardId], msg.sender);
        
        // Update inventory
        categoryInventory[meta.category].count--;
        emit InventoryUpdated(meta.category, categoryInventory[meta.category].count);
        
        // Check restocking
        _checkAndTriggerAutoRestock(meta.category);
    }

    /**
     * @dev Helper function to remove card from user's list
     */
    function _removeFromUserCards(address user, uint256 cardId) internal {
        uint256[] storage userCards = userGiftCards[user];
        for (uint256 i = 0; i < userCards.length; i++) {
            if (userCards[i] == cardId) {
                userCards[i] = userCards[userCards.length - 1];
                userCards.pop();
                break;
            }
        }
    }

    // =============================================================================
    // FRONTEND COMPATIBLE VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Get all gift cards - FRONTEND COMPATIBLE
     * Uses chunked approach to avoid stack issues while maintaining compatibility
     */
    function getAllGiftCards() external view returns (GiftCardPublic[] memory) {
        return _getGiftCardsChunked(0, nextCardId - 1);
    }
    
    /**
     * @dev Get available gift cards for purchase - FRONTEND COMPATIBLE
     */
    function getAvailableGiftCards() external view returns (GiftCardPublic[] memory) {
        // Count available cards first
        uint256 count = 0;
        for (uint256 i = 1; i < nextCardId; i++) {
            if (cardCores[i].isActive && !cardCores[i].isPurchased) {
                count++;
            }
        }
        
        // Create result array
        GiftCardPublic[] memory result = new GiftCardPublic[](count);
        uint256 index = 0;
        
        // Fill array with available cards
        for (uint256 i = 1; i < nextCardId; i++) {
            if (cardCores[i].isActive && !cardCores[i].isPurchased) {
                result[index] = _buildPublicCard(i);
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Get user's gift cards - FRONTEND COMPATIBLE
     */
    function getMyGiftCards() external view returns (GiftCardPublic[] memory) {
        uint256[] memory cardIds = userGiftCards[msg.sender];
        GiftCardPublic[] memory result = new GiftCardPublic[](cardIds.length);
        
        for (uint256 i = 0; i < cardIds.length; i++) {
            result[i] = _buildPublicCard(cardIds[i]);
        }
        
        return result;
    }

    /**
 * @dev Get all categories with their data - FRONTEND COMPATIBLE
 * Add this function to DGMarketCore.sol in the "FRONTEND COMPATIBLE VIEW FUNCTIONS" section
 */
function getAllCategoriesWithData() external view returns (
    string[] memory categoryNames,
    uint256[] memory counts,
    uint256[] memory thresholds,
    bool[] memory activeStatuses
) {
    uint256 length = categories.length;
    
    categoryNames = new string[](length);
    counts = new uint256[](length);
    thresholds = new uint256[](length);
    activeStatuses = new bool[](length);
    
    for (uint256 i = 0; i < length; i++) {
        string memory categoryName = categories[i];
        CategoryInventory storage inventory = categoryInventory[categoryName];
        
        categoryNames[i] = categoryName;
        counts[i] = inventory.count;
        thresholds[i] = inventory.threshold;
        activeStatuses[i] = inventory.active;
    }
    
    return (categoryNames, counts, thresholds, activeStatuses);
}
    
    /**
     * @dev Get gift card by ID - FRONTEND COMPATIBLE
     */
    function getGiftCard(uint256 cardId) external view returns (GiftCardPublic memory) {
        require(cardId < nextCardId && cardId > 0, "Invalid card ID");
        return _buildPublicCard(cardId);
    }
    
    /**
     * @dev Get gift cards by category - FRONTEND COMPATIBLE
     */
    function getGiftCardsByCategory(string calldata category) external view returns (GiftCardPublic[] memory) {
        uint256[] memory cardIds = categoryCards[category];
        uint256 count = 0;
        
        // Count active cards
        for (uint256 i = 0; i < cardIds.length; i++) {
            if (cardCores[cardIds[i]].isActive) {
                count++;
            }
        }
        
        // Build result
        GiftCardPublic[] memory result = new GiftCardPublic[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < cardIds.length; i++) {
            if (cardCores[cardIds[i]].isActive) {
                result[index] = _buildPublicCard(cardIds[i]);
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Internal function to build public card data - OPTIMIZED
     */
    function _buildPublicCard(uint256 cardId) internal view returns (GiftCardPublic memory) {
        GiftCardCore storage core = cardCores[cardId];
        GiftCardMeta storage meta = cardMetas[cardId];
        
        return GiftCardPublic({
            cardId: core.cardId,
            publicPrice: core.publicPrice,
            owner: core.owner,
            category: meta.category,
            description: meta.description,
            imageUrl: meta.imageUrl,
            isActive: core.isActive,
            isPurchased: core.isPurchased
        });
    }
    
    /**
     * @dev Get gift cards in chunks to avoid stack issues
     */
    function _getGiftCardsChunked(uint256 start, uint256 end) internal view returns (GiftCardPublic[] memory) {
        uint256 count = 0;
        
        // Count active cards in range
        for (uint256 i = start; i <= end && i < nextCardId; i++) {
            if (i > 0 && cardCores[i].isActive) {
                count++;
            }
        }
        
        // Build result
        GiftCardPublic[] memory result = new GiftCardPublic[](count);
        uint256 index = 0;
        
        for (uint256 i = start; i <= end && i < nextCardId; i++) {
            if (i > 0 && cardCores[i].isActive) {
                result[index] = _buildPublicCard(i);
                index++;
            }
        }
        
        return result;
    }

    // =============================================================================
    // REVEAL FUNCTIONALITY
    // =============================================================================
    
    /**
     * @dev Reveal gift card code and pin (only after purchase)
     */
    function revealGiftCard(
        uint256 cardId
    ) external validCard(cardId) onlyCardOwner(cardId) notExpired(cardId) returns (euint256 encryptedCode, euint256 encryptedPin) {
        GiftCardCore storage core = cardCores[cardId];
        GiftCardStatus storage status = cardStatuses[cardId];
        
        if (!core.isPurchased) revert CardNotPurchased(cardId);
        if (status.isRevealed) revert CardAlreadyRevealed(cardId);
        
        // Mark as revealed
        status.isRevealed = true;
        
        // Get encrypted data
        euint256 code = cardEncryptedCodes[cardId];
        euint256 pin = cardEncryptedPins[cardId];
        
        // Allow access
        e.allow(code, msg.sender);
        e.allow(pin, msg.sender);
        
        emit GiftCardRevealed(cardId, msg.sender);
        return (code, pin);
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Withdraw any ERC20 token from contract (admin only)
     */
    function adminWithdrawToken(address tokenAddress, uint256 amount) 
        external 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
    {
        require(tokenAddress != address(0), "Invalid token address");
        require(amount > 0, "Amount must be positive");
        
        IERC20 token = IERC20(tokenAddress);
        uint256 contractBalance = token.balanceOf(address(this));
        
        require(contractBalance >= amount, "Insufficient contract balance");
        
        token.safeTransfer(msg.sender, amount);
        
        emit TokenWithdrawn(tokenAddress, msg.sender, amount);
    }
    
    /**
     * @dev Get contract's USDC balance
     */
    function getContractUSDCBalance() external view returns (uint256) {
        return IERC20(USDC_ADDRESS).balanceOf(address(this));
    }

    /**
     * @dev Update marketplace fee
     */
    function updateMarketplaceFee(uint256 newFeePercent) external onlyRole(ADMIN_ROLE) {
        require(newFeePercent <= MAX_FEE_PERCENT, "Fee too high");
        marketplaceFeePercent = newFeePercent;
    }
    
    /**
     * @dev Set Chainlink manager address
     */
    function setChainlinkManager(address _chainlinkManager) external onlyRole(ADMIN_ROLE) {
        chainlinkManager = _chainlinkManager;
    }
    
    /**
     * @dev Get revenue stats
     */
    function getRevenueStats() external view returns (uint256 revenue, uint256 fees, uint256 total) {
        return (totalRevenue, totalFees, totalRevenue + totalFees);
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Check inventory and trigger automatic restocking if needed
     */
    function _checkAndTriggerAutoRestock(string memory category) internal {
        if (!autoRestockEnabled || chainlinkManager == address(0)) {
            return;
        }
        
        CategoryInventory storage inventory = categoryInventory[category];
        if (inventory.active && inventory.count <= inventory.threshold) {
            try IChainlinkManager(chainlinkManager).triggerRestock(category) {
                emit AutoRestockTriggered(category, inventory.count, inventory.threshold);
            } catch {
                // Silently fail to avoid reverting the main transaction
            }
        }
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