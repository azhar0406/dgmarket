// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@inco/lightning/src/Lib.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ConfidentialGiftCard
 * @dev A confidential gift card contract using Inco Lightning's TEE technology
 * @notice This contract enables privacy-preserving gift card operations with enhanced security
 */
contract ConfidentialGiftCard is Ownable2Step, ReentrancyGuard, Pausable {
    
    // Struct for gift card metadata (non-encrypted public data)
    struct GiftCardMetadata {
        string description;
        string imageUrl;
        uint256 expiryDate; // 0 means no expiry
        address creator;
        bool exists;
    }
    
    // Events
    event GiftCardCreated(uint256 indexed cardId, address indexed creator, string description);
    event GiftCardRedeemed(uint256 indexed cardId, address indexed redeemer);
    event GiftCardTransferred(uint256 indexed cardId, address indexed from, address indexed to);
    event UserBalanceDecrypted(address indexed user, uint256 decryptedAmount);
    event GiftCardValueDecrypted(uint256 indexed cardId, address indexed user, uint256 decryptedValue);
    
    // Encrypted mappings
    mapping(address => euint256) private balances;
    mapping(uint256 => euint256) private giftCardValues;
    mapping(uint256 => ebool) private giftCardActive;
    mapping(uint256 => address) private giftCardOwners; // Regular address, not encrypted
    
    // Public metadata mapping
    mapping(uint256 => GiftCardMetadata) public giftCardMetadata;
    
    // Decryption request tracking
    mapping(uint256 => address) private requestIdToUserAddress;
    mapping(uint256 => uint256) private requestIdToCardId;
    
    // Card counter
    uint256 private nextCardId;
    
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
    
    constructor() Ownable(msg.sender) {
        nextCardId = 1;
    }
    
    /**
     * @dev Creates a new gift card with encrypted value
     * @param valueInput The encrypted value of the gift card
     * @param description Public description of the gift card
     * @param imageUrl Public image URL for the gift card
     * @param expiryDate Expiry timestamp (0 for no expiry)
     * @return cardId The ID of the newly created gift card
     */
    function createGiftCard(
        bytes memory valueInput,
        string calldata description,
        string calldata imageUrl,
        uint256 expiryDate
    ) external whenNotPaused nonReentrant returns (uint256 cardId) {
        require(bytes(description).length > 0, "Description cannot be empty");
        require(expiryDate == 0 || expiryDate > block.timestamp, "Invalid expiry date");
        
        // Convert encrypted input to euint256
        euint256 value = e.newEuint256(valueInput, msg.sender);
        
        // Assign card ID
        cardId = nextCardId;
        nextCardId++;
        
        // Store encrypted gift card data
        giftCardValues[cardId] = value;
        giftCardActive[cardId] = e.asEbool(true);
        giftCardOwners[cardId] = msg.sender; // Regular address assignment
        
        // Allow access to the encrypted values
        e.allow(giftCardValues[cardId], address(this));
        e.allow(giftCardValues[cardId], msg.sender);
        e.allow(giftCardActive[cardId], address(this));
        e.allow(giftCardActive[cardId], msg.sender);
        
        // Store public metadata
        giftCardMetadata[cardId] = GiftCardMetadata({
            description: description,
            imageUrl: imageUrl,
            expiryDate: expiryDate,
            creator: msg.sender,
            exists: true
        });
        
        emit GiftCardCreated(cardId, msg.sender, description);
        return cardId;
    }
    
    /**
     * @dev Redeems a gift card if it's active and the caller is the owner
     * @param cardId The ID of the gift card to redeem
     * @return success Whether the redemption was successful (encrypted)
     */
    function redeemGiftCard(
        uint256 cardId
    ) external whenNotPaused nonReentrant validCardId(cardId) notExpired(cardId) onlyCardOwner(cardId) returns (ebool success) {
        // Get card status and value
        ebool isActive = giftCardActive[cardId];
        euint256 cardValue = giftCardValues[cardId];
        
        // Card can be redeemed if it's active
        success = isActive;
        
        // Conditional transfer based on success
        euint256 transferAmount = e.select(
            success,
            cardValue,
            e.asEuint256(0)
        );
        
        // Update balances and card status
        balances[msg.sender] = e.add(balances[msg.sender], transferAmount);
        giftCardActive[cardId] = e.select(
            success,
            e.asEbool(false),
            isActive
        );
        
        // Allow access to updated balances
        e.allow(balances[msg.sender], address(this));
        e.allow(balances[msg.sender], msg.sender);
        e.allow(giftCardActive[cardId], address(this));
        e.allow(giftCardActive[cardId], msg.sender);
        
        emit GiftCardRedeemed(cardId, msg.sender);
        return success;
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
        
        // Simple ownership transfer (not encrypted since we verified ownership in modifier)
        giftCardOwners[cardId] = newOwner;
        
        // Allow new owner access to encrypted data
        e.allow(giftCardValues[cardId], newOwner);
        e.allow(giftCardActive[cardId], newOwner);
        
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
        
        // Transfer ownership
        giftCardOwners[cardId] = to;
        
        // Allow new owner access to encrypted data
        e.allow(giftCardValues[cardId], to);
        e.allow(giftCardActive[cardId], to);
        
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
     * @dev Get gift card value handle (for client-side decryption)
     * @param cardId The ID of the gift card
     * @return The encrypted gift card value handle
     */
    function giftCardValueOf(uint256 cardId) external view validCardId(cardId) returns (euint256) {
        require(giftCardOwners[cardId] == msg.sender, "Not card owner");
        return giftCardValues[cardId];
    }
    
    /**
     * @dev Get gift card active status handle (for client-side decryption)
     * @param cardId The ID of the gift card
     * @return The encrypted active status handle
     */
    function giftCardActiveOf(uint256 cardId) external view validCardId(cardId) returns (ebool) {
        require(giftCardOwners[cardId] == msg.sender, "Not card owner");
        return giftCardActive[cardId];
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
     * @dev Get all gift cards metadata (public data only)
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
     * @dev Request decryption of user balance (owner only - for admin purposes)
     * @param user The user address
     * @return requestId The decryption request ID
     */
    function requestUserBalanceDecryption(
        address user
    ) external onlyOwner returns (uint256) {
        euint256 encryptedBalance = balances[user];
        e.allow(encryptedBalance, address(this));
        
        uint256 requestId = e.requestDecryption(
            encryptedBalance,
            this.onBalanceDecryptionCallback.selector,
            ""
        );
        
        requestIdToUserAddress[requestId] = user;
        return requestId;
    }
    
    /**
     * @dev Request decryption of gift card value (owner only - for admin purposes)
     * @param cardId The gift card ID
     * @return requestId The decryption request ID
     */
    function requestGiftCardValueDecryption(
        uint256 cardId
    ) external onlyOwner validCardId(cardId) returns (uint256) {
        euint256 encryptedValue = giftCardValues[cardId];
        e.allow(encryptedValue, address(this));
        
        uint256 requestId = e.requestDecryption(
            encryptedValue,
            this.onGiftCardValueDecryptionCallback.selector,
            ""
        );
        
        requestIdToCardId[requestId] = cardId;
        return requestId;
    }
    
    /**
     * @dev Callback function for balance decryption
     * @param requestId The decryption request ID
     * @param decryptedAmount The decrypted balance
     * @param data Additional data (unused)
     */
    function onBalanceDecryptionCallback(
        uint256 requestId,
        bytes32 decryptedAmount,
        bytes memory data
    ) public returns (bool) {
        address userAddress = requestIdToUserAddress[requestId];
        emit UserBalanceDecrypted(userAddress, uint256(decryptedAmount));
        return true;
    }
    
    /**
     * @dev Callback function for gift card value decryption
     * @param requestId The decryption request ID
     * @param decryptedValue The decrypted value
     * @param data Additional data (unused)
     */
    function onGiftCardValueDecryptionCallback(
        uint256 requestId,
        bytes32 decryptedValue,
        bytes memory data
    ) public returns (bool) {
        uint256 cardId = requestIdToCardId[requestId];
        address cardOwner = giftCardOwners[cardId];
        emit GiftCardValueDecrypted(cardId, cardOwner, uint256(decryptedValue));
        return true;
    }
    
    /**
     * @dev Get the total number of gift cards created
     */
    function getTotalGiftCards() external view returns (uint256) {
        return nextCardId - 1;
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}