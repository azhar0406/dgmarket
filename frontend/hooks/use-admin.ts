'use client';

import { useAccount } from 'wagmi';
import { ADMIN_WALLET_ADDRESS } from '@/lib/constants';

export function useAdmin() {
  const { address, isConnected } = useAccount();
  
  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase();
  
  return {
    isAdmin,
    isConnected,
    address,
  };
}