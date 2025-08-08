// frontend/lib/constants.ts
// Updated for OKX Cross-Chain Integration

// Import contract addresses from automated loader
export { 
  DGMARKET_CORE_ADDRESS,
  CHAINLINK_MANAGER_ADDRESS,
  NETWORK_CONFIG 
} from './contract-addresses';

import { CONTRACT_ADDRESSES } from './contract-addresses';

// Network Configuration for Cross-Chain
export const NETWORK_CONFIG_CROSS_CHAIN = {
  BASE_SEPOLIA: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com',
    blockExplorer: process.env.NEXT_PUBLIC_SEPOLIA_BLOCK_EXPLORER || 'https://sepolia.basescan.org',
    contracts: {
      DGMARKET_CORE: CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
      CHAINLINK_MANAGER: CONTRACT_ADDRESSES.CHAINLINK_GIFT_CARD_MANAGER as `0x${string}`,
    },
    tokens: {
      USDC: CONTRACT_ADDRESSES.USDC_ADDRESS,
      WETH: CONTRACT_ADDRESSES.WETH_ADDRESS,
    }
  },
  BASE_MAINNET: {
    chainId: 8453,
    name: 'Base Mainnet',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL || 'https://base.llamarpc.com',
    blockExplorer: process.env.NEXT_PUBLIC_MAINNET_BLOCK_EXPLORER || 'https://basescan.org',
    contracts: {
      SIMPLE_BRIDGE: process.env.NEXT_PUBLIC_SIMPLE_BRIDGE_ADDRESS || '0x',
    },
    tokens: {
      USDC: process.env.NEXT_PUBLIC_MAINNET_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      WETH: '0x4200000000000000000000000000000000000006',
      ETH: process.env.NEXT_PUBLIC_MAINNET_ETH_ADDRESS || '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    }
  }
} as const;

// USDC Configuration (Legacy - keeping for compatibility)
export const USDC_CONFIG = {
  address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const, // Base Sepolia USDC
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
} as const;

// Admin Configuration for Cross-Chain
export const ADMIN_CONFIG = {
  address: process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '0x6328d8Ad7A88526e35c9Dc730e65fF8fEE971c09',
  // Admin receives ETH payments on Base Sepolia and executes OKX swaps on Base Mainnet
} as const;

// Legacy export for compatibility
export const ADMIN_WALLET_ADDRESS = ADMIN_CONFIG.address;

// OKX Configuration
export const OKX_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_OKX_CROSS_CHAIN === 'true',
  apiKey: process.env.NEXT_PUBLIC_OKX_API_KEY || '',
  projectId: process.env.NEXT_PUBLIC_OKX_PROJECT_ID || '',
  chainId: parseInt(process.env.NEXT_PUBLIC_OKX_DEX_CHAIN_ID || '8453'), // Base Mainnet
  baseUrl: 'https://web3.okx.com/web3/v2/',
  slippage: {
    default: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_SLIPPAGE || '0.01'),
    max: parseFloat(process.env.NEXT_PUBLIC_MAX_SLIPPAGE || '0.05'),
  }
} as const;

// Cross-Chain Payment Configuration
export const PAYMENT_CONFIG = {
  ethPriceUSD: 3000, // Fallback ETH price, should be fetched from API
  gasEstimates: {
    ethTransfer: 21000,
    contractCall: 100000,
    bufferMultiplier: parseFloat(process.env.NEXT_PUBLIC_GAS_BUFFER_MULTIPLIER || '1.2'),
  },
  monitoring: {
    paymentInterval: parseInt(process.env.NEXT_PUBLIC_PAYMENT_MONITORING_INTERVAL || '30000'),
    cardRefreshInterval: parseInt(process.env.NEXT_PUBLIC_CARD_REFRESH_INTERVAL || '30000'),
  },
  timeouts: {
    payment: parseInt(process.env.NEXT_PUBLIC_PAYMENT_TIMEOUT || '300000'), // 5 minutes
    processing: parseInt(process.env.NEXT_PUBLIC_PROCESSING_TIMEOUT || '600000'), // 10 minutes
  }
} as const;

