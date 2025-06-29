require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { ethers } = require('ethers');
const winston = require('winston');
const axios = require('axios');
const { createFhevmInstance } = require('fhevmjs/node');
const { getViemChain, supportedChains } = require('@inco/js');
const { Lightning } = require('@inco/js/lite');
const { createWalletClient, createPublicClient, http, getAddress } = require('viem');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'dgmarket-backend' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Initialize Express app
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Contract ABIs - Updated to match the new contract structure
const chainlinkGiftCardManagerABI = require('./abis/ChainlinkGiftCardManager.json');
const confidentialGiftCardABI = require('./abis/ConfidentialGiftCard.json');

// Environment variables
const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.RPC_URL || process.env.BASE_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.PRIVATE_KEY_BASE_SEPOLIA;
const CHAINLINK_MANAGER_ADDRESS = process.env.CHAINLINK_MANAGER_ADDRESS || process.env.CHAINLINK_GIFTCARD_MANAGER_ADDRESS;
const CONFIDENTIAL_GIFTCARD_ADDRESS = process.env.CONFIDENTIAL_GIFTCARD_ADDRESS || process.env.GIFT_CARD_ADDRESS;
const GIFT_CARD_API_URL = process.env.GIFT_CARD_API_URL || 'http://localhost:8081';
const INCO_GATEWAY_URL = process.env.INCO_GATEWAY_URL;

// Validate required environment variables
if (!RPC_URL) {
  logger.error('RPC_URL is required');
  process.exit(1);
}
if (!PRIVATE_KEY) {
  logger.error('PRIVATE_KEY is required');
  process.exit(1);
}
if (!CHAINLINK_MANAGER_ADDRESS) {
  logger.error('CHAINLINK_MANAGER_ADDRESS is required');
  process.exit(1);
}
if (!CONFIDENTIAL_GIFTCARD_ADDRESS) {
  logger.error('CONFIDENTIAL_GIFTCARD_ADDRESS is required');
  process.exit(1);
}

// Initialize provider and wallet
let provider;
let wallet;
let chainlinkManager;
let giftCardContract;

// Track processed requests to avoid duplicates
const processedRequests = new Set();

// Mock gift card data organized by categories
const mockGiftCards = {
  "Food & Dining": [
    {
      value: 25,
      description: "McDonald's $25 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=McDonald%27s+$25",
      expiryDate: 0,
      code: "MCD25-ABCD-1234"
    },
    {
      value: 50,
      description: "Starbucks $50 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Starbucks+$50",
      expiryDate: 0,
      code: "SBX50-EFGH-5678"
    },
    {
      value: 100,
      description: "Uber Eats $100 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Uber+Eats+$100",
      expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
      code: "UBE100-IJKL-9012"
    },
    {
      value: 75,
      description: "DoorDash $75 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=DoorDash+$75",
      expiryDate: 0,
      code: "DD75-MNOP-3456"
    }
  ],
  "Shopping": [
    {
      value: 100,
      description: "Amazon $100 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Amazon+$100",
      expiryDate: 0,
      code: "AMZ100-QRST-7890"
    },
    {
      value: 50,
      description: "Target $50 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Target+$50",
      expiryDate: 0,
      code: "TGT50-UVWX-1234"
    },
    {
      value: 200,
      description: "Best Buy $200 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Best+Buy+$200",
      expiryDate: Math.floor(Date.now() / 1000) + (730 * 24 * 60 * 60), // 2 years from now
      code: "BBY200-YZAB-5678"
    },
    {
      value: 25,
      description: "Walmart $25 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Walmart+$25",
      expiryDate: 0,
      code: "WMT25-CDEF-9012"
    }
  ],
  "Entertainment": [
    {
      value: 15,
      description: "Netflix $15 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Netflix+$15",
      expiryDate: 0,
      code: "NFX15-GHIJ-3456"
    },
    {
      value: 25,
      description: "Spotify $25 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Spotify+$25",
      expiryDate: 0,
      code: "SPT25-KLMN-7890"
    },
    {
      value: 50,
      description: "Apple iTunes $50 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=iTunes+$50",
      expiryDate: 0,
      code: "ITN50-OPQR-1234"
    },
    {
      value: 20,
      description: "Google Play $20 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Google+Play+$20",
      expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
      code: "GPL20-STUV-5678"
    }
  ],
  "Travel": [
    {
      value: 500,
      description: "Airbnb $500 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Airbnb+$500",
      expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
      code: "ABB500-WXYZ-9012"
    },
    {
      value: 250,
      description: "Southwest Airlines $250 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Southwest+$250",
      expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
      code: "SWA250-ABCD-3456"
    },
    {
      value: 100,
      description: "Uber $100 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Uber+$100",
      expiryDate: 0,
      code: "UBR100-EFGH-7890"
    }
  ],
  "Gaming": [
    {
      value: 20,
      description: "Steam $20 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Steam+$20",
      expiryDate: 0,
      code: "STM20-IJKL-1234"
    },
    {
      value: 50,
      description: "PlayStation Store $50 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=PlayStation+$50",
      expiryDate: 0,
      code: "PSN50-MNOP-5678"
    },
    {
      value: 25,
      description: "Xbox $25 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Xbox+$25",
      expiryDate: 0,
      code: "XBX25-QRST-9012"
    },
    {
      value: 100,
      description: "Nintendo eShop $100 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Nintendo+$100",
      expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
      code: "NIN100-UVWX-3456"
    }
  ]
};

