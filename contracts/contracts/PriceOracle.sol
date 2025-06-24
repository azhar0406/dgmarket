// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PriceOracle
 * @dev Chainlink-based price oracle for DG Market with multi-token support
 * @notice Provides real-time price feeds for supported tokens with fallback mechanisms
 */
contract PriceOracle is Ownable2Step, Pausable {
    
    // Price feed data structure
    struct PriceFeedData {
        AggregatorV3Interface priceFeed;
        uint256 heartbeat; // Maximum time between updates (in seconds)
        bool isActive;
        uint8 decimals;
    }
    
    // Mapping from token address to price feed data
    mapping(address => PriceFeedData) public priceFeeds;
    
    // List of supported tokens
    address[] public supportedTokens;
    mapping(address => bool) public tokenSupported;
    
    // Price staleness threshold (default 1 hour)
    uint256 public defaultHeartbeat = 3600;
    
    // Events
    event PriceFeedAdded(address indexed token, address indexed priceFeed, uint256 heartbeat);
    event PriceFeedUpdated(address indexed token, address indexed priceFeed, uint256 heartbeat);
    event PriceFeedRemoved(address indexed token);
    event HeartbeatUpdated(address indexed token, uint256 oldHeartbeat, uint256 newHeartbeat);
    event DefaultHeartbeatUpdated(uint256 oldHeartbeat, uint256 newHeartbeat);
    
    // Custom errors
    error TokenNotSupported(address token);
    error PriceFeedNotActive(address token);
    error StalePrice(address token, uint256 updatedAt, uint256 threshold);
    error InvalidPriceData(address token, int256 price);
    error InvalidHeartbeat(uint256 heartbeat);
    error PriceFeedAlreadyExists(address token);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Add a new price feed for a token
     * @param token The token address
     * @param priceFeedAddress The Chainlink price feed address
     * @param heartbeat Maximum time between updates (0 = use default)
     */
    function addPriceFeed(
        address token,
        address priceFeedAddress,
        uint256 heartbeat
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(priceFeedAddress != address(0), "Invalid price feed address");
        
        if (tokenSupported[token]) {
            revert PriceFeedAlreadyExists(token);
        }
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeedAddress);
        
        // Validate the price feed by calling it
        try priceFeed.latestRoundData() returns (uint80, int256 price, uint256, uint256 updatedAt, uint80) {
            require(price > 0, "Invalid price from feed");
            require(updatedAt > 0, "Invalid timestamp from feed");
        } catch {
            revert("Price feed validation failed");
        }
        
        uint8 decimals = priceFeed.decimals();
        uint256 finalHeartbeat = heartbeat == 0 ? defaultHeartbeat : heartbeat;
        
        priceFeeds[token] = PriceFeedData({
            priceFeed: priceFeed,
            heartbeat: finalHeartbeat,
            isActive: true,
            decimals: decimals
        });
        
        tokenSupported[token] = true;
        supportedTokens.push(token);
        
        emit PriceFeedAdded(token, priceFeedAddress, finalHeartbeat);
    }
    
    /**
     * @dev Update an existing price feed
     * @param token The token address
     * @param priceFeedAddress The new Chainlink price feed address
     * @param heartbeat New heartbeat (0 = keep current)
     */
    function updatePriceFeed(
        address token,
        address priceFeedAddress,
        uint256 heartbeat
    ) external onlyOwner {
        if (!tokenSupported[token]) {
            revert TokenNotSupported(token);
        }
        
        require(priceFeedAddress != address(0), "Invalid price feed address");
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeedAddress);
        
        // Validate the new price feed
        try priceFeed.latestRoundData() returns (uint80, int256 price, uint256, uint256 updatedAt, uint80) {
            require(price > 0, "Invalid price from feed");
            require(updatedAt > 0, "Invalid timestamp from feed");
        } catch {
            revert("Price feed validation failed");
        }
        
        PriceFeedData storage feedData = priceFeeds[token];
        uint256 oldHeartbeat = feedData.heartbeat;
        
        feedData.priceFeed = priceFeed;
        feedData.decimals = priceFeed.decimals();
        
        if (heartbeat > 0) {
            feedData.heartbeat = heartbeat;
            emit HeartbeatUpdated(token, oldHeartbeat, heartbeat);
        }
        
        emit PriceFeedUpdated(token, priceFeedAddress, feedData.heartbeat);
    }
    
    /**
     * @dev Remove a price feed for a token
     * @param token The token address
     */
    function removePriceFeed(address token) external onlyOwner {
        if (!tokenSupported[token]) {
            revert TokenNotSupported(token);
        }
        
        delete priceFeeds[token];
        tokenSupported[token] = false;
        
        // Remove from supported tokens array
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == token) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }
        
        emit PriceFeedRemoved(token);
    }
    
    /**
     * @dev Toggle active status for a price feed
     * @param token The token address
     * @param isActive New active status
     */
    function setPriceFeedActive(address token, bool isActive) external onlyOwner {
        if (!tokenSupported[token]) {
            revert TokenNotSupported(token);
        }
        
        priceFeeds[token].isActive = isActive;
    }
    
    /**
     * @dev Update heartbeat for a specific token
     * @param token The token address
     * @param newHeartbeat New heartbeat in seconds
     */
    function updateHeartbeat(address token, uint256 newHeartbeat) external onlyOwner {
        if (!tokenSupported[token]) {
            revert TokenNotSupported(token);
        }
        
        if (newHeartbeat == 0) {
            revert InvalidHeartbeat(newHeartbeat);
        }
        
        uint256 oldHeartbeat = priceFeeds[token].heartbeat;
        priceFeeds[token].heartbeat = newHeartbeat;
        
        emit HeartbeatUpdated(token, oldHeartbeat, newHeartbeat);
    }
    
    /**
     * @dev Update default heartbeat for new feeds
     * @param newDefaultHeartbeat New default heartbeat in seconds
     */
    function updateDefaultHeartbeat(uint256 newDefaultHeartbeat) external onlyOwner {
        if (newDefaultHeartbeat == 0) {
            revert InvalidHeartbeat(newDefaultHeartbeat);
        }
        
        uint256 oldHeartbeat = defaultHeartbeat;
        defaultHeartbeat = newDefaultHeartbeat;
        
        emit DefaultHeartbeatUpdated(oldHeartbeat, newDefaultHeartbeat);
    }
    
    /**
     * @dev Get the latest price for a token
     * @param token The token address
     * @return price The latest price
     * @return decimals Number of decimals in the price
     * @return updatedAt Timestamp of last update
     */
    function getLatestPrice(address token) external view whenNotPaused returns (
        int256 price,
        uint8 decimals,
        uint256 updatedAt
    ) {
        if (!tokenSupported[token]) {
            revert TokenNotSupported(token);
        }
        
        PriceFeedData storage feedData = priceFeeds[token];
        
        if (!feedData.isActive) {
            revert PriceFeedNotActive(token);
        }
        
        (
            uint80 roundId,
            int256 priceFromFeed,
            uint256 startedAt,
            uint256 updatedAtFromFeed,
            uint80 answeredInRound
        ) = feedData.priceFeed.latestRoundData();
        
        // Validate price data
        if (priceFromFeed <= 0) {
            revert InvalidPriceData(token, priceFromFeed);
        }
        
        // Check if price is stale
        if (block.timestamp - updatedAtFromFeed > feedData.heartbeat) {
            revert StalePrice(token, updatedAtFromFeed, feedData.heartbeat);
        }
        
        return (priceFromFeed, feedData.decimals, updatedAtFromFeed);
    }
    
    /**
     * @dev Get price with staleness check disabled (use with caution)
     * @param token The token address
     * @return price The latest price
     * @return decimals Number of decimals in the price
     * @return updatedAt Timestamp of last update
     * @return isStale Whether the price is considered stale
     */
    function getLatestPriceUnsafe(address token) external view returns (
        int256 price,
        uint8 decimals,
        uint256 updatedAt,
        bool isStale
    ) {
        if (!tokenSupported[token]) {
            revert TokenNotSupported(token);
        }
        
        PriceFeedData storage feedData = priceFeeds[token];
        
        if (!feedData.isActive) {
            revert PriceFeedNotActive(token);
        }
        
        (
            ,
            int256 priceFromFeed,
            ,
            uint256 updatedAtFromFeed,
            
        ) = feedData.priceFeed.latestRoundData();
        
        if (priceFromFeed <= 0) {
            revert InvalidPriceData(token, priceFromFeed);
        }
        
        bool priceIsStale = block.timestamp - updatedAtFromFeed > feedData.heartbeat;
        
        return (priceFromFeed, feedData.decimals, updatedAtFromFeed, priceIsStale);
    }
    
    /**
     * @dev Convert an amount from one token to another using current prices
     * @param fromToken The source token
     * @param toToken The destination token
     * @param amount The amount to convert
     * @return convertedAmount The converted amount
     */
    function convertTokenAmount(
        address fromToken,
        address toToken,
        uint256 amount
    ) external view whenNotPaused returns (uint256 convertedAmount) {
        (int256 fromPrice, uint8 fromDecimals,) = this.getLatestPrice(fromToken);
        (int256 toPrice, uint8 toDecimals,) = this.getLatestPrice(toToken);
        
        // Convert to common base (18 decimals)
        uint256 fromPriceNormalized = uint256(fromPrice) * (10 ** (18 - fromDecimals));
        uint256 toPriceNormalized = uint256(toPrice) * (10 ** (18 - toDecimals));
        
        // Calculate conversion
        convertedAmount = (amount * fromPriceNormalized) / toPriceNormalized;
    }
    
    /**
     * @dev Get price feed information for a token
     * @param token The token address
     * @return priceFeedAddress The price feed contract address
     * @return heartbeat The heartbeat in seconds
     * @return isActive Whether the feed is active
     * @return decimals Number of decimals
     */
    function getPriceFeedInfo(address token) external view returns (
        address priceFeedAddress,
        uint256 heartbeat,
        bool isActive,
        uint8 decimals
    ) {
        if (!tokenSupported[token]) {
            revert TokenNotSupported(token);
        }
        
        PriceFeedData storage feedData = priceFeeds[token];
        return (
            address(feedData.priceFeed),
            feedData.heartbeat,
            feedData.isActive,
            feedData.decimals
        );
    }
    
    /**
     * @dev Get all supported tokens
     * @return Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    
    /**
     * @dev Check if a token is supported
     * @param token The token address to check
     * @return Whether the token is supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return tokenSupported[token];
    }
    
    /**
     * @dev Get the number of supported tokens
     * @return Number of supported tokens
     */
    function getSupportedTokenCount() external view returns (uint256) {
        return supportedTokens.length;
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