require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { ethers } = require('ethers');
const winston = require('winston');
const axios = require('axios');

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

// Environment variables
const PORT = process.env.PORT || 8081;
const RPC_URL = process.env.RPC_URL || process.env.BASE_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.PRIVATE_KEY_BASE_SEPOLIA;
const CHAINLINK_MANAGER_ADDRESS = process.env.CHAINLINK_MANAGER_ADDRESS || process.env.CHAINLINK_GIFTCARD_MANAGER_ADDRESS;
const CONFIDENTIAL_GIFTCARD_ADDRESS = process.env.CONFIDENTIAL_GIFTCARD_ADDRESS || process.env.GIFT_CARD_ADDRESS;

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
      code: "MCD25-ABCD-1234-XYZW"
    },
    {
      value: 50,
      description: "Starbucks $50 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Starbucks+$50",
      expiryDate: 0,
      code: "SBX50-EFGH-5678-UVWX"
    }
  ],
  "Shopping": [
    {
      value: 100,
      description: "Amazon $100 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Amazon+$100",
      expiryDate: 0,
      code: "AMZ100-QRST-7890-PQRS"
    },
    {
      value: 50,
      description: "Target $50 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Target+$50",
      expiryDate: 0,
      code: "TGT50-UVWX-1234-TUVW"
    }
  ],
  "Gaming": [
    {
      value: 20,
      description: "Steam $20 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=Steam+$20",
      expiryDate: 0,
      code: "STM20-IJKL-1234-HIJK"
    },
    {
      value: 50,
      description: "PlayStation Store $50 Gift Card",
      imageUrl: "https://via.placeholder.com/300x200?text=PlayStation+$50",
      expiryDate: 0,
      code: "PSN50-MNOP-5678-LMNO"
    }
  ]
};

// Helper function to get random cards from a category
function getRandomCardsFromCategory(category, count = 2) {
  const categoryCards = mockGiftCards[category];
  if (!categoryCards || categoryCards.length === 0) {
    return [];
  }
  
  if (count >= categoryCards.length) {
    return [...categoryCards];
  }
  
  const selectedCards = [];
  const availableIndices = Array.from({ length: categoryCards.length }, (_, i) => i);
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    const cardIndex = availableIndices.splice(randomIndex, 1)[0];
    selectedCards.push(categoryCards[cardIndex]);
  }
  
  return selectedCards;
}

// Simple mock encryption for testing (replace with Inco Lightning later)
function mockEncryptGiftCardCode(code) {
  try {
    logger.info('Mock encrypting gift card voucher code', { codeLength: code.length });
    
    // Simple encoding for testing purposes
    const timestamp = Date.now();
    const mockEncrypted = Buffer.from(`MOCK_ENCRYPTED_${code}_${timestamp}`);
    const hexEncrypted = `0x${mockEncrypted.toString('hex')}`;
    
    logger.info('Successfully mock encrypted gift card voucher code');
    return hexEncrypted;
  } catch (error) {
    logger.error('Failed to mock encrypt gift card voucher code', { error: error.message });
    throw new Error(`Mock encryption failed: ${error.message}`);
  }
}

// Initialize blockchain connection (optional for testing)
async function initBlockchain() {
  try {
    if (!RPC_URL || !PRIVATE_KEY) {
      logger.warn('Blockchain credentials not provided, running in API-only mode');
      return false;
    }
    
    provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Test connection
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(wallet.address);
    
    logger.info('Blockchain connection initialized', {
      network: network.name,
      chainId: network.chainId.toString(),
      walletAddress: wallet.address,
      balance: ethers.utils.formatEther(balance)
    });
    
    return true;
  } catch (error) {
    logger.warn('Failed to initialize blockchain connection, running in API-only mode', { 
      error: error.message 
    });
    return false;
  }
}

// API routes
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'DG Market Backend API - Simple Version',
    timestamp: new Date().toISOString(),
    mode: 'Mock Encryption (Testing)',
    features: [
      'Public gift card prices',
      'Mock encrypted voucher codes',
      'API-first design',
      'Automated inventory simulation'
    ],
    endpoints: {
      health: '/health',
      restock: '/api/restock',
      testApi: '/api/test-api/:category'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DG Market Backend',
    version: '2.0 - Simple Mock Version',
    mode: 'Mock Encryption',
    blockchain: {
      connected: !!(provider && wallet),
      rpcUrl: RPC_URL ? 'configured' : 'not configured'
    },
    processedRequests: processedRequests.size
  });
});