// Helper function to get random cards from a category
function getRandomCardsFromCategory(category, count = 2) {
  const categoryCards = mockGiftCards[category];
  if (!categoryCards || categoryCards.length === 0) {
    return [];
  }
  
  // If count is greater than available cards, return all cards
  if (count >= categoryCards.length) {
    return [...categoryCards];
  }
  
  // Randomly select 'count' cards
  const selectedCards = [];
  const availableIndices = Array.from({ length: categoryCards.length }, (_, i) => i);
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    const cardIndex = availableIndices.splice(randomIndex, 1)[0];
    selectedCards.push(categoryCards[cardIndex]);
  }
  
  return selectedCards;
}

// Get Inco Lightning configuration
function getIncoConfig() {
  // Use Base Sepolia for our implementation
  return Lightning.latest('testnet', 84532); // Base Sepolia chainId
}

// Function to encrypt gift card value using Inco Lightning
async function encryptGiftCardValue(value) {
  try {
    logger.info('Encrypting gift card value using latest Inco Lightning SDK', { value });
    
    const valueBigInt = BigInt(value);
    const checksummedAddress = getAddress(CONFIDENTIAL_GIFTCARD_ADDRESS);
    
    // Get Inco Lightning configuration
    const incoConfig = getIncoConfig();
    
    // Create a wallet client compatible with Inco Lightning
    const walletClient = {
      account: { address: wallet.address },
      async signMessage({ message }) { return wallet.signMessage(message); }
    };
    
    // Encrypt the value
    const encryptedData = await incoConfig.encrypt(valueBigInt, {
      accountAddress: wallet.address,
      dappAddress: checksummedAddress,
    });
    
    logger.info('Successfully encrypted gift card value');
    return encryptedData;
  } catch (error) {
    logger.error('Failed to encrypt gift card value', { error: error.message });
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// Initialize blockchain connection
async function initBlockchain() {
  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    chainlinkManager = new ethers.Contract(
      CHAINLINK_MANAGER_ADDRESS,
      chainlinkGiftCardManagerABI,
      wallet
    );
    
    giftCardContract = new ethers.Contract(
      CONFIDENTIAL_GIFTCARD_ADDRESS,
      confidentialGiftCardABI,
      wallet
    );
    
    // Test connection
    const network = await provider.getNetwork();
    const balance = await wallet.provider.getBalance(wallet.address);
    
    logger.info('Blockchain connection initialized', {
      network: network.name,
      chainId: network.chainId.toString(),
      walletAddress: wallet.address,
      balance: ethers.formatEther(balance),
      chainlinkManagerAddress: CHAINLINK_MANAGER_ADDRESS,
      confidentialGiftCardAddress: CONFIDENTIAL_GIFTCARD_ADDRESS
    });
  } catch (error) {
    logger.error('Failed to initialize blockchain connection', { error: error.message });
    process.exit(1);
  }
}

// Event listeners for Chainlink Function requests
async function setupEventListeners() {
  try {
    // Listen for RestockRequested events
    chainlinkManager.on('RestockRequested', async (requestId, category, event) => {
      logger.info('Restock requested', { 
        requestId: requestId.toString(), 
        category,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });
    });
    
    // Listen for RestockFulfilled events - This is the key event we need to process
    chainlinkManager.on('RestockFulfilled', async (requestId, category, response, event) => {
      const requestIdStr = requestId.toString();
      
      logger.info('Restock fulfilled event received', { 
        requestId: requestIdStr, 
        category,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });
      
      // Avoid processing the same request twice
      if (processedRequests.has(requestIdStr)) {
        logger.warn('Request already processed, skipping', { requestId: requestIdStr });
        return;
      }
      
      try {
        processedRequests.add(requestIdStr);
        await processRestockFulfilled(requestIdStr, category, response);
      } catch (error) {
        logger.error('Error processing restock fulfilled event', { 
          requestId: requestIdStr, 
          category, 
          error: error.message 
        });
        // Remove from processed set so we can retry
        processedRequests.delete(requestIdStr);
      }
    });
    
    // Listen for GiftCardAdded events to track successful additions
    chainlinkManager.on('GiftCardAdded', async (cardId, category, creator, event) => {
      logger.info('Gift card added successfully', {
        cardId: cardId.toString(),
        category,
        creator,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });
    });
    
    logger.info('Event listeners set up successfully');
  } catch (error) {
    logger.error('Failed to set up event listeners', { error: error.message });
  }
}

// Process RestockFulfilled event
async function processRestockFulfilled(requestId, category, responseData) {
  try {
    // Check if we've already processed this request
    const requestIdStr = requestId.toString();
    if (processedRequests.has(requestIdStr)) {
      logger.info('Request already processed, skipping', { requestId: requestIdStr });
      return;
    }
    
    // Parse the response data
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
      logger.info('Parsed response data', { 
        requestId: requestIdStr, 
        category,
        success: parsedData.success,
        cardCount: parsedData.cards?.length || 0
      });
    } catch (error) {
      logger.error('Failed to parse response data', { 
        requestId: requestIdStr, 
        error: error.message, 
        responseData 
      });
      return;
    }
    
    // Validate the response
    if (!parsedData.success || !parsedData.cards || parsedData.cards.length === 0) {
      logger.warn('Invalid or empty response data', { 
        requestId: requestIdStr, 
        success: parsedData.success, 
        hasCards: !!parsedData.cards, 
        cardCount: parsedData.cards?.length || 0 
      });
      return;
    }
    
    // Process each card in the response
    for (let i = 0; i < parsedData.cards.length; i++) {
      const card = parsedData.cards[i];
      await addGiftCardToContract(card, category, requestIdStr, i);
    }
    
    // Mark request as processed
    processedRequests.add(requestIdStr);
    logger.info('Request processed successfully', { 
      requestId: requestIdStr, 
      category, 
      cardCount: parsedData.cards.length 
    });
  } catch (error) {
    logger.error('Error processing restock fulfilled event', { 
      requestId: requestId.toString(), 
      category, 
      error: error.message 
    });
  }
}

