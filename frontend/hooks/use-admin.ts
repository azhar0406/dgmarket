// hooks/use-admin.ts
'use client';

import { useAccount } from 'wagmi';
import { ADMIN_CONFIG } from '@/lib/constants';

export function useAdmin() {
  const { address, isConnected } = useAccount();

  const isAdmin = isConnected && 
    address && 
    address.toLowerCase() === ADMIN_CONFIG.address.toLowerCase();

  return {
    isAdmin: Boolean(isAdmin),
    adminAddress: ADMIN_CONFIG.address,
    connectedAddress: address,
    isConnected,
  };
}