// Gift Card Categories (unchanged)
export const GIFT_CARD_CATEGORIES = [
  'Food & Dining',
  'Shopping', 
  'Entertainment',
  'Travel',
  'Gaming'
] as const;

// Price Configuration (unchanged)
export const PRICE_CONFIG = {
  min: 1, // 1 USDC
  max: 2, // 2 USDC
  decimals: 6, // USDC has 6 decimals
  format: (amount: number) => `${amount.toFixed(2)} USDC`,
} as const;

// Transaction Configuration (updated for cross-chain)
export const TX_CONFIG = {
  confirmations: 1,
  timeout: 30000, // 30 seconds
  gasLimit: 800000, // Gas limit for complex transactions
  crossChainTimeout: 600000, // 10 minutes for cross-chain operations
} as const;

// UI Configuration (updated)
export const UI_CONFIG = {
  refreshInterval: parseInt(process.env.NEXT_PUBLIC_CARD_REFRESH_INTERVAL || '30000'), // 30 seconds for cross-chain
  toastDuration: 5000, // 5 seconds
  maxRetries: 3,
  enableNotifications: process.env.NEXT_PUBLIC_ENABLE_PAYMENT_NOTIFICATIONS === 'true',
} as const;

// API Configuration (updated)
export const API_CONFIG = {
  ipfsGateway: 'https://gateway.pinata.cloud/ipfs/',
  priceAPI: process.env.NEXT_PUBLIC_PRICE_API_URL || 'https://api.coingecko.com/api/v3/simple/price',
  okxAPI: OKX_CONFIG.baseUrl,
} as const;

// Feature Flags (updated)
export const FEATURES = {
  purchaseEnabled: true,
  revealEnabled: true,
  adminWithdrawal: true,
  chainlinkAutomation: true,
  okxCrossChain: OKX_CONFIG.enabled,
  ethPayments: process.env.NEXT_PUBLIC_ENABLE_ETH_PAYMENTS === 'true',
  autoNetworkSwitch: process.env.NEXT_PUBLIC_AUTO_SWITCH_NETWORKS === 'true',
} as const;

// Cross-Chain Error Messages
export const ERROR_MESSAGES = {
  // Legacy errors
  insufficientBalance: 'Insufficient USDC balance',
  approvalRequired: 'USDC approval required',
  cardNotAvailable: 'Gift card not available for purchase',
  cardNotOwned: 'You do not own this gift card',
  transactionFailed: 'Transaction failed',
  networkError: 'Network connection error',
  
  // Cross-chain specific errors
  insufficientETH: 'Insufficient ETH balance for cross-chain payment',
  networkSwitchFailed: 'Failed to switch network',
  okxNotSupported: 'OKX integration not available',
  adminAddressNotSet: 'Admin address not configured',
  crossChainTimeout: 'Cross-chain transaction timed out',
  paymentCalculationFailed: 'Failed to calculate payment amount',
  priceAPIError: 'Failed to fetch current ETH price',
} as const;

// Cross-Chain Success Messages
export const SUCCESS_MESSAGES = {
  // Legacy messages
  purchaseComplete: 'Gift card purchased successfully!',
  approvalComplete: 'USDC approval successful!',
  revealComplete: 'Gift card revealed successfully!',
  withdrawalComplete: 'Withdrawal completed successfully!',
  
  // Cross-chain specific messages
  paymentSent: 'ETH payment sent successfully! Processing your gift card...',
  networkSwitched: 'Network switched successfully',
  crossChainProcessing: 'Cross-chain purchase in progress...',
  crossChainComplete: 'Cross-chain purchase completed! Gift card is now available.',
} as const;

// Payment Method Types
export const PAYMENT_METHODS = {
  USDC_DIRECT: 'usdc_direct',
  ETH_CROSS_CHAIN: 'eth_cross_chain',
} as const;

// Debug Configuration
export const DEBUG_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true',
  logPayments: process.env.NODE_ENV === 'development',
  logNetworkSwitching: process.env.NODE_ENV === 'development',
} as const;