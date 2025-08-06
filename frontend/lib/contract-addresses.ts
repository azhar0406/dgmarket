// lib/contract-addresses.ts
// Enhanced contract addresses with USDC integration - Compatible with existing structure

import deployments from '../../contracts/ignition/deployments/chain-84532/deployed_addresses.json';

export interface ContractAddresses {
  DGMARKET_CORE: string;
  CHAINLINK_GIFT_CARD_MANAGER: string;
  // NEW: Token addresses for OKX DEX integration
  USDC_ADDRESS: string;
  WETH_ADDRESS: string;
  ETH_ADDRESS: string; // OKX DEX identifier for native ETH
}

/**
 * Loads contract addresses from deployment files
 * Enhanced with token addresses for OKX DEX integration
 */
export function getContractAddresses(): ContractAddresses {
  try {
    // Load from deployment files (your existing structure)
    const dgMarketCore = deployments["DGMarketCompleteModule#DGMarketCore"];
    const chainlinkManager = deployments["DGMarketCompleteModule#ChainlinkGiftCardManager"];

    // Base Sepolia token addresses (TESTNET ONLY)
    const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
    const wethAddress = '0x4200000000000000000000000000000000000006'; // Base Sepolia WETH
    const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // OKX DEX native ETH identifier

    if (!dgMarketCore || !chainlinkManager) {
      throw new Error('Missing contract addresses in deployment file');
    }

    // Validate address format (basic check)
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(dgMarketCore) || !addressRegex.test(chainlinkManager)) {
      throw new Error('Invalid contract address format');
    }

    const addresses: ContractAddresses = {
      DGMARKET_CORE: dgMarketCore,
      CHAINLINK_GIFT_CARD_MANAGER: chainlinkManager,
      USDC_ADDRESS: usdcAddress,
      WETH_ADDRESS: wethAddress,
      ETH_ADDRESS: ethAddress,
    };

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Contract Addresses Loaded (Base Sepolia):');
      console.log('  DGMarket Core:', addresses.DGMARKET_CORE);
      console.log('  Chainlink Manager:', addresses.CHAINLINK_GIFT_CARD_MANAGER);
      console.log('  USDC Token (Sepolia):', addresses.USDC_ADDRESS);
      console.log('  WETH Token (Sepolia):', addresses.WETH_ADDRESS);
      console.log('  Network: Base Sepolia Testnet Only');
    }

    return addresses;
  } catch (error) {
    console.error('❌ Failed to load contract addresses:', error);
    throw error;
  }
}

// Export the loaded addresses
export const CONTRACT_ADDRESSES = getContractAddresses();

// Export individual addresses for convenience (your existing pattern)
export const DGMARKET_CORE_ADDRESS = CONTRACT_ADDRESSES.DGMARKET_CORE;
export const CHAINLINK_MANAGER_ADDRESS = CONTRACT_ADDRESSES.CHAINLINK_GIFT_CARD_MANAGER;

// NEW: Token addresses for OKX DEX
export const USDC_ADDRESS = CONTRACT_ADDRESSES.USDC_ADDRESS;
export const WETH_ADDRESS = CONTRACT_ADDRESSES.WETH_ADDRESS;
export const ETH_ADDRESS = CONTRACT_ADDRESSES.ETH_ADDRESS;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532'),
  name: process.env.NEXT_PUBLIC_CHAIN_ID === '84532' ? 'Base Sepolia' : 'Base',
  rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base-sepolia-rpc.publicnode.com',
  isTestnet: process.env.NEXT_PUBLIC_CHAIN_ID === '84532',
} as const;

// OKX DEX Configuration
export const OKX_DEX_CONFIG = {
  chainId: NETWORK_CONFIG.chainId.toString(),
  baseUrl: 'https://web3.okx.com/api/v5/',
  tokens: {
    ETH: ETH_ADDRESS,
    USDC: USDC_ADDRESS,
    WETH: WETH_ADDRESS,
  },
  slippage: {
    default: '0.01', // 1%
    execution: '0.015', // 1.5%
    max: '0.05', // 5%
    calculation: '0.005', // 0.5% for price calculations
  },
  limits: {
    minSwapUSD: 10, // $10 minimum swap
    maxSlippagePercent: 5, // 5% maximum slippage
    bufferPercent: 8, // 8% buffer for ETH calculations
  },
  timeout: 30000, // 30 second timeout
} as const;

// Development validation
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development Configuration:');
  console.log('  Network:', NETWORK_CONFIG.name);
  console.log('  Chain ID:', NETWORK_CONFIG.chainId);
  console.log('  RPC URL:', NETWORK_CONFIG.rpcUrl);
  console.log('  OKX DEX Enabled:', process.env.NEXT_PUBLIC_ENABLE_OKX_DEX === 'true');
  console.log('  Contracts loaded from deployment files ✅');
}