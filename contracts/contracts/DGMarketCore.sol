// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@inco/lightning/src/Lib.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./ConfidentialGiftCard.sol";

/** 
 * @title DGMarketCore
 * @dev Enhanced core marketplace contract for DG Market with PUBLIC pricing
 * @notice This contract enables buying, selling, and trading gift cards with transparent pricing
 */
contract DGMarketCore is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    
    // Contracts
    ConfidentialGiftCard public immutable giftCardContract;
    
    // Price oracles
    mapping(address => AggregatorV3Interface) public priceFeeds;
    
    // Supported tokens
    mapping(address => bool) public supportedTokens;
    address[] public supportedTokensList;
    
    // Fee configuration
    uint256 public marketplaceFeePercent; // Fee in basis points (e.g., 250 = 2.5%)
    uint256 public constant MAX_FEE_PERCENT = 1000; // Maximum 10%
    
    // Listing data - NOW WITH PUBLIC PRICES
    struct Listing {
        uint256 cardId;
        address seller;
        address paymentToken;
        uint256 price; // PUBLIC PRICE - no longer encrypted!
        bool isActive; // PUBLIC STATUS - no longer encrypted!
        uint256 listedAt;
        string category;
    }
    
    struct ListingMetadata {
        uint256 listingId;
        uint256 cardId;
        address seller;
        address paymentToken;
        uint256 price; // NOW INCLUDED!
        bool isActive; // NOW INCLUDED!
        uint256 listedAt;
        string category;
    }
    
    // Listings by ID
    mapping(uint256 => Listing) public listings;
    uint256 private nextListingId;
    
    // Track active listings efficiently
    uint256[] public activeListingIds;
    mapping(uint256 => uint256) private listingIdToActiveIndex; // listingId => index in activeListingIds
    
    // User's active listings
    mapping(address => uint256[]) public userListings;
    
    // Category tracking
    mapping(string => uint256[]) public categoryListings;
    string[] public categories;
    mapping(string => bool) public categoryExists;
    
    // Events
    event TokenAdded(address indexed token, address indexed priceFeed);
    event TokenRemoved(address indexed token);
    event PriceFeedUpdated(address indexed token, address indexed priceFeed);
    event GiftCardListed(
        uint256 indexed listingId, 
        uint256 indexed cardId, 
        address indexed seller,
        address paymentToken,
        uint256 price,
        string category
    );
    event GiftCardPurchased(
        uint256 indexed listingId, 
        uint256 indexed cardId, 
        address indexed buyer,
        address seller,
        uint256 price
    );
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event FeeUpdated(uint256 newFeePercent);
    event CategoryAdded(string category);
    
    // Modifiers
    modifier validListingId(uint256 listingId) {
        require(listingId < nextListingId && listingId > 0, "Invalid listing ID");
        _;
    }
    
    modifier onlySupportedToken(address token) {
        require(supportedTokens[token], "Unsupported payment token");
        _;
    }
    
    constructor(
        address _giftCardContract,
        uint256 _initialFeePercent
    ) {
        require(_giftCardContract != address(0), "Invalid gift card contract");
        require(_initialFeePercent <= MAX_FEE_PERCENT, "Fee too high");
        
        giftCardContract = ConfidentialGiftCard(_giftCardContract);
        marketplaceFeePercent = _initialFeePercent;
        nextListingId = 1;
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev List a gift card for sale with PUBLIC pricing
     * @param cardId The ID of the gift card to list
     * @param paymentToken The token address for payment
     * @param price The PUBLIC price for the gift card
     * @param category The category for this listing
     * @return listingId The ID of the new listing
     */
    function listGiftCard(
        uint256 cardId,
        address paymentToken,
        uint256 price,
        string calldata category
    ) external whenNotPaused nonReentrant onlySupportedToken(paymentToken) returns (uint256 listingId) {
        require(price > 0, "Price must be greater than zero");
        require(bytes(category).length > 0, "Category required");
        
        // Verify ownership and that card is active
        require(giftCardContract.getGiftCardOwner(cardId) == msg.sender, "Not card owner");
        require(giftCardContract.isGiftCardActive(cardId), "Gift card is not active");
        
        // Transfer gift card to marketplace
        giftCardContract.marketplaceTransfer(cardId, msg.sender, address(this));
        
        // Create listing
        listingId = nextListingId;
        nextListingId++;
        
        listings[listingId] = Listing({
            cardId: cardId,
            seller: msg.sender,
            paymentToken: paymentToken,
            price: price, // PUBLIC PRICE
            isActive: true, // PUBLIC STATUS
            listedAt: block.timestamp,
            category: category
        });
        
        // Add to active listings tracking
        activeListingIds.push(listingId);
        listingIdToActiveIndex[listingId] = activeListingIds.length - 1;
        
        // Track user listings
        userListings[msg.sender].push(listingId);
        
        // Track category listings
        if (categoryExists[category]) {
            categoryListings[category].push(listingId);
        }
        
        emit GiftCardListed(listingId, cardId, msg.sender, paymentToken, price, category);
        return listingId;
    }
    
    /**
     * @dev Purchase a listed gift card (simplified - no decryption needed!)
     * @param listingId The ID of the listing to purchase
     * @return success Whether the purchase was successful
     */
    function purchaseGiftCard(
        uint256 listingId
    ) external whenNotPaused nonReentrant validListingId(listingId) returns (bool success) {
        Listing storage listing = listings[listingId];
        
        require(listing.isActive, "Listing is not active");
        require(listing.seller != msg.sender, "Cannot buy own listing");
        
        uint256 price = listing.price;
        
        // Check buyer has sufficient tokens
        IERC20 paymentToken = IERC20(listing.paymentToken);
        require(paymentToken.balanceOf(msg.sender) >= price, "Insufficient balance");
        require(paymentToken.allowance(msg.sender, address(this)) >= price, "Insufficient allowance");
        
        // Execute the purchase
        _completePurchase(listingId, msg.sender, price);
        
        return true;
    }
    
    /**
     * @dev Internal function to complete the purchase
     * @param listingId The listing ID
     * @param buyer The buyer address
     * @param price The purchase price
     */
    function _completePurchase(
        uint256 listingId,
        address buyer,
        uint256 price
    ) internal {
        Listing storage listing = listings[listingId];
        
        // Transfer payment from buyer
        IERC20 paymentToken = IERC20(listing.paymentToken);
        paymentToken.safeTransferFrom(buyer, address(this), price);
        
        // Calculate fee
        uint256 fee = (price * marketplaceFeePercent) / 10000;
        uint256 sellerAmount = price - fee;
        
        // Transfer payment to seller
        paymentToken.safeTransfer(listing.seller, sellerAmount);
        
        // Transfer gift card to buyer
        giftCardContract.marketplaceTransfer(listing.cardId, address(this), buyer);
        
        // Mark listing as inactive
        listing.isActive = false;
        
        // Remove from active listings
        _removeFromActiveListings(listingId);
        
        emit GiftCardPurchased(listingId, listing.cardId, buyer, listing.seller, price);
    }
    
    /**
     * @dev Cancel a gift card listing
     * @param listingId The ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external whenNotPaused nonReentrant validListingId(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not seller");
        require(listing.isActive, "Listing not active");
        
        // Transfer gift card back to seller
        giftCardContract.marketplaceTransfer(listing.cardId, address(this), msg.sender);
        
        // Mark listing as inactive
        listing.isActive = false;
        
        // Remove from active listings
        _removeFromActiveListings(listingId);
        
        emit ListingCancelled(listingId, msg.sender);
    }
    
    /**
     * @dev Internal function to remove listing from active listings array
     * @param listingId The listing ID to remove
     */
    function _removeFromActiveListings(uint256 listingId) internal {
        uint256 index = listingIdToActiveIndex[listingId];
        uint256 lastIndex = activeListingIds.length - 1;
        
        if (index != lastIndex) {
            uint256 lastListingId = activeListingIds[lastIndex];
            activeListingIds[index] = lastListingId;
            listingIdToActiveIndex[lastListingId] = index;
        }
        
        activeListingIds.pop();
        delete listingIdToActiveIndex[listingId];
    }
    
    /**
     * @dev Get all active listings metadata (INCLUDING PRICES!)
     * @return An array of listing metadata with prices
     */
    function getAllActiveListings() external view returns (ListingMetadata[] memory) {
        uint256 activeCount = activeListingIds.length;
        
        // Create array
        ListingMetadata[] memory activeListings = new ListingMetadata[](activeCount);
        
        // Populate array
        for (uint256 i = 0; i < activeCount; i++) {
            uint256 listingId = activeListingIds[i];
            Listing storage listing = listings[listingId];
            
            activeListings[i] = ListingMetadata({
                listingId: listingId,
                cardId: listing.cardId,
                seller: listing.seller,
                paymentToken: listing.paymentToken,
                price: listing.price, // NOW AVAILABLE!
                isActive: listing.isActive,
                listedAt: listing.listedAt,
                category: listing.category
            });
        }
        
        return activeListings;
    }
    
    /**
     * @dev Get active listings by category (with prices)
     * @param category The category to filter by
     * @return Array of listing metadata in this category
     */
    function getActiveListingsByCategory(string calldata category) external view returns (ListingMetadata[] memory) {
        uint256[] memory categoryIds = categoryListings[category];
        uint256 activeCount = 0;
        
        // Count active listings in category
        for (uint256 i = 0; i < categoryIds.length; i++) {
            if (listings[categoryIds[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array
        ListingMetadata[] memory activeListings = new ListingMetadata[](activeCount);
        uint256 index = 0;
        
        // Populate array
        for (uint256 i = 0; i < categoryIds.length; i++) {
            uint256 listingId = categoryIds[i];
            Listing storage listing = listings[listingId];
            
            if (listing.isActive) {
                activeListings[index] = ListingMetadata({
                    listingId: listingId,
                    cardId: listing.cardId,
                    seller: listing.seller,
                    paymentToken: listing.paymentToken,
                    price: listing.price,
                    isActive: listing.isActive,
                    listedAt: listing.listedAt,
                    category: listing.category
                });
                index++;
            }
        }
        
        return activeListings;
    }
    
    /**
     * @dev Get listings by price range
     * @param minPrice Minimum price (inclusive)
     * @param maxPrice Maximum price (inclusive)
     * @return Array of listing metadata in price range
     */
    function getListingsByPriceRange(uint256 minPrice, uint256 maxPrice) external view returns (ListingMetadata[] memory) {
        require(minPrice <= maxPrice, "Invalid price range");
        
        uint256 activeCount = 0;
        
        // Count matching listings
        for (uint256 i = 0; i < activeListingIds.length; i++) {
            uint256 listingId = activeListingIds[i];
            uint256 price = listings[listingId].price;
            if (price >= minPrice && price <= maxPrice) {
                activeCount++;
            }
        }
        
        // Create array
        ListingMetadata[] memory matchingListings = new ListingMetadata[](activeCount);
        uint256 index = 0;
        
        // Populate array
        for (uint256 i = 0; i < activeListingIds.length; i++) {
            uint256 listingId = activeListingIds[i];
            Listing storage listing = listings[listingId];
            
            if (listing.price >= minPrice && listing.price <= maxPrice) {
                matchingListings[index] = ListingMetadata({
                    listingId: listingId,
                    cardId: listing.cardId,
                    seller: listing.seller,
                    paymentToken: listing.paymentToken,
                    price: listing.price,
                    isActive: listing.isActive,
                    listedAt: listing.listedAt,
                    category: listing.category
                });
                index++;
            }
        }
        
        return matchingListings;
    }
    
    /**
     * @dev Get user's active listings (with prices)
     * @param user The user address
     * @return Array of listing metadata for this user
     */
    function getUserActiveListings(address user) external view returns (ListingMetadata[] memory) {
        uint256[] memory userIds = userListings[user];
        uint256 activeCount = 0;
        
        // Count active listings
        for (uint256 i = 0; i < userIds.length; i++) {
            if (listings[userIds[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array
        ListingMetadata[] memory activeListings = new ListingMetadata[](activeCount);
        uint256 index = 0;
        
        // Populate array
        for (uint256 i = 0; i < userIds.length; i++) {
            uint256 listingId = userIds[i];
            Listing storage listing = listings[listingId];
            
            if (listing.isActive) {
                activeListings[index] = ListingMetadata({
                    listingId: listingId,
                    cardId: listing.cardId,
                    seller: listing.seller,
                    paymentToken: listing.paymentToken,
                    price: listing.price,
                    isActive: listing.isActive,
                    listedAt: listing.listedAt,
                    category: listing.category
                });
                index++;
            }
        }
        
        return activeListings;
    }
    
    /**
     * @dev Get all supported tokens
     * @return Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }
    
    /**
     * @dev Get all categories
     * @return Array of all category names
     */
    function getCategories() external view returns (string[] memory) {
        return categories;
    }
    
    /**
     * @dev Get total number of listings created
     * @return The total number of listings
     */
    function getTotalListings() external view returns (uint256) {
        return nextListingId - 1;
    }
    
    /**
     * @dev Get total number of active listings
     * @return The total number of active listings
     */
    function getTotalActiveListings() external view returns (uint256) {
        return activeListingIds.length;
    }
    
    /**
     * @dev Check if a listing exists and is active
     * @param listingId The listing ID to check
     * @return Whether the listing exists and is active
     */
    function isListingActive(uint256 listingId) external view returns (bool) {
        return listingId < nextListingId && listingId > 0 && listings[listingId].isActive;
    }
    
    /**
     * @dev Get listing details (including price)
     * @param listingId The listing ID
     * @return listing The complete listing data
     */
    function getListingDetails(uint256 listingId) external view validListingId(listingId) returns (Listing memory) {
        return listings[listingId];
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @dev Add a supported payment token
     * @param token The ERC20 token address to add
     * @param priceFeed The Chainlink price feed address for this token
     */
    function addSupportedToken(address token, address priceFeed) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        supportedTokensList.push(token);
        
        if (priceFeed != address(0)) {
            priceFeeds[token] = AggregatorV3Interface(priceFeed);
        }
        
        emit TokenAdded(token, priceFeed);
    }
    
    /**
     * @dev Remove a supported payment token
     * @param token The ERC20 token address to remove
     */
    function removeSupportedToken(address token) external onlyRole(ADMIN_ROLE) {
        require(supportedTokens[token], "Token not supported");
        
        supportedTokens[token] = false;
        
        // Remove from array
        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (supportedTokensList[i] == token) {
                supportedTokensList[i] = supportedTokensList[supportedTokensList.length - 1];
                supportedTokensList.pop();
                break;
            }
        }
        
        delete priceFeeds[token];
        emit TokenRemoved(token);
    }
    
    /**
     * @dev Update marketplace fee percentage
     * @param newFeePercent New fee percentage in basis points
     */
    function updateFee(uint256 newFeePercent) external onlyRole(ADMIN_ROLE) {
        require(newFeePercent <= MAX_FEE_PERCENT, "Fee too high");
        marketplaceFeePercent = newFeePercent;
        emit FeeUpdated(newFeePercent);
    }
    
    /**
     * @dev Add a new category
     * @param category The category name to add
     */
    function addCategory(string calldata category) external onlyRole(ADMIN_ROLE) {
        require(bytes(category).length > 0, "Empty category");
        require(!categoryExists[category], "Category already exists");
        
        categories.push(category);
        categoryExists[category] = true;
        emit CategoryAdded(category);
    }
    
    /**
     * @dev Emergency function to cancel any listing (owner only)
     * @param listingId The listing ID to cancel
     */
    function emergencyCancelListing(uint256 listingId) external onlyRole(ADMIN_ROLE) validListingId(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        
        // Transfer gift card back to seller
        giftCardContract.marketplaceTransfer(listing.cardId, address(this), listing.seller);
        
        // Mark listing as inactive
        listing.isActive = false;
        
        // Remove from active listings
        _removeFromActiveListings(listingId);
        
        emit ListingCancelled(listingId, listing.seller);
    }
    
    /**
     * @dev Withdraw accumulated fees (owner only)
     * @param token The token to withdraw
     * @param amount The amount to withdraw
     */
    function withdrawFees(address token, uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
    
    /**
     * @dev Emergency function to withdraw all fees for a token
     * @param token The token to withdraw all fees for
     */
    function emergencyWithdrawFees(address token) external onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
        }
    }
    
    /**
     * @dev Pause the contract (emergency function)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Grant admin role to an address
     * @param account The address to grant the role to
     */
    function grantAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ADMIN_ROLE, account);
    }
    
    /**
     * @dev Grant backend role to an address
     * @param account The address to grant the role to
     */
    function grantBackendRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(BACKEND_ROLE, account);
    }
}