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
 * @dev Enhanced core marketplace contract for DG Market with privacy-preserving features
 * @notice This contract enables buying, selling, and trading gift cards with encrypted pricing
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
    
    // Listing data
    struct Listing {
        uint256 cardId;
        address seller; // Regular address, not encrypted
        address paymentToken;
        euint256 encryptedPrice; // Encrypted price
        ebool isActive;
        uint256 listedAt;
        string category; // Public category for filtering
    }
    
    struct ListingMetadata {
        uint256 listingId;
        uint256 cardId;
        address seller;
        address paymentToken;
        uint256 listedAt;
        string category;
        // Note: price is encrypted and requires separate calls
    }
    
    // Listings by ID
    mapping(uint256 => Listing) public listings;
    uint256 private nextListingId;
    
    // User's active listings
    mapping(address => uint256[]) public userListings;
    
    // Category tracking
    mapping(string => uint256[]) public categoryListings;
    string[] public categories;
    mapping(string => bool) public categoryExists;
    
    // Decryption requests tracking
    mapping(uint256 => uint256) public decryptionToListing; // requestId => listingId
    mapping(uint256 => address) public decryptionToBuyer; // requestId => buyer
    
    // Events
    event TokenAdded(address indexed token, address indexed priceFeed);
    event TokenRemoved(address indexed token);
    event PriceFeedUpdated(address indexed token, address indexed priceFeed);
    event GiftCardListed(
        uint256 indexed listingId, 
        uint256 indexed cardId, 
        address indexed seller,
        address paymentToken,
        string category
    );
    event GiftCardPurchased(
        uint256 indexed listingId, 
        uint256 indexed cardId, 
        address indexed buyer,
        address seller,
        uint256 amount
    );
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event FeeUpdated(uint256 newFeePercent);
    event CategoryAdded(string category);
    event PurchaseInitiated(uint256 indexed listingId, address indexed buyer, uint256 requestId);
    
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
     * @dev Update a price feed for a token
     * @param token The ERC20 token address
     * @param priceFeed The new Chainlink price feed address
     */
    function updatePriceFeed(address token, address priceFeed) external onlyRole(ADMIN_ROLE) {
        require(supportedTokens[token], "Token not supported");
        require(priceFeed != address(0), "Invalid price feed address");
        
        priceFeeds[token] = AggregatorV3Interface(priceFeed);
        emit PriceFeedUpdated(token, priceFeed);
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
     * @dev List a gift card for sale with encrypted pricing
     * @param cardId The ID of the gift card to list
     * @param paymentToken The token address for payment
     * @param encryptedPriceInput The encrypted price input data
     * @param category The category for this listing
     * @return listingId The ID of the new listing
     */
    function listGiftCard(
        uint256 cardId,
        address paymentToken,
        bytes calldata encryptedPriceInput,
        string calldata category
    ) external whenNotPaused nonReentrant onlySupportedToken(paymentToken) returns (uint256 listingId) {
        require(bytes(category).length > 0, "Category required");
        
        // Verify ownership and transfer gift card to marketplace
        require(giftCardContract.getGiftCardOwner(cardId) == msg.sender, "Not card owner");
        giftCardContract.marketplaceTransfer(cardId, msg.sender, address(this));
        
        // Convert encrypted price input
        euint256 encryptedPrice = e.newEuint256(encryptedPriceInput, msg.sender);
        
        // Create listing
        listingId = nextListingId;
        nextListingId++;
        
        listings[listingId] = Listing({
            cardId: cardId,
            seller: msg.sender, // Regular address
            paymentToken: paymentToken,
            encryptedPrice: encryptedPrice,
            isActive: e.asEbool(true),
            listedAt: block.timestamp,
            category: category
        });
        
        // Allow access to encrypted data
        e.allow(listings[listingId].encryptedPrice, address(this));
        e.allow(listings[listingId].encryptedPrice, msg.sender);
        e.allow(listings[listingId].isActive, address(this));
        e.allow(listings[listingId].isActive, msg.sender);
        
        // Track user listings
        userListings[msg.sender].push(listingId);
        
        // Track category listings
        if (categoryExists[category]) {
            categoryListings[category].push(listingId);
        }
        
        emit GiftCardListed(listingId, cardId, msg.sender, paymentToken, category);
        return listingId;
    }
    
    /**
     * @dev Initiate purchase of a listed gift card with encrypted price verification
     * @param listingId The ID of the listing to purchase
     * @param maxPaymentAmount The maximum amount buyer is willing to pay
     * @return requestId The decryption request ID
     */
    function initiatePurchase(
        uint256 listingId,
        uint256 maxPaymentAmount
    ) external whenNotPaused nonReentrant validListingId(listingId) returns (uint256 requestId) {
        Listing storage listing = listings[listingId];
        require(listing.seller != msg.sender, "Cannot buy own listing");
        
        // Check buyer has sufficient tokens
        IERC20 paymentToken = IERC20(listing.paymentToken);
        require(paymentToken.balanceOf(msg.sender) >= maxPaymentAmount, "Insufficient balance");
        require(paymentToken.allowance(msg.sender, address(this)) >= maxPaymentAmount, "Insufficient allowance");
        
        // Request decryption of the listing price
        e.allow(listing.encryptedPrice, address(this));
        requestId = e.requestDecryption(
            listing.encryptedPrice,
            this.onPriceDecryptionCallback.selector,
            abi.encode(listingId, msg.sender, maxPaymentAmount)
        );
        
        // Track the decryption request
        decryptionToListing[requestId] = listingId;
        decryptionToBuyer[requestId] = msg.sender;
        
        emit PurchaseInitiated(listingId, msg.sender, requestId);
        return requestId;
    }
    
    /**
     * @dev Callback function for price decryption and purchase completion
     * @param requestId The decryption request ID
     * @param decryptedPrice The decrypted price
     * @param data Additional data (listingId, buyer, maxPayment)
     */
    function onPriceDecryptionCallback(
        uint256 requestId,
        bytes32 decryptedPrice,
        bytes memory data
    ) public returns (bool) {
        (uint256 listingId, address buyer, uint256 maxPaymentAmount) = abi.decode(data, (uint256, address, uint256));
        
        uint256 actualPrice = uint256(decryptedPrice);
        Listing storage listing = listings[listingId];
        
        // Verify the purchase can proceed
        if (actualPrice <= maxPaymentAmount && buyer != address(0)) {
            // Execute the purchase
            _completePurchase(listingId, buyer, actualPrice);
            return true;
        }
        
        return false;
    }
    
    /**
     * @dev Internal function to complete the purchase
     * @param listingId The listing ID
     * @param buyer The buyer address
     * @param price The actual price
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
        listing.isActive = e.asEbool(false);
        e.allow(listing.isActive, address(this));
        
        emit GiftCardPurchased(listingId, listing.cardId, buyer, listing.seller, price);
    }
    
    /**
     * @dev Cancel a gift card listing
     * @param listingId The ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external whenNotPaused nonReentrant validListingId(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not seller");
        
        // Transfer gift card back to seller
        giftCardContract.marketplaceTransfer(listing.cardId, address(this), msg.sender);
        
        // Mark listing as inactive
        listing.isActive = e.asEbool(false);
        e.allow(listing.isActive, address(this));
        
        emit ListingCancelled(listingId, msg.sender);
    }
    
    /**
     * @dev Get all active listings metadata (public data only)
     * @return An array of listing metadata
     */
    function getAllActiveListings() external view returns (ListingMetadata[] memory) {
        uint256 activeCount = 0;
        
        // Count active listings (simplified - in production you'd need to decrypt isActive)
        for (uint256 i = 1; i < nextListingId; i++) {
            if (listings[i].listedAt > 0) {
                activeCount++;
            }
        }
        
        // Create array
        ListingMetadata[] memory activeListings = new ListingMetadata[](activeCount);
        uint256 index = 0;
        
        // Populate array
        for (uint256 i = 1; i < nextListingId; i++) {
            if (listings[i].listedAt > 0) {
                Listing storage listing = listings[i];
                activeListings[index] = ListingMetadata({
                    listingId: i,
                    cardId: listing.cardId,
                    seller: listing.seller,
                    paymentToken: listing.paymentToken,
                    listedAt: listing.listedAt,
                    category: listing.category
                });
                index++;
            }
        }
        
        return activeListings;
    }
    
    /**
     * @dev Get listings by category
     * @param category The category to filter by
     * @return Array of listing IDs in this category
     */
    function getListingsByCategory(string calldata category) external view returns (uint256[] memory) {
        return categoryListings[category];
    }
    
    /**
     * @dev Get user's listings
     * @param user The user address
     * @return Array of listing IDs for this user
     */
    function getUserListings(address user) external view returns (uint256[] memory) {
        return userListings[user];
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
     * @dev Get encrypted listing price handle (for client-side decryption)
     * @param listingId The listing ID
     * @return The encrypted price handle
     */
    function getListingPriceHandle(uint256 listingId) external view validListingId(listingId) returns (euint256) {
        return listings[listingId].encryptedPrice;
    }
    
    /**
     * @dev Get encrypted listing active status handle (for client-side decryption)
     * @param listingId The listing ID
     * @return The encrypted active status handle
     */
    function getListingActiveHandle(uint256 listingId) external view validListingId(listingId) returns (ebool) {
        return listings[listingId].isActive;
    }
    
    /**
     * @dev Get the latest price from a Chainlink price feed
     * @param token The token to get the price for
     * @return The latest price (scaled by 1e8)
     */
    function getLatestPrice(address token) public view returns (int256) {
        require(address(priceFeeds[token]) != address(0), "No price feed");
        
        (
            ,
            int256 price,
            ,
            ,
            
        ) = priceFeeds[token].latestRoundData();
        
        return price;
    }
    
    /**
     * @dev Get price feed decimals for a token
     * @param token The token to get decimals for
     * @return The number of decimals in the price feed
     */
    function getPriceFeedDecimals(address token) external view returns (uint8) {
        require(address(priceFeeds[token]) != address(0), "No price feed");
        return priceFeeds[token].decimals();
    }
    
    /**
     * @dev Convert token amount using Chainlink price feeds
     * @param fromToken Source token address
     * @param toToken Destination token address
     * @param amount Amount to convert
     * @return convertedAmount The converted amount
     */
    function convertTokenAmount(
        address fromToken,
        address toToken,
        uint256 amount
    ) external view returns (uint256 convertedAmount) {
        require(address(priceFeeds[fromToken]) != address(0), "No price feed for source token");
        require(address(priceFeeds[toToken]) != address(0), "No price feed for destination token");
        
        int256 fromPrice = getLatestPrice(fromToken);
        int256 toPrice = getLatestPrice(toToken);
        
        require(fromPrice > 0 && toPrice > 0, "Invalid prices");
        
        // Convert amount using price ratio
        convertedAmount = (amount * uint256(fromPrice)) / uint256(toPrice);
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
     * @dev Get total number of listings created
     * @return The total number of listings
     */
    function getTotalListings() external view returns (uint256) {
        return nextListingId - 1;
    }
    
    /**
     * @dev Check if a listing exists
     * @param listingId The listing ID to check
     * @return Whether the listing exists
     */
    function listingExists(uint256 listingId) external view returns (bool) {
        return listingId < nextListingId && listingId > 0 && listings[listingId].listedAt > 0;
    }
    
    /**
     * @dev Get listing basic info (non-encrypted data)
     * @param listingId The listing ID
     * @return cardId The ID of the gift card
     * @return seller The address of the seller
     * @return paymentToken The address of the token used for payment
     * @return listedAt The timestamp when the listing was created
     * @return category The category of the gift card
     */
    function getListingInfo(uint256 listingId) external view validListingId(listingId) returns (
        uint256 cardId,
        address seller,
        address paymentToken,
        uint256 listedAt,
        string memory category
    ) {
        Listing storage listing = listings[listingId];
        return (
            listing.cardId,
            listing.seller,
            listing.paymentToken,
            listing.listedAt,
            listing.category
        );
    }
    
    /**
     * @dev Emergency function to cancel any listing (owner only)
     * @param listingId The listing ID to cancel
     */
    function emergencyCancelListing(uint256 listingId) external onlyRole(ADMIN_ROLE) validListingId(listingId) {
        Listing storage listing = listings[listingId];
        
        // Transfer gift card back to seller
        giftCardContract.marketplaceTransfer(listing.cardId, address(this), listing.seller);
        
        // Mark listing as inactive
        listing.isActive = e.asEbool(false);
        e.allow(listing.isActive, address(this));
        
        emit ListingCancelled(listingId, listing.seller);
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
     * @dev Handle emergency situations by allowing gift card recovery
     * @param cardId The gift card ID to recover
     * @param to The address to send the gift card to
     */
    function emergencyRecoverGiftCard(uint256 cardId, address to) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        giftCardContract.marketplaceTransfer(cardId, address(this), to);
    }
    
    /**
     * @dev Grant admin role to an address
     * @param account The address to grant the role to
     */
    function grantAdminRole(address account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _grantRole(ADMIN_ROLE, account);
    }
    
    /**
     * @dev Revoke admin role from an address
     * @param account The address to revoke the role from
     */
    function revokeAdminRole(address account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _revokeRole(ADMIN_ROLE, account);
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
}