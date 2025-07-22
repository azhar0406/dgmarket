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

export const CONTRACT_ADDRESSES = {
  DG_MARKET_CORE: '0x1234567890123456789012345678901234567890',
  CONFIDENTIAL_GIFT_CARD: '0x2345678901234567890123456789012345678901',
  CHAINLINK_GIFT_CARD_MANAGER: '0x3456789012345678901234567890123456789012',
} as const;

// Admin wallet address
export const ADMIN_WALLET_ADDRESS = '0x6328d8Ad7A88526e35c9Dc730e65fF8fEE971c09';