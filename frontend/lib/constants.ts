export const GIFT_CARD_CATEGORIES = [
  { id: 'all', name: 'All Categories', description: 'Browse all available gift cards' },
  { id: 'retail', name: 'Retail', description: 'Shopping and department stores' },
  { id: 'dining', name: 'Dining', description: 'Restaurants and food delivery' },
  { id: 'entertainment', name: 'Entertainment', description: 'Movies, games, and streaming' },
  { id: 'travel', name: 'Travel', description: 'Hotels, airlines, and booking' },
  { id: 'tech', name: 'Technology', description: 'Electronics and software' },
  { id: 'gaming', name: 'Gaming', description: 'Gaming platforms and in-game currency' },
] as const;

export const SUPPORTED_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, address: '0x0000000000000000000000000000000000000000' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xa0b86a33e6c8b5b47a95b4ff8b5b64b1e6c8f4b8' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xb0b86a33e6c8b5b47a95b4ff8b5b64b1e6c8f4b9' },
] as const;

/**
 * VERIFIED CONTRACT ADDRESSES - July 26, 2025
 * Add this to your existing constants file
 */
export const CONTRACT_ADDRESSES = {
  DGMARKET_CORE: "0x8b1587091470Da7f387e0d93730f7256f09DE185" as const,
  CHAINLINK_GIFT_CARD_MANAGER: "0x450718Bed1eE060962eE1706D5c0825AC8D7c213" as const,
} as const;

export const NETWORK_CONFIG = {
  chainId: 84532,
  name: "Base Sepolia", 
  explorerUrl: "https://sepolia.basescan.org",
} as const;

// Admin wallet address
export const ADMIN_WALLET_ADDRESS = '0x6328d8Ad7A88526e35c9Dc730e65fF8fEE971c09';