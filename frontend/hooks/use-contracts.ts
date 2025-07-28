// File: /hooks/use-contracts.ts
// Simple wagmi hooks without conditional queries - Maximum compatibility

import { useReadContract, useWriteContract } from 'wagmi';
import { useMemo } from 'react';
import DGMarketCoreABI from '@/lib/abis/DGMarketCore.json';

const CONTRACT_ADDRESS = '0x8b1587091470Da7f387e0d93730f7256f09DE185' as const;

// Types based on confirmed contract structure
export interface GiftCard {
  cardId: bigint;
  publicPrice: bigint;
  owner: string;
  creator: string;
  expiryDate: bigint;
  category: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  isRevealed: boolean;
  createdAt: bigint;
}

export interface CategoryInventory {
  count: bigint;
  threshold: bigint;
  active: boolean;
}

// Hook to get all active gift cards
export function useActiveListings() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getAllGiftCards',
  });

  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    // Filter only active cards and transform the data
    return (data as GiftCard[])
      .filter(card => card.isActive)
      .map(card => ({
        cardId: card.cardId,
        publicPrice: card.publicPrice,
        owner: card.owner,
        creator: card.creator,
        expiryDate: card.expiryDate,
        category: card.category,
        description: card.description,
        imageUrl: card.imageUrl,
        isActive: card.isActive,
        isRevealed: card.isRevealed,
        createdAt: card.createdAt,
      }));
  }, [data]);

  return {
    data: processedData,
    isLoading,
    error,
    refetch,
  };
}

// Hook to get all gift cards (including inactive)
export function useAllGiftCards() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getAllGiftCards',
  });

  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    return (data as GiftCard[]).map(card => ({
      cardId: card.cardId,
      publicPrice: card.publicPrice,
      owner: card.owner,
      creator: card.creator,
      expiryDate: card.expiryDate,
      category: card.category,
      description: card.description,
      imageUrl: card.imageUrl,
      isActive: card.isActive,
      isRevealed: card.isRevealed,
      createdAt: card.createdAt,
    }));
  }, [data]);

  return {
    data: processedData,
    isLoading,
    error,
    refetch,
  };
}

// Simplified hook to get category inventory for Gaming (always works)
export function useGamingCategoryInventory() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getCategoryInventory',
    args: ['Gaming'],
  });

  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return null;
    
    return {
      count: data[0] as bigint,
      threshold: data[1] as bigint,
      active: data[2] as boolean,
    };
  }, [data]);

  return {
    data: processedData,
    isLoading,
    error,
  };
}

// Hook to get specific gift card by ID (simplified - always fetches card 1)
export function useFirstGiftCard() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getGiftCard',
    args: [1],
  });

  const processedData = useMemo(() => {
    if (!data || typeof data !== 'object') return null;
    
    const card = data as GiftCard;
    return {
      cardId: card.cardId,
      publicPrice: card.publicPrice,
      owner: card.owner,
      creator: card.creator,
      expiryDate: card.expiryDate,
      category: card.category,
      description: card.description,
      imageUrl: card.imageUrl,
      isActive: card.isActive,
      isRevealed: card.isRevealed,
      createdAt: card.createdAt,
    };
  }, [data]);

  return {
    data: processedData,
    isLoading,
    error,
  };
}

// Individual category name hooks (no conditional logic)
export function useCategory0() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'categories',
    args: [0],
  });

  return {
    data: data as string,
    isLoading,
    error,
  };
}

export function useCategory1() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'categories',
    args: [1],
  });

  return {
    data: data as string,
    isLoading,
    error,
  };
}

export function useCategory2() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'categories',
    args: [2],
  });

  return {
    data: data as string,
    isLoading,
    error,
  };
}

export function useCategory3() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'categories',
    args: [3],
  });

  return {
    data: data as string,
    isLoading,
    error,
  };
}

export function useCategory4() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'categories',
    args: [4],
  });

  return {
    data: data as string,
    isLoading,
    error,
  };
}

// Hook to get all category names using individual hooks
export function useAllCategories() {
  const category0 = useCategory0();
  const category1 = useCategory1();
  const category2 = useCategory2();
  const category3 = useCategory3();
  const category4 = useCategory4();

  const isLoading = category0.isLoading || category1.isLoading || category2.isLoading || category3.isLoading || category4.isLoading;
  const error = category0.error || category1.error || category2.error || category3.error || category4.error;

  const categories = useMemo(() => {
    if (isLoading || error) return [];
    
    return [
      category0.data,
      category1.data,
      category2.data,
      category3.data,
      category4.data,
    ].filter(Boolean) as string[];
  }, [
    category0.data,
    category1.data,
    category2.data,
    category3.data,
    category4.data,
    isLoading,
    error,
  ]);

  return {
    data: categories,
    isLoading,
    error,
  };
}

// Hook for purchasing a gift card
export function usePurchaseGiftCard() {
  const { writeContract, isPending, error } = useWriteContract();

  const purchaseGiftCard = async (cardId: number, price: bigint) => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: DGMarketCoreABI,
        functionName: 'purchaseGiftCard',
        args: [cardId],
        value: price,
      });
    } catch (err) {
      console.error('Purchase failed:', err);
      throw err;
    }
  };

  return {
    purchaseGiftCard,
    isPending,
    error,
  };
}

// Hook for gift cards by category
export function useGiftCardsByCategory(category: string) {
  const { data: allGiftCards, isLoading, error } = useActiveListings();

  const filteredCards = useMemo(() => {
    if (!allGiftCards || !category) return [];
    
    return allGiftCards.filter(card => card.category === category);
  }, [allGiftCards, category]);

  return {
    data: filteredCards,
    isLoading,
    error,
  };
}

// Hook to check if contract supports an interface
export function useSupportsInterface() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'supportsInterface',
    args: ['0x01ffc9a7'], // ERC165 interface ID
  });

  return {
    data: data as boolean,
    isLoading,
    error,
  };
}

// Export contract address and ABI for direct use
export { CONTRACT_ADDRESS, DGMarketCoreABI };