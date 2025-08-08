// hooks/use-contracts-fallback.ts
// Temporary fallback hooks while ABI files are being set up

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatEther, parseEther, type Address } from 'viem';
import {  GIFT_CARD_CATEGORIES } from '@/lib/constants';

// Mock data for testing
const MOCK_GIFT_CARDS = [
  {
    id: 1,
    price: parseEther('50'),
    description: 'Amazon Gift Card',
    category: 'retail',
    imageUrl: 'https://images.pexels.com/photos/1435752/pexels-photo-1435752.jpeg?auto=compress&cs=tinysrgb&w=400',
    expiryDate: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60), // 1 year from now
    isActive: true,
    isListed: false,
  },
  {
    id: 2,
    price: parseEther('22'),
    description: 'Starbucks Gift Card',
    category: 'dining',
    imageUrl: 'https://images.pexels.com/photos/1435752/pexels-photo-1435752.jpeg?auto=compress&cs=tinysrgb&w=400',
    expiryDate: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60),
    isActive: true,
    isListed: false,
  },
  {
    id: 3,
    price: parseEther('14'),
    description: 'Netflix Gift Card',
    category: 'entertainment',
    imageUrl: 'https://images.pexels.com/photos/1435752/pexels-photo-1435752.jpeg?auto=compress&cs=tinysrgb&w=400',
    expiryDate: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60),
    isActive: true,
    isListed: false,
  },
];

// Types
export interface GiftCard {
  price: bigint;
  description: string;
  category: string;
  imageUrl: string;
  expiryDate: bigint;
  isActive: boolean;
  isListed: boolean;
}

// Helper functions
export function getCategoryEnumValue(categoryId: string): number {
  const mapping: Record<string, number> = {
    'gaming': 0,
    'retail': 1,
    'dining': 2,
    'entertainment': 3,
    'travel': 4,
    'tech': 1,
  };
  return mapping[categoryId] ?? 1;
}

export function getCategoryId(enumValue: number): string {
  const mapping: Record<number, string> = {
    0: 'gaming',
    1: 'retail', 
    2: 'dining',
    3: 'entertainment',
    4: 'travel',
  };
  return mapping[enumValue] ?? 'retail';
}

export function getTokenAddress(symbol: string): Address {
  // Return mock address for now
  return '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;
}

// Mock hooks
export function useGiftCard(cardId: number) {
  const [isLoading, setIsLoading] = useState(false); // Start with false
  const [data, setData] = useState<GiftCard | null>(() => {
    // Return data immediately
    const mockCard = MOCK_GIFT_CARDS.find(card => card.id === cardId);
    return mockCard || null;
  });

  return {
    data,
    isLoading,
    error: null,
  };
}

export function useActiveListings() {
  const [isLoading, setIsLoading] = useState(false); // Start with false
  const [data, setData] = useState<bigint[]>([BigInt(1), BigInt(2), BigInt(3)]); // Start with data

  return {
    data,
    isLoading,
    error: null,
  };
}

export function useAvailableCardsByCategory(categoryId: string) {
  const [isLoading, setIsLoading] = useState(false); // Start with false
  const [data, setData] = useState<bigint[]>(() => {
    // Return data immediately
    if (!categoryId) return [];
    
    const filteredCards = MOCK_GIFT_CARDS
      .filter(card => card.category === categoryId)
      .map(card => BigInt(card.id));
    
    return filteredCards;
  });

  // Update data when categoryId changes
  useEffect(() => {
    if (!categoryId) {
      setData([]);
      return;
    }

    const filteredCards = MOCK_GIFT_CARDS
      .filter(card => card.category === categoryId)
      .map(card => BigInt(card.id));
    
    setData(filteredCards);
  }, [categoryId]);

  return {
    data,
    isLoading,
    error: null,
  };
}

export function useUserGiftCards(userAddress?: Address) {
  return {
    data: [],
    isLoading: false,
    error: null,
  };
}

export function useCategoryInventory(categoryId: string) {
  return {
    data: null,
    isLoading: false,
    error: null,
  };
}

export function usePurchaseGiftCard() {
  const [isPending, setIsPending] = useState(false);

  const purchaseGiftCard = async (cardId: number, tokenSymbol: string) => {
    setIsPending(true);
    // Simulate transaction
    setTimeout(() => {
      setIsPending(false);
      console.log(`Mock purchase: Card ${cardId} with ${tokenSymbol}`);
    }, 2000);
  };

  return {
    purchaseGiftCard,
    isPending,
    error: null,
    hash: null,
  };
}

export function useListGiftCard() {
  const [isPending, setIsPending] = useState(false);

  const listGiftCard = async (cardId: number, listPrice: string, tokenSymbol: string) => {
    setIsPending(true);
    setTimeout(() => {
      setIsPending(false);
      console.log(`Mock listing: Card ${cardId} for ${listPrice} ${tokenSymbol}`);
    }, 2000);
  };

  return {
    listGiftCard,
    isPending,
    error: null,
    hash: null,
  };
}

export function useRevealGiftCard() {
  const [isPending, setIsPending] = useState(false);

  const revealGiftCard = async (cardId: number) => {
    setIsPending(true);
    setTimeout(() => {
      setIsPending(false);
      console.log(`Mock reveal: Card ${cardId}`);
    }, 1000);
  };

  return {
    revealGiftCard,
    isPending,
    error: null,
    hash: null,
  };
}

// Placeholder admin and manager hooks
export function useAdminCreateGiftCard() {
  return {
    createGiftCard: () => {},
    isPending: false,
    error: null,
    hash: null,
  };
}

export function useRequestRestock() {
  return {
    requestRestock: () => {},
    isPending: false,
    error: null,
    hash: null,
  };
}

export function useWatchGiftCardPurchased() {
  // Empty implementation
}

// Utility functions
export const formatPrice = (price: bigint) => formatEther(price);
export const parsePrice = (price: string) => parseEther(price);

// Export contract addresses
// export { CONTRACT_ADDRESSES };