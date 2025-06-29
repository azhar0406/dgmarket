// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@inco/lightning/src/Lib.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ConfidentialGiftCard
 * @dev A confidential gift card contract using Inco Lightning's TEE technology
 * @notice This contract enables privacy-preserving gift card operations with encrypted voucher codes
 * @notice Only admin and backend roles can create gift cards
 */
contract ConfidentialGiftCard is AccessControl, ReentrancyGuard, Pausable {
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    
    // Struct for gift card metadata (public data including price)
    struct GiftCardMetadata {
        uint256 value; // PUBLIC PRICE - no longer encrypted!
        string description;
        string imageUrl;
        uint256 expiryDate; // 0 means no expiry
        address creator;
        bool exists;
        bool isActive; // PUBLIC STATUS - no longer encrypted!
    }
    
    // Events
    event GiftCardCreated(uint256 indexed cardId, address indexed creator, string description, uint256 value);
    event GiftCardRedeemed(uint256 indexed cardId, address indexed redeemer, uint256 value);
    event GiftCardTransferred(uint256 indexed cardId, address indexed from, address indexed to);
    event UserBalanceDecrypted(address indexed user, uint256 decryptedAmount);
    event GiftCardCodeDecrypted(uint256 indexed cardId, address indexed user, string decryptedCode);
    event StockThresholdReached(string category, uint256 currentStock, uint256 threshold);
    event RestockRequestFailed(string category);
    
    // Encrypted mappings - Only for sensitive data
    mapping(address => euint256) private balances; // User balances (encrypted)
    mapping(uint256 => bytes) private encryptedGiftCardCodes; // ENCRYPTED VOUCHER CODES
    mapping(uint256 => address) private giftCardOwners; // Regular address, not encrypted
    
    // Public metadata mapping (including price)
    mapping(uint256 => GiftCardMetadata) public giftCardMetadata;
    
    // Decryption request tracking
    mapping(uint256 => address) private requestIdToUserAddress;
    mapping(uint256 => uint256) private requestIdToCardId;
    
    // Card counter
    uint256 private nextCardId;
    
    // Category inventory tracking
    mapping(string => uint256) public categoryStock;
    mapping(string => uint256) public categoryThresholds;
    
    // ChainlinkGiftCardManager contract reference
    address public chainlinkGiftCardManager;
    
    // Modifiers
    modifier validCardId(uint256 cardId) {
        require(giftCardMetadata[cardId].exists, "Gift card does not exist");
        _;
    }
    
    modifier onlyCardOwner(uint256 cardId) {
        require(giftCardOwners[cardId] == msg.sender, "Not card owner");
        _;
    }
    
    modifier notExpired(uint256 cardId) {
        GiftCardMetadata memory metadata = giftCardMetadata[cardId];
        require(
            metadata.expiryDate == 0 || metadata.expiryDate > block.timestamp,
            "Gift card has expired"
        );
        _;
    }
    
    constructor() {
        nextCardId = 1;
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Creates a new gift card with encrypted code (admin only)
     * @param value The PUBLIC value/price of the gift card
     * @param encryptedCodeInput The encrypted voucher code
     * @param description Public description of the gift card
     * @param category Category of the gift card
     * @param imageUrl Public image URL for the gift card
     * @param expiryDate Expiry timestamp (0 for no expiry)
     * @return cardId The ID of the newly created gift card
     */
    function adminCreateGiftCard(
        uint256 value,
        bytes memory encryptedCodeInput,
        string calldata description,
        string calldata category,
        string calldata imageUrl,
        uint256 expiryDate
    ) external whenNotPaused nonReentrant onlyRole(ADMIN_ROLE) returns (uint256 cardId) {
        require(value > 0, "Value must be greater than zero");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(expiryDate == 0 || expiryDate > block.timestamp, "Invalid expiry date");
        
        return _createGiftCard(value, encryptedCodeInput, description, category, imageUrl, expiryDate, msg.sender);
    }
    
    /**
     * @dev Creates a new gift card with encrypted code (backend only)
     * @param value The PUBLIC value/price of the gift card
     * @param encryptedCodeInput The encrypted voucher code
     * @param description Public description of the gift card
     * @param category Category of the gift card
     * @param imageUrl Public image URL for the gift card
     * @param expiryDate Expiry timestamp (0 for no expiry)
     * @return cardId The ID of the newly created gift card
     */
    function backendCreateGiftCard(
        uint256 value,
        bytes memory encryptedCodeInput,
        string calldata description,
        string calldata category,
        string calldata imageUrl,
        uint256 expiryDate
    ) external whenNotPaused nonReentrant onlyRole(BACKEND_ROLE) returns (uint256 cardId) {
        cardId = _createGiftCard(value, encryptedCodeInput, description, category, imageUrl, expiryDate, msg.sender);
        
        // Update category stock
        updateCategoryStock(category, true);
        
        return cardId;
    }
    
    /**
     * @dev Internal function to create gift cards
     * @param value The PUBLIC value/price of the gift card
     * @param encryptedCodeInput The encrypted voucher code
     * @param description Public description of the gift card
     * @param category Category of the gift card
     * @param imageUrl Public image URL for the gift card
     * @param expiryDate Expiry timestamp (0 for no expiry)
     * @param creator The address creating the gift card
     * @return cardId The ID of the newly created gift card
     */
    function _createGiftCard(
        uint256 value,
        bytes memory encryptedCodeInput,
        string calldata description,
        string calldata category,
        string calldata imageUrl,
        uint256 expiryDate,
        address creator
    ) internal returns (uint256 cardId) {
        // Assign card ID
        cardId = nextCardId;
        nextCardId++;
        
        // Store encrypted voucher code
        encryptedGiftCardCodes[cardId] = encryptedCodeInput;
        giftCardOwners[cardId] = creator;
        
        // Store public metadata (including price)
        giftCardMetadata[cardId] = GiftCardMetadata({
            value: value, // PUBLIC PRICE
            description: description,
            imageUrl: imageUrl,
            expiryDate: expiryDate,
            creator: creator,
            exists: true,
            isActive: true // PUBLIC STATUS
        });
        
        emit GiftCardCreated(cardId, creator, description, value);
        return cardId;
    }
    
    /**
     * @dev Redeems a gift card if it's active and the caller is the owner
     * @param cardId The ID of the gift card to redeem
     * @return success Whether the redemption was successful
     */
    function redeemGiftCard(
        uint256 cardId
    ) external whenNotPaused nonReentrant validCardId(cardId) notExpired(cardId) onlyCardOwner(cardId) returns (bool success) {
        GiftCardMetadata storage metadata = giftCardMetadata[cardId];
        
        // Check if card is active
        require(metadata.isActive, "Gift card already redeemed");
        
        // Add value to user's balance (encrypted)
        uint256 cardValue = metadata.value;
        balances[msg.sender] = e.add(balances[msg.sender], e.asEuint256(cardValue));
        
        // Mark card as inactive
        metadata.isActive = false;
        
        // Allow access to updated balances
        e.allow(balances[msg.sender], address(this));
        e.allow(balances[msg.sender], msg.sender);
        
        // Update category stock
        updateCategoryStock(metadata.description, false);
        
        emit GiftCardRedeemed(cardId, msg.sender, cardValue);
        return true;
    }
    
    /**
     * @dev Transfers a gift card to a new owner
     * @param cardId The ID of the gift card to transfer
     * @param newOwner The address of the new owner
     */
    function transferGiftCard(
        uint256 cardId, 
        address newOwner
    ) external whenNotPaused nonReentrant validCardId(cardId) notExpired(cardId) onlyCardOwner(cardId) {
        require(newOwner != address(0), "Invalid address");
        require(newOwner != msg.sender, "Cannot transfer to self");
        require(giftCardMetadata[cardId].isActive, "Cannot transfer redeemed card");
        
        // Simple ownership transfer
        giftCardOwners[cardId] = newOwner;
        
        emit GiftCardTransferred(cardId, msg.sender, newOwner);
    }
    
    /**
     * @dev Allows the marketplace contract to transfer cards (for listing/purchasing)
     * @param cardId The ID of the gift card to transfer
     * @param from Current owner
     * @param to New owner
     */
    function marketplaceTransfer(
        uint256 cardId,
        address from,
        address to
    ) external whenNotPaused validCardId(cardId) notExpired(cardId) {
        require(to != address(0), "Invalid recipient");
        require(giftCardOwners[cardId] == from, "Invalid current owner");
        require(giftCardMetadata[cardId].isActive, "Cannot transfer redeemed card");
        
        // Transfer ownership
        giftCardOwners[cardId] = to;
        
        emit GiftCardTransferred(cardId, from, to);
    }
    
    /**
     * @dev Get user's balance handle (for client-side decryption)
     * @param wallet The wallet address to get balance for
     * @return The encrypted balance handle
     */
    function balanceOf(address wallet) external view returns (euint256) {
        return balances[wallet];
    }
    
    /**
     * @dev Get gift card owner (public information)
     * @param cardId The ID of the gift card
     * @return The owner address
     */
    function getGiftCardOwner(uint256 cardId) external view validCardId(cardId) returns (address) {
        return giftCardOwners[cardId];
    }
    
    /**
     * @dev Get gift card value (PUBLIC - no longer encrypted)
     * @param cardId The ID of the gift card
     * @return The gift card value
     */
    function getGiftCardValue(uint256 cardId) external view validCardId(cardId) returns (uint256) {
        return giftCardMetadata[cardId].value;
    }
    
    /**
     * @dev Get gift card active status (PUBLIC - no longer encrypted)
     * @param cardId The ID of the gift card
     * @return Whether the gift card is active
     */
    function isGiftCardActive(uint256 cardId) external view validCardId(cardId) returns (bool) {
        return giftCardMetadata[cardId].isActive;
    }
    
    /**
     * @dev Get encrypted gift card code (only for owner)
     * @param cardId The ID of the gift card
     * @return The encrypted voucher code
     */
    function getEncryptedGiftCardCode(uint256 cardId) external view validCardId(cardId) returns (bytes memory) {
        require(giftCardOwners[cardId] == msg.sender, "Not card owner");
        return encryptedGiftCardCodes[cardId];
    }
    
    /**
     * @dev Get all gift cards metadata (public data including prices)
     * @return An array of all existing gift cards metadata
     */
    function getAllGiftCardsMetadata() external view returns (GiftCardMetadata[] memory) {
        uint256 count = 0;
        
        // Count existing cards
        for (uint256 i = 1; i < nextCardId; i++) {
            if (giftCardMetadata[i].exists) {
                count++;
            }
        }
        
        // Create array
        GiftCardMetadata[] memory allCards = new GiftCardMetadata[](count);
        uint256 index = 0;
        
        // Populate array
        for (uint256 i = 1; i < nextCardId; i++) {
            if (giftCardMetadata[i].exists) {
                allCards[index] = giftCardMetadata[i];
                index++;
            }
        }
        
        return allCards;
    }
    
    /**
     * @dev Get user's gift cards
     * @param user The user address
     * @return Array of card IDs owned by the user
     */
    function getUserGiftCards(address user) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count user's cards
        for (uint256 i = 1; i < nextCardId; i++) {
            if (giftCardOwners[i] == user && giftCardMetadata[i].exists) {
                count++;
            }
        }
        
        // Create array
        uint256[] memory userCards = new uint256[](count);
        uint256 index = 0;
        
        // Populate array
        for (uint256 i = 1; i < nextCardId; i++) {
            if (giftCardOwners[i] == user && giftCardMetadata[i].exists) {
                userCards[index] = i;
                index++;
            }
        }
        
        return userCards;
    }
    
    /**
     * @dev Request decryption of gift card code (owner only)
     * @param cardId The gift card ID
     * @return requestId The decryption request ID
     */
    function requestGiftCardCodeDecryption(
        uint256 cardId
    ) external validCardId(cardId) onlyCardOwner(cardId) returns (uint256) {
        // Convert encrypted code to euint256 for decryption
        // Note: This is a simplified approach - you might need to adapt based on how codes are encrypted
        bytes memory encryptedCode = encryptedGiftCardCodes[cardId];
        euint256 encryptedValue = e.newEuint256(encryptedCode, msg.sender);
        
        e.allow(encryptedValue, address(this));
        
        uint256 requestId = e.requestDecryption(
            encryptedValue,
            this.onGiftCardCodeDecryptionCallback.selector,
            ""
        );
        
        requestIdToCardId[requestId] = cardId;
        return requestId;
    }
    
    /**
     * @dev Callback function for gift card code decryption
     * @param requestId The decryption request ID
     * @param decryptedValue The decrypted code (as bytes32)
     * @param data Additional data (unused)
     */
    function onGiftCardCodeDecryptionCallback(
        uint256 requestId,
        bytes32 decryptedValue,
        bytes memory data
    ) public returns (bool) {
        uint256 cardId = requestIdToCardId[requestId];
        address cardOwner = giftCardOwners[cardId];
        
        // Convert bytes32 to string (simplified - you might need better conversion)
        string memory decryptedCode = string(abi.encodePacked(decryptedValue));
        
        emit GiftCardCodeDecrypted(cardId, cardOwner, decryptedCode);
        return true;
    }
    
    // ... (keep all the other existing functions like role management, category management, etc.)
    
    /**
     * @dev Get the total number of gift cards created
     */
    function getTotalGiftCards() external view returns (uint256) {
        return nextCardId - 1;
    }
    
    /**
     * @dev Set the ChainlinkGiftCardManager address
     * @param _manager Address of the ChainlinkGiftCardManager contract
     */
    function setChainlinkGiftCardManager(address _manager) external onlyRole(ADMIN_ROLE) {
        require(_manager != address(0), "Invalid manager address");
        chainlinkGiftCardManager = _manager;
    }
    
    /**
     * @dev Update category stock when a gift card is created or redeemed
     * @param category The gift card category
     * @param isCreation Whether this is a creation (true) or redemption (false)
     */
    function updateCategoryStock(string memory category, bool isCreation) internal {
        if (isCreation) {
            categoryStock[category]++;
        } else if (categoryStock[category] > 0) {
            categoryStock[category]--;
            
            // Check if stock is below threshold
            if (categoryStock[category] <= categoryThresholds[category]) {
                emit StockThresholdReached(category, categoryStock[category], categoryThresholds[category]);
                
                // If ChainlinkGiftCardManager is set, notify it
                if (chainlinkGiftCardManager != address(0)) {
                    (bool success, ) = chainlinkGiftCardManager.call(
                        abi.encodeWithSignature("requestRestockFromAPI(string)", category)
                    );
                    
                    if (!success) {
                        emit RestockRequestFailed(category);
                    }
                }
            }
        }
    }
    
    /**
     * @dev Grant admin role to an address
     */
    function grantAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ADMIN_ROLE, account);
    }
    
    /**
     * @dev Grant backend role to an address
     */
    function grantBackendRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(BACKEND_ROLE, account);
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