// Add gift card to contract
async function addGiftCardToContract(card, category, requestId, cardIndex) {
  try {
    // Validate card data
    if (!card.value || !card.description || !card.code) {
      logger.warn('Invalid card data', { 
        requestId, 
        cardIndex, 
        hasValue: !!card.value, 
        hasDescription: !!card.description, 
        hasCode: !!card.code 
      });
      return;
    }
    
    // Encrypt the card value using Inco Lightning
    const encryptedValue = await encryptGiftCardValue(card.value);
    
    // Prepare transaction parameters
    const expiryDate = card.expiryDate || 0;
    
    logger.info('Adding gift card to contract', { 
      requestId, 
      category, 
      description: card.description, 
      expiryDate 
    });
    
    // Call the backendAddGiftCard function on the ChainlinkGiftCardManager contract
    const tx = await chainlinkManager.backendAddGiftCard(
      encryptedValue,
      card.description,
      card.imageUrl || "",
      expiryDate,
      category
    );
    
    const receipt = await tx.wait();
    
    logger.info('Gift card added successfully', { 
      requestId, 
      category, 
      txHash: tx.hash, 
      blockNumber: receipt.blockNumber 
    });
    
    return receipt;
  } catch (error) {
    logger.error('Failed to add gift card to contract', { 
      requestId, 
      category, 
      cardIndex, 
      error: error.message 
    });
    throw error;
  }
}

