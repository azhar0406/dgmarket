// dgmarket/backend/admin/payment-processor.js
// Complete admin payment processor for OKX cross-chain purchases

const { ethers } = require('ethers');
const axios = require('axios');

// Configuration using your deployed contracts
const CONFIG = {
  // Networks
  BASE_SEPOLIA_RPC: 'https://base-sepolia-rpc.publicnode.com',
  BASE_MAINNET_RPC: 'https://base.llamarpc.com',
  
  // Your deployed contract addresses
  DGMARKET_CORE_SEPOLIA: '0xd9F2A41902524d20F12B3f2784d2F0962E0090cE',
  SIMPLE_BRIDGE_MAINNET: '0xF7cF8159C710eb23b81b9EA1EbA5Db91Dd0dd4Ba',
  
  // Update with your actual admin address
  ADMIN_ADDRESS: '0x6328d8Ad7A88526e35c9Dc730e65fF8fEE971c09',
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY, // Set in environment
  
  // OKX DEX Configuration for Base Mainnet
  OKX_API_URL: 'https://www.okx.com/api/v5/dex/aggregator',
  OKX_CHAIN_ID: '8453', // Base Mainnet
  USDC_BASE: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Mainnet USDC
  ETH_ADDRESS: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  
  // Monitoring settings
  POLLING_INTERVAL: 15000, // 15 seconds
  MIN_ETH_AMOUNT: '0.001', // Minimum ETH to process
};

class AdminPaymentProcessor {
  constructor() {
    // Initialize providers
    this.sepoliaProvider = new ethers.JsonRpcProvider(CONFIG.BASE_SEPOLIA_RPC);
    this.mainnetProvider = new ethers.JsonRpcProvider(CONFIG.BASE_MAINNET_RPC);
    
    // Initialize signers
    this.adminSepoliaSigner = new ethers.Wallet(CONFIG.ADMIN_PRIVATE_KEY, this.sepoliaProvider);
    this.adminMainnetSigner = new ethers.Wallet(CONFIG.ADMIN_PRIVATE_KEY, this.mainnetProvider);
    
    // Tracking
    this.processedPayments = new Set();
    this.lastProcessedBlock = null;
    
    console.log('🚀 DGMarket Admin Payment Processor');
    console.log(`📍 Admin Address: ${CONFIG.ADMIN_ADDRESS}`);
    console.log(`🎯 DGMarket Contract: ${CONFIG.DGMARKET_CORE_SEPOLIA}`);
    console.log(`🌉 Bridge Contract: ${CONFIG.SIMPLE_BRIDGE_MAINNET}`);
  }

  // Start monitoring for ETH payments
  async startMonitoring() {
    try {
      // Test connections
      const sepoliaBlock = await this.sepoliaProvider.getBlockNumber();
      const mainnetBlock = await this.mainnetProvider.getBlockNumber();
      
      console.log(`✅ Connected to Base Sepolia: Block ${sepoliaBlock}`);
      console.log(`✅ Connected to Base Mainnet: Block ${mainnetBlock}`);
      
      // Get admin balance
      const adminBalance = await this.sepoliaProvider.getBalance(CONFIG.ADMIN_ADDRESS);
      console.log(`💰 Admin ETH Balance: ${ethers.formatEther(adminBalance)} ETH`);
      
      // Start monitoring from current block
      this.lastProcessedBlock = sepoliaBlock;
      
      // Start polling loop
      this.startPolling();
      
      console.log('👀 Payment monitoring started...');
      
    } catch (error) {
      console.error('❌ Startup failed:', error);
      process.exit(1);
    }
  }

