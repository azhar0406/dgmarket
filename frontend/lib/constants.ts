// ✅ UPDATED CONSTANTS - July 28, 2025
// Dynamic categories from contract - no more hardcoded categories!

export const GIFT_CARD_CATEGORIES = [
  { id: 'all', name: 'All Categories', description: 'Browse all available gift cards' },
  // Categories are now loaded dynamically from contract using getAllCategories()
  // The following are the current categories in the contract:
  { id: 'food-dining', name: 'Food & Dining', description: 'Restaurants and food delivery' },
  { id: 'shopping', name: 'Shopping', description: 'Shopping and retail stores' },
  { id: 'entertainment', name: 'Entertainment', description: 'Movies, streaming, and entertainment' },
  { id: 'travel', name: 'Travel', description: 'Hotels, airlines, and booking' },
  { id: 'gaming', name: 'Gaming', description: 'Gaming platforms and in-game currency' },
] as const;

export const SUPPORTED_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, address: '0x0000000000000000000000000000000000000000' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' }, // ✅ UPDATED: Real Base Sepolia USDC
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' }, // ✅ UPDATED: Real Base Sepolia USDT
] as const;

/**
 * ✅ LATEST VERIFIED CONTRACT ADDRESSES - July 28, 2025
 * Updated with new deployment that includes enhanced dynamic categories
 */
export const CONTRACT_ADDRESSES = {
  DGMARKET_CORE: "0x74F4abD898D3701DFf5fD7AB8D7991122C0D612B" as const, // ✅ UPDATED: New enhanced contract
  CHAINLINK_GIFT_CARD_MANAGER: "0xfC0C84823308e3b2b9f046d4187f5f1A0CBAeFA6" as const, // ✅ UPDATED: New automation contract
} as const;

export const NETWORK_CONFIG = {
  chainId: 84532,
  name: "Base Sepolia", 
  explorerUrl: "https://sepolia.basescan.org",
} as const;

// Admin wallet address
export const ADMIN_WALLET_ADDRESS = '0x6328d8Ad7A88526e35c9Dc730e65fF8fEE971c09';

// ✅ NEW: Contract feature flags for enhanced functionality
export const CONTRACT_FEATURES = {
  DYNAMIC_CATEGORIES: true, // Contract supports getAllCategories() and getAllCategoriesWithData()
  ENHANCED_VIEWS: true,     // Contract supports getCategoryById(), getCategoryCount()
  REAL_IPFS_IMAGES: true,   // All cards have real IPFS images
  FHE_ENCRYPTION: true,     // Proper Inco SDK encryption
} as const;

// ✅ NEW: IPFS configuration for real images
export const IPFS_CONFIG = {
  BASE_URL: "https://fuchsia-total-catshark-247.mypinata.cloud/ipfs/bafybeiasqs7q3uuahrz7o44l46d73fmerfqt2ypjscnc5zhwwu6ug77gq4/",
  GATEWAY: "https://fuchsia-total-catshark-247.mypinata.cloud",
} as const;

// ✅ NEW: Dynamic category helpers
export const CATEGORY_MAPPING = {
  'Food & Dining': 'food-dining',
  'Shopping': 'shopping', 
  'Entertainment': 'entertainment',
  'Travel': 'travel',
  'Gaming': 'gaming',
} as const;

// ✅ NEW: Contract function names for dynamic loading
export const CONTRACT_FUNCTIONS = {
  GET_ALL_CATEGORIES: 'getAllCategories',
  GET_CATEGORIES_WITH_DATA: 'getAllCategoriesWithData', 
  GET_CATEGORY_BY_ID: 'getCategoryById',
  GET_CATEGORY_COUNT: 'getCategoryCount',
  GET_ALL_GIFT_CARDS: 'getAllGiftCards',
  GET_CARDS_BY_CATEGORY: 'getGiftCardsByCategory',
} as const;