// API route for gift card restocking
app.get('/api/restock', async (req, res) => {
  try {
    const { category } = req.query;
    
    // Default to Gaming if no category specified
    const targetCategory = category || 'Gaming';
    
    if (!mockGiftCards[targetCategory]) {
      return res.status(404).json({
        error: 'Category not found',
        availableCategories: Object.keys(mockGiftCards)
      });
    }
    
    // Get 2 random cards from the category
    const cards = getRandomCardsFromCategory(targetCategory, 2);
    
    // Log the request
    logger.info('Restock request received', { 
      category: targetCategory, 
      cardCount: cards.length 
    });
    
    // Return the cards in the format expected by the Chainlink function
    res.status(200).json({
      success: true,
      category: targetCategory,
      timestamp: Math.floor(Date.now() / 1000),
      cards: cards
    });
  } catch (error) {
    logger.error('Error processing restock request', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual function to test API connectivity
async function testGiftCardAPI(category = 'Gaming') {
  try {
    logger.info('Testing gift card API connectivity', { category });
    
    const response = await axios.get(`${GIFT_CARD_API_URL}/restock`, {
      params: { category },
      timeout: 10000
    });
    
    logger.info('API test successful', { 
      category,
      status: response.status,
      cardsReceived: response.data.cards?.length || 0
    });
    
    return response.data;
  } catch (error) {
    logger.error('API test failed', { 
      category,
      error: error.message,
      url: `${GIFT_CARD_API_URL}/restock?category=${category}`
    });
    throw error;
  }
}

// API routes
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DG Market Backend',
    contracts: {
      chainlinkManager: CHAINLINK_MANAGER_ADDRESS,
      confidentialGiftCard: CONFIDENTIAL_GIFTCARD_ADDRESS
    },
    processedRequests: processedRequests.size
  });
});

// Manual restock endpoint
app.post('/api/restock', async (req, res) => {
  try {
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    
    logger.info('Manual restock initiated', { category });
    
    const tx = await chainlinkManager.manualRestock(category);
    const receipt = await tx.wait();
    
    logger.info('Manual restock completed', { 
      category,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Manual restock request initiated',
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      category
    });
  } catch (error) {
    logger.error('Failed to initiate manual restock', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to initiate restock',
      message: error.message
    });
  }
});

// Test API connectivity endpoint
app.get('/api/test-api/:category?', async (req, res) => {
  try {
    const category = req.params.category || 'Gaming';
    const result = await testGiftCardAPI(category);
    
    res.status(200).json({
      success: true,
      category,
      apiResponse: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      category: req.params.category || 'Gaming'
    });
  }
});

// Get contract info
app.get('/api/contracts', async (req, res) => {
  try {
    const network = await provider.getNetwork();
    const balance = await wallet.provider.getBalance(wallet.address);
    
    res.status(200).json({
      network: {
        name: network.name,
        chainId: network.chainId.toString()
      },
      wallet: {
        address: wallet.address,
        balance: ethers.formatEther(balance)
      },
      contracts: {
        chainlinkManager: CHAINLINK_MANAGER_ADDRESS,
        confidentialGiftCard: CONFIDENTIAL_GIFTCARD_ADDRESS
      },
      processedRequests: processedRequests.size
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get contract info',
      message: error.message
    });
  }
});

// Get processed requests
app.get('/api/processed-requests', (req, res) => {
  res.status(200).json({
    processedRequests: Array.from(processedRequests),
    count: processedRequests.size
  });
});

// Clear processed requests (for testing)
app.post('/api/clear-processed', (req, res) => {
  const count = processedRequests.size;
  processedRequests.clear();
  
  logger.info('Cleared processed requests', { count });
  
  res.status(200).json({
    success: true,
    message: `Cleared ${count} processed requests`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start the server
async function startServer() {
  try {
    await initBlockchain();
    await setupEventListeners();
    
    // Test API connectivity on startup
    try {
      await testGiftCardAPI('Gaming');
      logger.info('Gift card API connectivity test passed');
    } catch (error) {
      logger.warn('Gift card API connectivity test failed - service will continue but restocking may not work', {
        error: error.message,
        apiUrl: GIFT_CARD_API_URL
      });
    }
    
    app.listen(PORT, () => {
      logger.info(`DG Market Backend server running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        apiUrl: GIFT_CARD_API_URL,
        endpoints: {
          health: `http://localhost:${PORT}/health`,
          contracts: `http://localhost:${PORT}/api/contracts`,
          manualRestock: `http://localhost:${PORT}/api/restock`,
          testApi: `http://localhost:${PORT}/api/test-api/:category`
        }
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();