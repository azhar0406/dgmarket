// payment-processor-working.js
// Based on your exact working debug script pattern

const { ethers } = require('ethers');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const CryptoJS = require('crypto-js');

dotenv.config();

// Configuration - EXACT same as debug script that works
const CONFIG = {
    BASE_MAINNET_RPC: process.env.BASE_MAINNET_RPC || 'https://base.llamarpc.com',
    BASE_SEPOLIA_RPC: process.env.BASE_SEPOLIA_RPC || 'https://base-sepolia.api.onfinality.io/public',
    
    DGMARKET_CORE_SEPOLIA: '0xd9F2A41902524d20F12B3f2784d2F0962E0090cE',
    SIMPLE_BRIDGE_MAINNET: '0xF7cF8159C710eb23b81b9EA1EbA5Db91Dd0dd4Ba',
    ADMIN_ADDRESS: '0x6328d8Ad7A88526e35c9Dc730e65fF8fEE971c09',
    ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY,
    
    // OKX settings - EXACT same as debug script
    OKX_CHAIN_ID: '8453',
    USDC_BASE: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    ETH_ADDRESS: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    
    GAS_LIMITS: {
      purchaseOnBehalf: 300000,
      okxSwap: 240000,
      bridgeEvent: 100000
    }
};

class WorkingPaymentProcessor {
  constructor() {
    console.log('🚀 DGMarket Working Payment Processor');
    console.log(`📍 Admin Address: ${CONFIG.ADMIN_ADDRESS}`);
    console.log(`🎯 DGMarket Contract (Sepolia): ${CONFIG.DGMARKET_CORE_SEPOLIA}`);
    console.log(`🌉 Bridge Contract (Mainnet): ${CONFIG.SIMPLE_BRIDGE_MAINNET}`);
    
    // Initialize providers
    this.mainnetProvider = new ethers.JsonRpcProvider(CONFIG.BASE_MAINNET_RPC);
    this.sepoliaProvider = new ethers.JsonRpcProvider(CONFIG.BASE_SEPOLIA_RPC);
    
    // Initialize signers
    this.adminMainnetSigner = new ethers.Wallet(CONFIG.ADMIN_PRIVATE_KEY, this.mainnetProvider);
    this.adminSepoliaSigner = new ethers.Wallet(CONFIG.ADMIN_PRIVATE_KEY, this.sepoliaProvider);
    
    // Tracking processed transactions
    this.processedPayments = new Set();
    this.processingQueue = new Map();
  }

