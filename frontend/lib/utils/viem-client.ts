// lib/utils/viem-client.ts
// Frontend Viem client for Base Sepolia (compatible with your backend setup)

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Create public client for Base Sepolia (frontend)
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base-sepolia-rpc.publicnode.com'),
});

// Network configuration
export const NETWORK_CONFIG = {
  chain: baseSepolia,
  chainId: 84532,
  name: 'Base Sepolia',
  rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.basescan.org',
  isTestnet: true,
} as const;

// Helper function to wait for transaction (can be used anywhere in frontend)
export async function waitForTransactionReceipt(
  txHash: `0x${string}`, 
  timeoutMs: number = 300000
): Promise<boolean> {
  const startTime = Date.now();
  
  console.log(`⏳ Waiting for transaction: ${txHash.slice(0, 10)}... on Base Sepolia`);
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
      
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
  return false;
}

// Export for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 Frontend Viem Client initialized:', {
    network: NETWORK_CONFIG.name,
    chainId: NETWORK_CONFIG.chainId,
    rpcUrl: NETWORK_CONFIG.rpcUrl
  });
}