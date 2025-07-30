// frontend/lib/contract-addresses.ts
// Automated contract address loading from deployment files

import deployments from '../../contracts/ignition/deployments/chain-84532/deployed_addresses.json';

export interface ContractAddresses {
  DGMARKET_CORE: string;
  CHAINLINK_GIFT_CARD_MANAGER: string;
}

/**
 * Loads contract addresses from deployment files
 * Ensures frontend always uses current deployed addresses
 */
export function getContractAddresses(): ContractAddresses {
  const addresses = {
    DGMARKET_CORE: deployments["DGMarketCompleteModule#DGMarketCore"],
    CHAINLINK_GIFT_CARD_MANAGER: deployments["DGMarketCompleteModule#ChainlinkGiftCardManager"],
  };

  // Validate addresses exist
  if (!addresses.DGMARKET_CORE || !addresses.CHAINLINK_GIFT_CARD_MANAGER) {
    throw new Error('Missing contract addresses in deployment file');
  }

  // Validate address format (basic check)
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!addressRegex.test(addresses.DGMARKET_CORE) || 
      !addressRegex.test(addresses.CHAINLINK_GIFT_CARD_MANAGER)) {
    throw new Error('Invalid contract address format');
  }

  return addresses;
}

// Export addresses for direct use
export const CONTRACT_ADDRESSES = getContractAddresses();

// Export individual addresses for convenience
export const DGMARKET_CORE_ADDRESS = CONTRACT_ADDRESSES.DGMARKET_CORE;
export const CHAINLINK_MANAGER_ADDRESS = CONTRACT_ADDRESSES.CHAINLINK_GIFT_CARD_MANAGER;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 84532,
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
} as const;

// Log addresses for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🎯 Loaded Contract Addresses:', {
    DGMarketCore: CONTRACT_ADDRESSES.DGMARKET_CORE,
    ChainlinkManager: CONTRACT_ADDRESSES.CHAINLINK_GIFT_CARD_MANAGER,
    Network: `${NETWORK_CONFIG.name} (${NETWORK_CONFIG.chainId})`
  });
}