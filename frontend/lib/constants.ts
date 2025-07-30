// frontend/lib/constants.ts
// Updated to use dynamic contract addresses

// Import contract addresses from automated loader
export { 
  CONTRACT_ADDRESSES,
  DGMARKET_CORE_ADDRESS,
  CHAINLINK_MANAGER_ADDRESS,
  NETWORK_CONFIG 
} from './contract-addresses';

// USDC Configuration
export const USDC_CONFIG = {
  address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const, // Base Sepolia USDC
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
} as const;

export const ADMIN_WALLET_ADDRESS = '0x6328d8Ad7A88526e35c9Dc730e65fF8fEE971c09'

// Gift Card Categories
export const GIFT_CARD_CATEGORIES = [
  'Food & Dining',
  'Shopping', 
  'Entertainment',
  'Travel',
  'Gaming'
] as const;

// Price Configuration
export const PRICE_CONFIG = {
  min: 1, // 1 USDC
  max: 2, // 2 USDC
  decimals: 6, // USDC has 6 decimals
  format: (amount: number) => `${amount.toFixed(2)} USDC`,
} as const;

// Transaction Configuration
export const TX_CONFIG = {
  confirmations: 1,
  timeout: 30000, // 30 seconds
  gasLimit: 800000, // Gas limit for complex transactions
} as const;

// UI Configuration
export const UI_CONFIG = {
  refreshInterval: 10000, // 10 seconds
  toastDuration: 5000, // 5 seconds
  maxRetries: 3,
} as const;

// API Endpoints
export const API_CONFIG = {
  ipfsGateway: 'https://gateway.pinata.cloud/ipfs/',
  // Add other API endpoints as needed
} as const;

// Feature Flags
export const FEATURES = {
  purchaseEnabled: true,
  revealEnabled: true,
  adminWithdrawal: true,
  chainlinkAutomation: true,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  insufficientBalance: 'Insufficient USDC balance',
  approvalRequired: 'USDC approval required',
  cardNotAvailable: 'Gift card not available for purchase',
  cardNotOwned: 'You do not own this gift card',
  transactionFailed: 'Transaction failed',
  networkError: 'Network connection error',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  purchaseComplete: 'Gift card purchased successfully!',
  approvalComplete: 'USDC approval successful!',
  revealComplete: 'Gift card revealed successfully!',
  withdrawalComplete: 'Withdrawal completed successfully!',
} as const;