  // Poll for new blocks and check for payments
  startPolling() {
    setInterval(async () => {
      try {
        const currentBlock = await this.sepoliaProvider.getBlockNumber();
        
        if (currentBlock > this.lastProcessedBlock) {
          console.log(`🔍 Checking blocks ${this.lastProcessedBlock + 1} to ${currentBlock}`);
          
          // Process each new block
          for (let blockNum = this.lastProcessedBlock + 1; blockNum <= currentBlock; blockNum++) {
            await this.processBlock(blockNum);
          }
          
          this.lastProcessedBlock = currentBlock;
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, CONFIG.POLLING_INTERVAL);
  }

  // Process a specific block for ETH payments
  async processBlock(blockNumber) {
    try {
      const block = await this.sepoliaProvider.getBlock(blockNumber, true);
      if (!block?.transactions?.length) return;

      for (const txHash of block.transactions) {
        if (typeof txHash === 'string') {
          await this.checkTransaction(txHash);
        }
      }
    } catch (error) {
      console.error(`❌ Block processing error (${blockNumber}):`, error);
    }
  }

  // Check individual transaction for payment to admin
  async checkTransaction(txHash) {
    try {
      const tx = await this.sepoliaProvider.getTransaction(txHash);
      
      if (tx && 
          tx.to?.toLowerCase() === CONFIG.ADMIN_ADDRESS.toLowerCase() && 
          tx.value > 0n &&
          !this.processedPayments.has(txHash)) {
        
        console.log(`💰 ETH payment detected: ${txHash}`);
        console.log(`💵 Amount: ${ethers.formatEther(tx.value)} ETH`);
        
        await this.processPayment(tx);
      }
    } catch (error) {
      console.error(`❌ Transaction check error (${txHash}):`, error);
    }
  }

  // Process detected ETH payment
  async processPayment(transaction) {
    const txHash = transaction.hash;
    
    try {
      // Mark as processing to prevent duplicates
      this.processedPayments.add(txHash);
      
      console.log(`🔄 Processing payment: ${txHash}`);
      
      // Extract payment metadata from transaction data
      let paymentData = null;
      if (transaction.data && transaction.data !== '0x') {
        try {
          const dataHex = transaction.data.slice(2);
          const dataString = Buffer.from(dataHex, 'hex').toString('utf8');
          paymentData = JSON.parse(dataString);
          console.log('📋 Payment metadata:', paymentData);
        } catch (parseError) {
          console.log('⚠️  No valid metadata found, skipping payment');
          return;
        }
      }
      
      if (!paymentData?.cardId || !paymentData?.userAddress) {
        console.log('⚠️  Invalid payment metadata, skipping');
        return;
      }
      
      // Wait for payment confirmation
      const receipt = await this.sepoliaProvider.waitForTransactionReceipt(txHash);
      if (receipt.status !== 1) {
        console.log('❌ Payment transaction failed');
        return;
      }
      
      console.log(`✅ ETH payment confirmed: ${ethers.formatEther(transaction.value)} ETH`);
      
      // Step 1: Swap ETH → USDC on Base Mainnet
      const ethAmount = ethers.formatEther(transaction.value);
      const swapResult = await this.executeOKXSwap(ethAmount, paymentData.usdcAmount);
      
      if (!swapResult.success) {
        console.error('❌ OKX swap failed, payment processing stopped');
        return;
      }
      
      // Step 2: Emit cross-chain event
      await this.emitCrossChainEvent(paymentData, swapResult);
      
      // Step 3: Purchase gift card for user on Sepolia
      await this.purchaseGiftCardForUser(paymentData);
      
      console.log(`🎉 Complete purchase flow finished for card ${paymentData.cardId} → user ${paymentData.userAddress}`);
      
    } catch (error) {
      console.error(`❌ Payment processing failed for ${txHash}:`, error);
      // Remove from processed set to allow retry
      this.processedPayments.delete(txHash);
    }
  }

  // Execute OKX DEX swap on Base Mainnet
  async executeOKXSwap(ethAmount, targetUSDC) {
    console.log(`🔄 OKX Swap: ${ethAmount} ETH → $${targetUSDC} USDC`);
    
    try {
      // Convert ETH amount to wei for API
      const ethAmountWei = ethers.parseEther(ethAmount).toString();
      
      // Step 1: Get swap quote
      const quoteUrl = `${CONFIG.OKX_API_URL}/quote`;
      const quoteParams = {
        chainId: CONFIG.OKX_CHAIN_ID,
        fromTokenAddress: CONFIG.ETH_ADDRESS,
        toTokenAddress: CONFIG.USDC_BASE,
        amount: ethAmountWei,
        slippage: '0.02' // 2% slippage
      };
      
      console.log('📞 Getting OKX quote...');
      const quoteResponse = await axios.get(quoteUrl, { params: quoteParams });
      const quote = quoteResponse.data.data[0];
      
      const expectedUSDC = parseFloat(ethers.formatUnits(quote.toAmount, 6));
      console.log(`💱 Quote: ${ethAmount} ETH → ${expectedUSDC.toFixed(2)} USDC`);
      
      // Step 2: Get swap transaction
      const swapUrl = `${CONFIG.OKX_API_URL}/swap`;
      const swapParams = {
        ...quoteParams,
        fromAddress: CONFIG.ADMIN_ADDRESS
      };
      
      console.log('🔧 Building swap transaction...');
      const swapResponse = await axios.get(swapUrl, { params: swapParams });
      const swapData = swapResponse.data.data[0];
      
      // Step 3: Execute swap on Base Mainnet
      console.log('⚡ Executing swap on Base Mainnet...');
      const swapTx = await this.adminMainnetSigner.sendTransaction({
        to: swapData.tx.to,
        value: swapData.tx.value || 0,
        data: swapData.tx.data,
        gasLimit: Math.floor(parseInt(swapData.tx.gas) * 1.2), // 20% buffer
      });
      
      console.log(`📡 Swap TX sent: ${swapTx.hash}`);
      
      // Wait for confirmation
      const swapReceipt = await swapTx.wait();
      
      if (swapReceipt.status === 1) {
        console.log(`✅ OKX swap successful: ${expectedUSDC.toFixed(2)} USDC received`);
        return {
          success: true,
          txHash: swapTx.hash,
          ethUsed: ethAmount,
          usdcReceived: expectedUSDC.toFixed(2)
        };
      } else {
        throw new Error('Swap transaction failed');
      }
      
    } catch (error) {
      console.error('❌ OKX swap error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Emit cross-chain event on Base Mainnet
  async emitCrossChainEvent(paymentData, swapResult) {
    console.log('🌉 Emitting cross-chain event on Base Mainnet...');
    
    try {
      // Your deployed SimpleBridge contract
      const bridgeABI = [
        "function emitPurchaseEvent(address user, uint256 cardId, uint256 usdcAmount, string memory okxOrderId) external"
      ];
      
      const bridgeContract = new ethers.Contract(
        CONFIG.SIMPLE_BRIDGE_MAINNET,
        bridgeABI,
        this.adminMainnetSigner
      );
      
      // Create order ID for tracking
      const okxOrderId = `okx-${paymentData.orderId}-${Date.now()}`;
      
      // Emit event
      const eventTx = await bridgeContract.emitPurchaseEvent(
        paymentData.userAddress,
        paymentData.cardId,
        ethers.parseUnits(paymentData.usdcAmount.toString(), 6), // USDC 6 decimals
        okxOrderId
      );
      
      console.log(`📡 Bridge event emitted: ${eventTx.hash}`);
      await eventTx.wait();
      console.log(`✅ Cross-chain event confirmed`);
      
      return { success: true, eventTxHash: eventTx.hash };
      
    } catch (error) {
      console.error('❌ Bridge event failed:', error);
      throw error;
    }
  }

  // Purchase gift card on behalf of user (Base Sepolia)
  async purchaseGiftCardForUser(paymentData) {
    console.log(`🎁 Purchasing card ${paymentData.cardId} for ${paymentData.userAddress}`);
    
    try {
      // Your DGMarket contract ABI (minimal needed functions)
      const dgMarketABI = [
        "function purchaseGiftCardOnBehalf(address user, uint256 cardId) external",
        "function hasRole(bytes32 role, address account) external view returns (bool)",
        "function ADMIN_ROLE() external view returns (bytes32)"
      ];
      
      const dgMarketContract = new ethers.Contract(
        CONFIG.DGMARKET_CORE_SEPOLIA,
        dgMarketABI,
        this.adminSepoliaSigner
      );
      
      // Check admin role (optional verification)
      try {
        const adminRole = await dgMarketContract.ADMIN_ROLE();
        const hasAdminRole = await dgMarketContract.hasRole(adminRole, CONFIG.ADMIN_ADDRESS);
        console.log(`🔐 Admin role check: ${hasAdminRole}`);
      } catch (roleError) {
        console.log('⚠️  Could not verify admin role, proceeding...');
      }
      
      // Execute purchase on behalf of user
      const purchaseTx = await dgMarketContract.purchaseGiftCardOnBehalf(
        paymentData.userAddress,
        paymentData.cardId,
        {
          gasLimit: 300000 // Sufficient gas for the operation
        }
      );
      
      console.log(`🛒 Purchase TX sent: ${purchaseTx.hash}`);
      
      // Wait for confirmation
      const purchaseReceipt = await purchaseTx.wait();
      
      if (purchaseReceipt.status === 1) {
        console.log(`🎉 Gift card ${paymentData.cardId} successfully assigned to ${paymentData.userAddress}`);
        
        // Log the purchase event
        const purchaseEvent = purchaseReceipt.logs.find(log => {
          try {
            const decoded = dgMarketContract.interface.parseLog(log);
            return decoded.name === 'GiftCardPurchased';
          } catch {
            return false;
          }
        });
        
        if (purchaseEvent) {
          console.log(`📋 Purchase event confirmed: Card ${paymentData.cardId} → ${paymentData.userAddress}`);
        }
        
        return { success: true, purchaseTxHash: purchaseTx.hash };
      } else {
        throw new Error('Purchase transaction failed');
      }
      
    } catch (error) {
      console.error('❌ Gift card purchase failed:', error);
      throw error;
    }
  }

  // Manual processing for testing
  async processManualPayment(txHashOrOrderData) {
    console.log(`🧪 Manual processing:`, txHashOrOrderData);
    
    try {
      if (typeof txHashOrOrderData === 'string') {
        // Process by transaction hash
        const tx = await this.sepoliaProvider.getTransaction(txHashOrOrderData);
        if (!tx) throw new Error('Transaction not found');
        await this.processPayment(tx);
      } else {
        // Process by order data directly
        await this.executeOKXSwap(txHashOrOrderData.ethAmount, txHashOrOrderData.usdcAmount);
        await this.emitCrossChainEvent(txHashOrOrderData, { success: true });
        await this.purchaseGiftCardForUser(txHashOrOrderData);
      }
      
      console.log('✅ Manual processing complete');
    } catch (error) {
      console.error('❌ Manual processing failed:', error);
    }
  }

  // Health check and status
  async getStatus() {
    try {
      const sepoliaBlock = await this.sepoliaProvider.getBlockNumber();
      const mainnetBlock = await this.mainnetProvider.getBlockNumber();
      const adminSepoliaBalance = await this.sepoliaProvider.getBalance(CONFIG.ADMIN_ADDRESS);
      const adminMainnetBalance = await this.mainnetProvider.getBalance(CONFIG.ADMIN_ADDRESS);
      
      return {
        status: 'healthy',
        networks: {
          sepolia: { block: sepoliaBlock, adminBalance: ethers.formatEther(adminSepoliaBalance) },
          mainnet: { block: mainnetBlock, adminBalance: ethers.formatEther(adminMainnetBalance) }
        },
        processed: this.processedPayments.size,
        lastBlock: this.lastProcessedBlock
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}

// Main execution
async function main() {
  // Validate environment
  if (!CONFIG.ADMIN_PRIVATE_KEY) {
    console.error('❌ ADMIN_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }
  
  // Create and start processor
  const processor = new AdminPaymentProcessor();
  
  // Start monitoring
  await processor.startMonitoring();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down payment processor...');
    process.exit(0);
  });
  
  // Keep process alive and handle errors
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught exception:', error);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled rejection:', reason);
  });
  
  // Manual testing interface (if needed)
  if (process.argv.includes('--test')) {
    console.log('🧪 Test mode activated');
    // Example: node payment-processor.js --test
    
    const testPayment = {
      cardId: 1,
      userAddress: '0x1234567890123456789012345678901234567890',
      usdcAmount: 5,
      ethAmount: '0.002',
      orderId: 'test-' + Date.now()
    };
    
    setTimeout(() => {
      processor.processManualPayment(testPayment).catch(console.error);
    }, 5000);
  }
}

// Export for use in other modules
module.exports = { AdminPaymentProcessor, CONFIG };

// Run if executed directly
if (require.main === module) {
  console.log('🎯 Starting DGMarket Admin Payment Processor...');
  main().catch(error => {
    console.error('💥 Startup error:', error);
    process.exit(1);
  });
}