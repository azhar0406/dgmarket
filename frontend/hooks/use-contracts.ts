// File: /hooks/use-contracts.ts
// Enhanced wagmi hooks with dynamic categories and improved functionality

import { useReadContract, useWriteContract } from 'wagmi';
import { useMemo } from 'react';
import DGMarketCoreContract from '../../contracts/artifacts/contracts/DGMarketCore.sol/DGMarketCore.json';
const DGMarketCoreABI = DGMarketCoreContract.abi;

// Import dynamic contract address
import { CONTRACT_ADDRESSES } from '../lib/contract-addresses';

const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`;

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

export interface CategoryData {
  categoryId: number;
  name: string;
  count: number;
  threshold: number;
  active: boolean;
  createdAt?: number;
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

// NEW: Hook to get all categories dynamically from contract
export function useAllCategories() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getAllCategories',
  });

  return {
    data: data as string[] || [],
    isLoading,
    error,
  };
}



// NEW: Hook to get category count
export function useCategoryCount() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getCategoryCount',
  });

  return {
    data: data ? Number(data as bigint) : 0,
    isLoading,
    error,
  };
}

// Enhanced hook to get category inventory by name
export function useCategoryInventory(categoryName: string) {
  const shouldFetch = !!categoryName;
  
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getCategoryInventory',
    args: [categoryName],
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
    isLoading: shouldFetch ? isLoading : false,
    error: shouldFetch ? error : null,
  };
}

// Hook to get category inventory by ID
export function useCategoryById(categoryId: number) {
  const shouldFetch = categoryId >= 0;
  
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getCategoryById',
    args: [categoryId],
  });

  const processedData = useMemo(() => {
    if (!data || typeof data !== 'object') return null;
    
    const categoryData = data as any;
    return {
      categoryId: Number(categoryData.categoryId),
      name: categoryData.name as string,
      count: Number(categoryData.count),
      threshold: Number(categoryData.threshold),
      active: categoryData.active as boolean,
      createdAt: Number(categoryData.createdAt),
    } as CategoryData;
  }, [data]);

  return {
    data: processedData,
    isLoading: shouldFetch ? isLoading : false,
    error: shouldFetch ? error : null,
  };
}

// Hook to get specific gift card by ID
export function useGiftCard(cardId: number) {
  const shouldFetch = cardId > 0;
  
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getGiftCard',
    args: [cardId],
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
    isLoading: shouldFetch ? isLoading : false,
    error: shouldFetch ? error : null,
  };
}

// Hook to get gift cards by category
export function useGiftCardsByCategory(category: string) {
  const shouldFetch = !!category;
  
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getGiftCardsByCategory',
    args: [category],
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
    isLoading: shouldFetch ? isLoading : false,
    error: shouldFetch ? error : null,
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

export function useCategoryStatistics() {
  // Get category names from the working hook
  const { data: categoryNames, isLoading: namesLoading, error: namesError } = useAllCategories();
  
  // Since we can't dynamically call hooks, we'll use a different approach
  // We'll call getCategoryInventory for each known category individually
  
  const foodInventory = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getCategoryInventory',
    args: ['Food & Dining'],
  });

  const shoppingInventory = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getCategoryInventory',
    args: ['Shopping'],
  });

  const entertainmentInventory = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getCategoryInventory',
    args: ['Entertainment'],
  });

  const travelInventory = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getCategoryInventory',
    args: ['Travel'],
  });

  const gamingInventory = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getCategoryInventory',
    args: ['Gaming'],
  });

  const statistics = useMemo(() => {
    if (!categoryNames) return null;
    
    // Check if all inventory data is loaded
    const inventories = [foodInventory, shoppingInventory, entertainmentInventory, travelInventory, gamingInventory];
    const allLoaded = inventories.every(inv => !inv.isLoading);
    if (!allLoaded) return null;
    
    // Map category names to their inventory data
    const categoryMap = {
      'Food & Dining': foodInventory.data,
      'Shopping': shoppingInventory.data,
      'Entertainment': entertainmentInventory.data,
      'Travel': travelInventory.data,
      'Gaming': gamingInventory.data,
    };
    
    // Combine category names with their inventory data
    const categoriesWithData = categoryNames.map((name: string) => {
      const inventory = categoryMap[name as keyof typeof categoryMap] as [bigint, bigint, boolean] | undefined;
      return {
        name,
        count: inventory ? Number(inventory[0]) : 0,        // count (BigInt -> number)
        threshold: inventory ? Number(inventory[1]) : 0,    // threshold (BigInt -> number)
        active: inventory ? inventory[2] : true,            // active (boolean)
      };
    });
    
    const totalCards = categoriesWithData.reduce((sum, cat) => sum + cat.count, 0);
    const activeCategories = categoriesWithData.filter(cat => cat.active).length;
    const categoriesNeedingRestock = categoriesWithData.filter(cat => cat.count <= cat.threshold).length;
    
    return {
      totalCards,
      totalCategories: categoriesWithData.length,
      activeCategories,
      categoriesNeedingRestock,
      categories: categoriesWithData,
    };
  }, [categoryNames, foodInventory.data, shoppingInventory.data, entertainmentInventory.data, travelInventory.data, gamingInventory.data]);

  const isLoading = namesLoading || foodInventory.isLoading || shoppingInventory.isLoading || entertainmentInventory.isLoading || travelInventory.isLoading || gamingInventory.isLoading;
  const error = namesError || foodInventory.error || shoppingInventory.error || entertainmentInventory.error || travelInventory.error || gamingInventory.error;

  return {
    data: statistics,
    isLoading,
    error,
  };
}
// Export contract address and ABI for direct use
export { CONTRACT_ADDRESS, DGMarketCoreABI };