// Test API connectivity endpoint
app.get('/api/test-api/:category?', async (req, res) => {
  try {
    const category = req.params.category || 'Gaming';
    const result = await testGiftCardAPI(category);
    
    res.status(200).json({
      success: true,
      category,
      apiResponse: result,
      mode: 'Mock Encryption',
      note: 'Cards have public prices and mock encrypted voucher codes'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      category: req.params.category || 'Gaming'
    });
  }
});

// API route for gift card restocking
app.get('/api/restock', async (req, res) => {
  try {
    const { category } = req.query;
    
    const targetCategory = category || 'Gaming';
    
    if (!mockGiftCards[targetCategory]) {
      return res.status(404).json({
        error: 'Category not found',
        availableCategories: Object.keys(mockGiftCards)
      });
    }
    
    const cards = getRandomCardsFromCategory(targetCategory, 2);
    
    // Mock encrypt the codes for demonstration
    const cardsWithEncryptedCodes = cards.map(card => ({
      ...card,
      originalCode: card.code, // Keep for reference
      encryptedCode: mockEncryptGiftCardCode(card.code)
    }));
    
    logger.info('Restock request received', { 
      category: targetCategory, 
      cardCount: cards.length,
      note: 'Cards have public prices and mock encrypted codes'
    });
    
    res.status(200).json({
      success: true,
      category: targetCategory,
      timestamp: Math.floor(Date.now() / 1000),
      cards: cardsWithEncryptedCodes,
      mode: 'Mock Encryption',
      note: 'Voucher codes are mock encrypted for testing'
    });
  } catch (error) {
    logger.error('Error processing restock request', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test encryption endpoint
app.post('/api/test-encryption', (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    const encrypted = mockEncryptGiftCardCode(code);
    
    res.status(200).json({
      success: true,
      originalCode: code,
      encryptedCode: encrypted,
      mode: 'Mock Encryption',
      note: 'This is a simple mock encryption for testing'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available categories
app.get('/api/categories', (req, res) => {
  res.status(200).json({
    success: true,
    categories: Object.keys(mockGiftCards),
    counts: Object.fromEntries(
      Object.entries(mockGiftCards).map(([key, value]) => [key, value.length])
    )
  });
});

// Manual function to test API connectivity
async function testGiftCardAPI(category = 'Gaming') {
  try {
    logger.info('Testing gift card API connectivity', { category });
    
    const cards = getRandomCardsFromCategory(category, 2);
    const mockResponse = {
      success: true,
      category: category,
      timestamp: Math.floor(Date.now() / 1000),
      cards: cards.map(card => ({
        ...card,
        encryptedCode: mockEncryptGiftCardCode(card.code)
      })),
      mode: 'Mock Encryption',
      note: 'API test successful with mock encryption'
    };
    
    logger.info('API test successful', { 
      category,
      cardsReceived: mockResponse.cards?.length || 0
    });
    
    return mockResponse;
  } catch (error) {
    logger.error('API test failed', { 
      category,
      error: error.message
    });
    throw error;
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start the server
const server = app.listen(PORT, () => {
  const localApiUrl = `http://localhost:${PORT}`;
  logger.info(`DG Market Backend server running on port ${PORT}`, {
    apiUrl: localApiUrl,
    version: '2.0 - Simple Mock Version',
    mode: 'Mock Encryption (Testing)',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'Public gift card prices',
      'Mock encrypted voucher codes',
      'No external dependencies',
      'API-first testing design'
    ],
    endpoints: {
      root: `${localApiUrl}/`,
      health: `${localApiUrl}/health`,
      restock: `${localApiUrl}/api/restock?category=Gaming`,
      testApi: `${localApiUrl}/api/test-api/Gaming`,
      testEncryption: `${localApiUrl}/api/test-encryption`,
      categories: `${localApiUrl}/api/categories`
    }
  });
});

// Handle server startup errors
server.on('error', (error) => {
  logger.error('Server failed to start', { error: error.message });
  process.exit(1);
});

// Initialize (optional blockchain connection)
async function startServer() {
  try {
    const blockchainConnected = await initBlockchain();
    
    logger.info('Server startup completed', {
      apiServer: 'running',
      blockchain: blockchainConnected ? 'connected' : 'disabled',
      mode: 'Mock Encryption'
    });
    
    // Test API on startup
    try {
      await testGiftCardAPI('Gaming');
      logger.info('Startup API test passed');
    } catch (error) {
      logger.warn('Startup API test failed', { error: error.message });
    }
    
  } catch (error) {
    logger.error('Server startup error', { error: error.message });
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});