  // Initialize connections
  async initialize() {
    try {
      console.log(`📡 Connecting to Base Mainnet: ${CONFIG.BASE_MAINNET_RPC}`);
      const mainnetBlock = await this.mainnetProvider.getBlockNumber();
      console.log(`✅ Connected to Base Mainnet: Block ${mainnetBlock}`);
      
      console.log(`📡 Connecting to Base Sepolia: ${CONFIG.BASE_SEPOLIA_RPC}`);
      const sepoliaBlock = await this.sepoliaProvider.getBlockNumber();
      console.log(`✅ Connected to Base Sepolia: Block ${sepoliaBlock}`);
      
      const adminMainnetBalance = await this.mainnetProvider.getBalance(CONFIG.ADMIN_ADDRESS);
      const adminSepoliaBalance = await this.sepoliaProvider.getBalance(CONFIG.ADMIN_ADDRESS);
      
      console.log(`💰 Admin ETH Balance (Mainnet): ${ethers.formatEther(adminMainnetBalance)} ETH`);
      console.log(`💰 Admin ETH Balance (Sepolia): ${ethers.formatEther(adminSepoliaBalance)} ETH`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  // Process transaction - EXACT same pattern as debug script success
  async processTransactionHash(txHash, cardId, userAddress = null) {
    console.log(`\n🎯 API Processing: ${txHash}`);
    console.log(`📋 Card ID: ${cardId}`);
    console.log(`👤 User: ${userAddress || 'Auto-detect from transaction'}`);

    // Check for duplicates
    if (this.processedPayments.has(txHash)) {
      return { success: false, error: 'Transaction already processed', txHash, status: 'duplicate' };
    }

    if (this.processingQueue.has(txHash)) {
      return { success: false, error: 'Transaction currently being processed', txHash, status: 'in_progress' };
    }

    this.processingQueue.set(txHash, { status: 'processing', startTime: Date.now(), cardId, userAddress });

    try {
      // Step 1: Get and validate transaction from Base Mainnet
      console.log('🔍 Fetching transaction from Base Mainnet...');
      const tx = await this.mainnetProvider.getTransaction(txHash);
      
      if (!tx) {
        throw new Error('Transaction not found on Base Mainnet');
      }

      if (tx.to?.toLowerCase() !== CONFIG.ADMIN_ADDRESS.toLowerCase()) {
        throw new Error(`Transaction not sent to admin address. Sent to: ${tx.to}`);
      }

      if (tx.value <= 0n) {
        throw new Error('Transaction has no ETH value');
      }

      const ethAmount = ethers.formatEther(tx.value);
      const fromAddress = userAddress || tx.from;
      
      console.log(`✅ Transaction validated:`);
      console.log(`   From: ${fromAddress}`);
      console.log(`   Amount: ${ethAmount} ETH`);
      console.log(`   To: ${tx.to}`);
      console.log(`   Block: ${tx.blockNumber || 'Pending'}`);

      // Step 2: Wait for confirmation if needed
      if (!tx.blockNumber) {
        console.log('⏳ Transaction pending, waiting for confirmation...');
        const receipt = await this.mainnetProvider.waitForTransactionReceipt(txHash);
        if (receipt.status !== 1) {
          throw new Error('Transaction failed on Base Mainnet');
        }
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      }

      // Step 3: Execute OKX swap - FIXED: Use market rate, not fixed amount
      console.log('\n💰 Converting ETH to USDC via OKX DEX...');
      const swapResult = await this.executeOKXSwap(ethAmount);
      
      if (!swapResult.success) {
        throw new Error(`OKX swap failed: ${swapResult.error}`);
      }

      console.log(`✅ Swap successful: ${ethAmount} ETH → ${swapResult.usdcReceived} USDC`);

      // Step 4: Emit cross-chain event
      const eventData = {
        userAddress: fromAddress,
        cardId: parseInt(cardId),
        usdcAmount: parseFloat(swapResult.usdcReceived), // Use actual USDC received
        orderId: `api-${txHash.slice(-8)}-${Date.now()}`,
        timestamp: Date.now()
      };

      console.log('\n🌉 Emitting cross-chain event...');
      const bridgeResult = await this.emitCrossChainEvent(eventData, swapResult);

      // Step 5: Purchase gift card
      console.log('\n🎁 Purchasing gift card on Base Sepolia...');
      const purchaseResult = await this.purchaseGiftCardForUser(eventData);

      // Mark as processed
      this.processedPayments.add(txHash);
      this.processingQueue.delete(txHash);

      console.log(`\n🎉 COMPLETE SUCCESS!`);
      console.log(`✅ Transaction: ${txHash}`);
      console.log(`✅ Gift card ${cardId} assigned to ${fromAddress}`);

      return {
        success: true,
        txHash,
        cardId: parseInt(cardId),
        userAddress: fromAddress,
        ethAmount,
        swapResult,
        bridgeResult,
        purchaseResult,
        status: 'completed'
      };

    } catch (error) {
      console.error(`❌ Processing failed for ${txHash}:`, error);
      this.processingQueue.delete(txHash);
      
      return {
        success: false,
        error: error.message,
        txHash,
        cardId,
        userAddress,
        status: 'failed'
      };
    }
  }

  // Execute OKX swap - FIXED: Remove targetUSDC parameter
  async executeOKXSwap(ethAmount) {
    console.log(`🔄 OKX DEX Swap: ${ethAmount} ETH → USDC (market rate)`);
    
    try {
      const ethAmountWei = ethers.parseEther(ethAmount).toString();
      console.log(`💱 ETH Amount in wei: ${ethAmountWei}`);
      
      // Step 1: Get quote - EXACT same as debug script
      console.log('📞 Getting OKX DEX quote...');
      const quote = await this.getOKXQuote(ethAmountWei);
      
      // Parse response EXACT same as debug script
      const expectedUSDC = parseFloat(quote.toTokenAmount) / 1e6; // USDC has 6 decimals
      const inputETH = parseFloat(quote.fromTokenAmount) / 1e18; // ETH has 18 decimals
      const ethPrice = expectedUSDC / inputETH;
      
      console.log(`💱 OKX Quote:`);
      console.log(`   Input: ${inputETH} ETH`);
      console.log(`   Output: ${expectedUSDC.toFixed(6)} USDC`);
      console.log(`   ETH Price: ${ethPrice.toFixed(2)} per ETH`);
      
      // Validate minimum output
      if (expectedUSDC < 0.01) {
        throw new Error(`Output too small: ${expectedUSDC.toFixed(6)} USDC`);
      }
      
      // Step 2: Get swap transaction
      console.log('🔧 Getting OKX swap transaction...');
      const swapData = await this.getOKXSwapTransaction(ethAmountWei);
      
      if (!swapData.tx) {
        throw new Error('Invalid swap data - missing transaction object');
      }
      
      // Step 3: Execute swap
      console.log('⚡ Executing OKX DEX swap on Base Mainnet...');
      const swapTx = await this.adminMainnetSigner.sendTransaction({
        to: swapData.tx.to,
        value: swapData.tx.value || 0,
        data: swapData.tx.data,
        gasLimit: CONFIG.GAS_LIMITS.okxSwap,
      });
      
      console.log(`📡 OKX Swap TX sent: ${swapTx.hash}`);
      const swapReceipt = await swapTx.wait();
      
      if (swapReceipt.status === 1) {
        console.log(`✅ OKX DEX swap successful: ${expectedUSDC.toFixed(6)} USDC received`);
        return {
          success: true,
          txHash: swapTx.hash,
          ethUsed: ethAmount,
          usdcReceived: expectedUSDC.toFixed(6),
          ethPrice: ethPrice.toFixed(2)
        };
      } else {
        throw new Error('OKX swap transaction failed');
      }
      
    } catch (error) {
      console.error('❌ OKX DEX swap error:', error);
      if (error.response?.data) {
        console.error('API Response:', JSON.stringify(error.response.data, null, 2));
      }
      return { success: false, error: error.message };
    }
  }

  // Get OKX quote - EXACT same as debug script
  async getOKXQuote(ethAmountWei) {
    const timestamp = new Date().toISOString();
    const requestPath = '/api/v5/dex/aggregator/quote';
    
    const params = {
      chainIndex: CONFIG.OKX_CHAIN_ID, // EXACT same as debug script
      fromTokenAddress: CONFIG.ETH_ADDRESS,
      toTokenAddress: CONFIG.USDC_BASE,
      amount: ethAmountWei,
      slippage: '0'
    };
    
    const queryString = "?" + new URLSearchParams(params).toString();
    const headers = this.getOKXHeaders(timestamp, 'GET', requestPath, queryString);
    
    const response = await axios.get(`https://web3.okx.com${requestPath}`, { 
      params, 
      headers,
      timeout: 10000
    });
    
    console.log('📊 OKX Quote Response Code:', response.data.code);
    
    if (response.data.code === '0') {
      return response.data.data[0];
    } else {
      throw new Error(`OKX Quote API Error: ${response.data.msg || 'Unknown error'}`);
    }
  }

  // Get OKX swap transaction - EXACT same as debug script
  async getOKXSwapTransaction(ethAmountWei) {
    const timestamp = new Date().toISOString();
    const requestPath = '/api/v5/dex/aggregator/swap';
    
    const params = {
      chainIndex: CONFIG.OKX_CHAIN_ID, // EXACT same as debug script
      fromTokenAddress: CONFIG.ETH_ADDRESS,
      toTokenAddress: CONFIG.USDC_BASE,
      amount: ethAmountWei,
      userWalletAddress: CONFIG.ADMIN_ADDRESS,
      slippage: '0.005'
    };
    
    const queryString = "?" + new URLSearchParams(params).toString();
    const headers = this.getOKXHeaders(timestamp, 'GET', requestPath, queryString);
    
    const response = await axios.get(`https://web3.okx.com${requestPath}`, { 
      params, 
      headers,
      timeout: 10000
    });
    
    console.log('📊 OKX Swap Response Code:', response.data.code);
    
    if (response.data.code === '0') {
      return response.data.data[0];
    } else {
      throw new Error(`OKX Swap API Error: ${response.data.msg || 'Unknown error'}`);
    }
  }

  // Generate headers - EXACT same as debug script (with $ addition)
  getOKXHeaders(timestamp, method, requestPath, queryString = "") {
    const apiKey = process.env.OKX_API_KEY;
    const secretKey = process.env.OKX_SECRET_KEY;
    const apiPassphrase = process.env.OKX_API_PASSPHRASE + "$"; // EXACT same as debug script
    const projectId = process.env.OKX_PROJECT_ID;

    if (!apiKey || !secretKey || !process.env.OKX_API_PASSPHRASE || !projectId) {
      throw new Error("Missing OKX API credentials");
    }

    const stringToSign = timestamp + method + requestPath + queryString;
    
    return {
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": CryptoJS.enc.Base64.stringify(
        CryptoJS.HmacSHA256(stringToSign, secretKey)
      ),
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": apiPassphrase,
      "OK-ACCESS-PROJECT": projectId,
    };
  }

  // Emit cross-chain event (same as before)
  async emitCrossChainEvent(paymentData, swapResult) {
    console.log('🌉 Emitting cross-chain event on Base Mainnet...');
    
    try {
      const bridgeABI = [
        "function emitPurchaseEvent(address user, uint256 cardId, uint256 usdcAmount, string memory okxOrderId) external"
      ];
      
      const bridgeContract = new ethers.Contract(
        CONFIG.SIMPLE_BRIDGE_MAINNET,
        bridgeABI,
        this.adminMainnetSigner
      );
      
      const eventTx = await bridgeContract.emitPurchaseEvent(
        paymentData.userAddress,
        paymentData.cardId,
        ethers.parseUnits(paymentData.usdcAmount.toString(), 6),
        paymentData.orderId,
        {
          gasLimit: CONFIG.GAS_LIMITS.bridgeEvent
        }
      );
      
      console.log(`📡 Bridge event emitted: ${eventTx.hash}`);
      await eventTx.wait();
      console.log(`✅ Cross-chain event confirmed on Base Mainnet`);
      
      return { success: true, eventTxHash: eventTx.hash };
      
    } catch (error) {
      console.error('❌ Bridge event failed:', error);
      throw error;
    }
  }

  // Purchase gift card (same as before)
  async purchaseGiftCardForUser(paymentData) {
    console.log(`🎁 Purchasing card ${paymentData.cardId} for ${paymentData.userAddress}`);
    
    try {
      const dgMarketABI = [
        "function purchaseGiftCardOnBehalf(address user, uint256 cardId) external"
      ];
      
      const dgMarketContract = new ethers.Contract(
        CONFIG.DGMARKET_CORE_SEPOLIA,
        dgMarketABI,
        this.adminSepoliaSigner
      );
      
      console.log(`🚀 Purchasing Card #${paymentData.cardId} for user on Base Sepolia...`);
      
      const purchaseTx = await dgMarketContract.purchaseGiftCardOnBehalf(
        paymentData.userAddress,
        paymentData.cardId,
        {
          gasLimit: CONFIG.GAS_LIMITS.purchaseOnBehalf
        }
      );
      
      console.log(`📡 TX Hash: ${purchaseTx.hash}`);
      const purchaseReceipt = await purchaseTx.wait();
      
      if (purchaseReceipt.status === 1) {
        console.log(`✅ Gift card ${paymentData.cardId} assigned to ${paymentData.userAddress} on Base Sepolia`);
        return { success: true, purchaseTxHash: purchaseTx.hash };
      } else {
        throw new Error('Purchase transaction failed');
      }
      
    } catch (error) {
      console.error(`❌ Gift card purchase failed:`, error);
      throw error;
    }
  }

  // Get processing status
  getProcessingStatus() {
    const processingArray = Array.from(this.processingQueue.entries()).map(([txHash, data]) => ({
      txHash,
      ...data,
      processingTime: Date.now() - data.startTime
    }));

    return {
      processed: this.processedPayments.size,
      currentlyProcessing: this.processingQueue.size,
      processingTransactions: processingArray
    };
  }
}

// Create API Server
async function createAPIServer() {
  const app = express();
  const processor = new WorkingPaymentProcessor();
  
  app.use(cors());
  app.use(express.json());
  
  await processor.initialize();

  // Process payment endpoint
  app.post('/api/process-payment', async (req, res) => {
    try {
      const { txHash, cardId, userAddress } = req.body;

      if (!txHash || !cardId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: txHash and cardId'
        });
      }

      console.log(`\n📨 API Request: Process ${txHash} for card ${cardId}`);
      const result = await processor.processTransactionHash(txHash, cardId, userAddress);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ API Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Status endpoint
  app.get('/api/status', async (req, res) => {
    try {
      const mainnetBlock = await processor.mainnetProvider.getBlockNumber();
      const sepoliaBlock = await processor.sepoliaProvider.getBlockNumber();
      const processingStatus = processor.getProcessingStatus();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        networks: {
          mainnet: { block: mainnetBlock, rpc: CONFIG.BASE_MAINNET_RPC },
          sepolia: { block: sepoliaBlock, rpc: CONFIG.BASE_SEPOLIA_RPC }
        },
        processing: processingStatus,
        contracts: {
          dgmarket: CONFIG.DGMARKET_CORE_SEPOLIA,
          bridge: CONFIG.SIMPLE_BRIDGE_MAINNET
        }
      });
    } catch (error) {
      res.status(500).json({ status: 'error', error: error.message });
    }
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  return { app, processor };
}

// Main execution
async function main() {
  if (!CONFIG.ADMIN_PRIVATE_KEY) {
    console.error('❌ ADMIN_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }

  if (!process.env.OKX_API_KEY || !process.env.OKX_SECRET_KEY || !process.env.OKX_API_PASSPHRASE || !process.env.OKX_PROJECT_ID) {
    console.error('❌ Missing OKX API credentials');
    process.exit(1);
  }

  console.log('🎯 Starting Working Payment Processor...');
  
  const { app, processor } = await createAPIServer();
  
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n🚀 API Server running on port ${PORT}`);
    console.log(`📡 Process payments: POST http://localhost:${PORT}/api/process-payment`);
    console.log(`📊 Status: GET http://localhost:${PORT}/api/status`);
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Startup error:', error);
    process.exit(1);
  });
}

module.exports = { WorkingPaymentProcessor, CONFIG };