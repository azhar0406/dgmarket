// lib/services/okx-dex.ts
// OKX DEX Service using Viem (compatible with your existing setup)

import axios from 'axios';
import { createHmac } from 'crypto';
import { createPublicClient, http, formatEther, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getErrorMessage, handleAPIError } from '@/lib/utils/error-handling';

export interface SwapQuote {
  fromToken: {
    tokenSymbol: string;
    decimal: string;
    tokenUnitPrice: string;
  };
  toToken: {
    tokenSymbol: string;
    decimal: string;
    tokenUnitPrice: string;
  };
  fromTokenAmount: string;
  toTokenAmount: string;
  priceImpact: string;
  routePath: any[];
}

export interface SwapTransaction {
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: string;
    gasPrice: string;
  };
  router: string;
}

export class OKXDexService {
  public publicClient: any; // Public Viem client for transaction checking
  private baseUrl = 'https://web3.okx.com/api/v5/';
  private chainId = '84532'; // Base Sepolia only

  // Token addresses for Base Sepolia
  private ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  private USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC

  constructor(rpcUrl?: string) {
    // Create Viem public client for Base Sepolia
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl || 'https://base-sepolia-rpc.publicnode.com'),
    });
  }

  /**
   * Generate authentication headers for OKX API using Node.js built-in crypto
   */
  private getHeaders(timestamp: string, method: string, requestPath: string, queryString = "", body = "") {
    const apiKey = process.env.NEXT_PUBLIC_OKX_API_KEY || process.env.OKX_API_KEY;
    const secretKey = process.env.OKX_SECRET_KEY;
    const apiPassphrase = process.env.OKX_API_PASSPHRASE;
    const projectId = process.env.NEXT_PUBLIC_OKX_PROJECT_ID || process.env.OKX_PROJECT_ID;

    if (!apiKey || !secretKey || !apiPassphrase || !projectId) {
      throw new Error('Missing OKX API credentials in environment variables');
    }

    const stringToSign = timestamp + method + requestPath + (queryString || body);
    
    // Use Node.js built-in crypto
    const signature = createHmac('sha256', secretKey)
      .update(stringToSign)
      .digest('base64');

    return {
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": apiPassphrase,
      "OK-ACCESS-PROJECT": projectId,
    };
  }

  /**
   * Get swap quote for ETH → USDC on Base Sepolia
   */
  async getSwapQuote(ethAmount: string, slippage: string = '0.005'): Promise<SwapQuote> {
    try {
      const path = 'dex/aggregator/quote';
      const url = `${this.baseUrl}${path}`;

      const params = {
        chainId: this.chainId, // Base Sepolia: 84532
        fromTokenAddress: this.ETH_ADDRESS,
        toTokenAddress: this.USDC_ADDRESS,
        amount: ethAmount, // Amount in wei
        slippage
      };

      const timestamp = new Date().toISOString();
      const requestPath = `/api/v5/${path}`;
      const queryString = "?" + new URLSearchParams(params).toString();
      const headers = this.getHeaders(timestamp, 'GET', requestPath, queryString);

      console.log('🔄 Getting OKX quote for Base Sepolia:', {
        ethAmount: formatEther(BigInt(ethAmount)) + ' ETH',
        chainId: this.chainId,
        slippage
      });

      const response = await axios.get(url, { params, headers });

      if (response.data.code === '0') {
        const quote = response.data.data[0];
        console.log('✅ OKX Quote received:', {
          fromETH: formatEther(BigInt(quote.fromTokenAmount)),
          toUSDC: (parseFloat(quote.toTokenAmount) / 1e6).toFixed(2),
          priceImpact: quote.priceImpact + '%'
        });
        return quote;
      } else {
        throw new Error(`Quote API Error: ${response.data.msg || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to get swap quote:', error);
      handleAPIError(error, 'OKX DEX Quote');
    }
  }

  /**
   * Get swap transaction data for ETH → USDC on Base Sepolia
   */
  async getSwapTransaction(
    ethAmount: string,
    userAddress: string,
    slippage: string = '0.005'
  ): Promise<SwapTransaction> {
    try {
      const path = 'dex/aggregator/swap';
      const url = `${this.baseUrl}${path}`;

      const params = {
        chainId: this.chainId, // Base Sepolia: 84532
        fromTokenAddress: this.ETH_ADDRESS,
        toTokenAddress: this.USDC_ADDRESS,
        amount: ethAmount,
        userWalletAddress: userAddress,
        slippage
      };

      const timestamp = new Date().toISOString();
      const requestPath = `/api/v5/${path}`;
      const queryString = "?" + new URLSearchParams(params).toString();
      const headers = this.getHeaders(timestamp, 'GET', requestPath, queryString);

      console.log('🔄 Getting swap transaction for Base Sepolia:', {
        ethAmount: formatEther(BigInt(ethAmount)) + ' ETH',
        userAddress: userAddress.slice(0, 10) + '...',
        slippage
      });

      const response = await axios.get(url, { params, headers });

      if (response.data.code === '0') {
        console.log('✅ Swap transaction data received');
        return response.data.data[0];
      } else {
        throw new Error(`Swap API Error: ${response.data.msg || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to get swap transaction:', error);
      handleAPIError(error, 'OKX DEX Swap');
    }
  }

  /**
   * Calculate required ETH amount for target USDC amount (Base Sepolia)
   */
  async calculateETHForUSDC(usdcAmount: string, bufferPercent: number = 10): Promise<{
    ethRequired: string;
    ethRequiredFormatted: string;
    expectedUSDC: string;
    quote: SwapQuote;
    priceImpact: string;
  }> {
    try {
      console.log(`🧮 Calculating ETH needed for ${usdcAmount} USDC on Base Sepolia...`);

      // Start with an estimated ETH amount (lower estimate for testnet)
      const roughEthNeeded = parseFloat(usdcAmount) / 2500; // Testnet rates
      const estimatedEthWei = Math.ceil(roughEthNeeded * 1e18).toString();

      // Get quote for estimated amount
      const quote = await this.getSwapQuote(estimatedEthWei, '0.02'); // 2% slippage for calculation

      // Calculate exact ratio
      const usdcFromEstimate = parseFloat(quote.toTokenAmount) / 1e6;
      const ethUsedEstimate = parseFloat(quote.fromTokenAmount) / 1e18;
      
      // Calculate exact ETH needed
      const exactEthNeeded = (parseFloat(usdcAmount) / usdcFromEstimate) * ethUsedEstimate;
      
      // Add buffer for price movements and slippage
      const ethWithBuffer = exactEthNeeded * (1 + bufferPercent / 100);
      const ethRequired = Math.ceil(ethWithBuffer * 1e18).toString();

      // Get final quote with buffer amount
      const finalQuote = await this.getSwapQuote(ethRequired, '0.02');

      const result = {
        ethRequired,
        ethRequiredFormatted: formatEther(BigInt(ethRequired)),
        expectedUSDC: (parseFloat(finalQuote.toTokenAmount) / 1e6).toFixed(2),
        quote: finalQuote,
        priceImpact: finalQuote.priceImpact
      };

      console.log('✅ ETH calculation complete:', {
        targetUSDC: usdcAmount,
        ethRequired: result.ethRequiredFormatted + ' ETH',
        expectedUSDC: result.expectedUSDC + ' USDC',
        priceImpact: result.priceImpact + '%'
      });

      return result;
    } catch (error: any) {
      console.error('❌ Failed to calculate ETH for USDC:', error);
      throw new Error(`Failed to calculate ETH requirements: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Wait for transaction confirmation using Viem
   */
  async waitForTransaction(txHash: `0x${string}`, timeoutMs: number = 300000): Promise<boolean> {
    const startTime = Date.now();
    
    console.log(`⏳ Waiting for transaction: ${txHash.slice(0, 10)}...`);
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash });
        
        if (receipt && receipt.status === 'success') {
          console.log(`✅ Transaction confirmed: ${txHash.slice(0, 10)}...`);
          return true;
        } else if (receipt && receipt.status === 'reverted') {
          console.log(`❌ Transaction reverted: ${txHash.slice(0, 10)}...`);
          return false;
        }
      } catch (e) {
        // Transaction not yet mined, continue polling
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    }
    
    console.log(`⏰ Transaction timed out: ${txHash.slice(0, 10)}...`);
    return false; // Timeout
  }

  /**
   * Get current ETH/USDC price for Base Sepolia
   */
  async getCurrentETHUSDCPrice(): Promise<{
    ethPrice: number;
    usdcPrice: number;
    ratio: number;
  }> {
    try {
      console.log('📊 Getting current ETH/USDC price on Base Sepolia...');
      
      // Get quote for 1 ETH
      const oneEthWei = parseEther('1').toString(); // 1 ETH in wei
      const quote = await this.getSwapQuote(oneEthWei);
      
      const usdcFromOneEth = parseFloat(quote.toTokenAmount) / 1e6; // USDC amount
      
      const result = {
        ethPrice: usdcFromOneEth,
        usdcPrice: 1 / usdcFromOneEth,
        ratio: usdcFromOneEth
      };

      console.log('✅ Current price on Base Sepolia:', {
        oneETH: result.ethPrice.toFixed(2) + ' USDC',
        oneUSDC: result.usdcPrice.toFixed(6) + ' ETH'
      });

      return result;
    } catch (error: any) {
      console.error('❌ Failed to get current price:', error);
      // Return fallback values for Base Sepolia
      return {
        ethPrice: 2500, // Fallback for testnet
        usdcPrice: 1/2500,
        ratio: 2500
      };
    }
  }

  /**
   * Simulate swap transaction before execution (Base Sepolia)
   */
  async simulateSwap(ethAmount: string, userAddress: string): Promise<any> {
    try {
      console.log('🧪 Simulating swap on Base Sepolia...');
      
      const swapData = await this.getSwapTransaction(ethAmount, userAddress);
      
      const path = 'dex/pre-transaction/simulate';
      const url = `${this.baseUrl}${path}`;

      const body = {
        chainIndex: this.chainId, // Base Sepolia: 84532
        fromAddress: swapData.tx.from,
        toAddress: swapData.tx.to,
        txAmount: swapData.tx.value || '0',
        extJson: {
          inputData: swapData.tx.data
        }
      };

      const bodyString = JSON.stringify(body);
      const timestamp = new Date().toISOString();
      const requestPath = `/api/v5/${path}`;
      const headers = this.getHeaders(timestamp, 'POST', requestPath, "", bodyString);

      const response = await axios.post(url, body, { headers });

      if (response.data.code === '0') {
        const simulation = response.data.data[0];
        
        if (simulation.failReason) {
          throw new Error(`Simulation failed: ${simulation.failReason}`);
        }
        
        console.log('✅ Simulation successful on Base Sepolia');
        return simulation;
      } else {
        throw new Error(`Simulation API Error: ${response.data.msg || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to simulate swap:', error);
      handleAPIError(error, 'OKX DEX Simulation');
    }
  }

  /**
   * Check if swap amount meets minimum requirements (Base Sepolia)
   */
  async validateSwapAmount(ethAmount: string, targetUSDC: string): Promise<{
    isValid: boolean;
    reason?: string;
    minimumETH?: string;
  }> {
    try {
      // Lower minimum for testnet
      const minUSDCValue = 1; // $1 minimum for testnet
      const targetUSDCValue = parseFloat(targetUSDC);
      
      if (targetUSDCValue < minUSDCValue) {
        return {
          isValid: false,
          reason: `Minimum swap amount is $${minUSDCValue} USDC on testnet`,
          minimumETH: (minUSDCValue / 2500 * 1e18).toString()
        };
      }

      // Get quote to verify the swap is possible
      const quote = await this.getSwapQuote(ethAmount);
      const expectedUSDC = parseFloat(quote.toTokenAmount) / 1e6;
      
      if (expectedUSDC < targetUSDCValue * 0.9) { // Allow 10% tolerance for testnet
        return {
          isValid: false,
          reason: `Insufficient output. Expected ${expectedUSDC.toFixed(2)} USDC, need ${targetUSDCValue} USDC`,
        };
      }

      return { isValid: true };
    } catch (error: any) {
      return {
        isValid: false,
        reason: `Validation failed: ${getErrorMessage(error)}`
      };
    }
  }

  /**
   * Test connection to OKX DEX API (Base Sepolia)
   */
  async testConnection(): Promise<{
    connected: boolean;
    chainId: string;
    network: string;
    error?: string;
  }> {
    try {
      console.log('🔗 Testing OKX DEX connection for Base Sepolia...');
      
      // Test with a small quote
      const testAmount = parseEther('0.01').toString(); // 0.01 ETH
      await this.getSwapQuote(testAmount);
      
      console.log('✅ OKX DEX connection successful');
      return {
        connected: true,
        chainId: this.chainId,
        network: 'Base Sepolia'
      };
    } catch (error: any) {
      console.error('❌ OKX DEX connection failed:', error);
      return {
        connected: false,
        chainId: this.chainId,
        network: 'Base Sepolia',
        error: getErrorMessage(error)
      };
    }
  }
}