require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { ethers } = require('ethers');
const winston = require('winston');
const axios = require('axios');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
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

// Contract ABIs
const chainlinkGiftCardManagerABI = require('./abis/ChainlinkGiftCardManager.json');
const confidentialGiftCardABI = require('./abis/ConfidentialGiftCard.json');

// Environment variables
const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CHAINLINK_MANAGER_ADDRESS = process.env.CHAINLINK_MANAGER_ADDRESS;
const GIFT_CARD_ADDRESS = process.env.GIFT_CARD_ADDRESS;

// Initialize provider and wallet
let provider;
let wallet;
let chainlinkManager;
let giftCardContract;

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
      GIFT_CARD_ADDRESS,
      confidentialGiftCardABI,
      wallet
    );
    
    logger.info('Blockchain connection initialized');
  } catch (error) {
    logger.error('Failed to initialize blockchain connection', { error: error.message });
    process.exit(1);
  }
}

// Event listeners for Chainlink Function requests
async function setupEventListeners() {
  try {
    // Listen for RestockRequested events
    chainlinkManager.on('RestockRequested', async (requestId, category) => {
      logger.info('Restock requested', { requestId, category });
      
      try {
        // Call the gift card API to get new cards
        await processRestockRequest(requestId, category);
      } catch (error) {
        logger.error('Error processing restock request', { 
          requestId, 
          category, 
          error: error.message 
        });
      }
    });
    
    logger.info('Event listeners set up');
  } catch (error) {
    logger.error('Failed to set up event listeners', { error: error.message });
  }
}

// Process restock request
async function processRestockRequest(requestId, category) {
  try {
    // Call external API to get gift card data
    const response = await axios.get(`${process.env.GIFT_CARD_API_URL}/api/giftcards`, {
      params: { category }
    });
    
    if (!response.data || !response.data.cards || response.data.cards.length === 0) {
      logger.warn('No gift cards returned from API', { category });
      return;
    }
    
    // Process each gift card
    for (const card of response.data.cards) {
      try {
        // Encrypt the gift card value (in a real implementation, this would use proper encryption)
        // Here we're just simulating the encrypted value
        const encryptedValue = ethers.toUtf8Bytes(JSON.stringify({ value: card.value }));
        
        // Add the gift card to the contract
        const tx = await chainlinkManager.backendAddGiftCard(
          encryptedValue,
          card.description,
          card.imageUrl,
          card.expiryDate || 0,
          category
        );
        
        await tx.wait();
        logger.info('Gift card added', { 
          category, 
          description: card.description,
          txHash: tx.hash 
        });
      } catch (error) {
        logger.error('Failed to add gift card', { 
          category, 
          error: error.message 
        });
      }
    }
  } catch (error) {
    logger.error('Failed to process restock request', { 
      requestId, 
      category, 
      error: error.message 
    });
  }
}

// API routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Manual restock endpoint
app.post('/api/restock', async (req, res) => {
  try {
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    
    const tx = await chainlinkManager.requestRestockFromAPI(category);
    await tx.wait();
    
    res.status(200).json({ 
      success: true, 
      message: 'Restock request initiated',
      txHash: tx.hash
    });
  } catch (error) {
    logger.error('Failed to initiate restock', { error: error.message });
    res.status(500).json({ error: 'Failed to initiate restock' });
  }
});

// Start the server
async function startServer() {
  try {
    await initBlockchain();
    await setupEventListeners();
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();
