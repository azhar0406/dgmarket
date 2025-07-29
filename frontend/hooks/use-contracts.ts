// File: /hooks/use-contracts.ts
// Enhanced wagmi hooks with dynamic categories and improved functionality

import { useReadContract, useWriteContract } from 'wagmi';
import { useMemo } from 'react';
import DGMarketCoreContract from '../../contracts/artifacts/contracts/DGMarketCore.sol/DGMarketCore.json';
const DGMarketCoreABI = DGMarketCoreContract.abi;

const CONTRACT_ADDRESS = '0x74F4abD898D3701DFf5fD7AB8D7991122C0D612B' as const;

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

// NEW: Hook to get all categories with complete data (IDs, counts, etc.)
export function useAllCategoriesWithData() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DGMarketCoreABI,
    functionName: 'getAllCategoriesWithData',
  });

  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length !== 5) return [];
    
    const [categoryIds, categoryNames, categoryCounts, categoryThresholds, categoryActive] = data;
    
    if (!Array.isArray(categoryIds) || !Array.isArray(categoryNames)) return [];
    
    return categoryIds.map((id: bigint, index: number) => ({
      categoryId: Number(id),
      name: categoryNames[index] as string,
      count: Number(categoryCounts[index] as bigint),
      threshold: Number(categoryThresholds[index] as bigint),
      active: categoryActive[index] as boolean,
    })) as CategoryData[];
  }, [data]);

  return {
    data: processedData,
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

// Utility hook to get category statistics
export function useCategoryStatistics() {
  const { data: categoriesWithData, isLoading, error } = useAllCategoriesWithData();
  
  const statistics = useMemo(() => {
    if (!categoriesWithData) return null;
    
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
  }, [categoriesWithData]);

  return {
    data: statistics,
    isLoading,
    error,
  };
}

// Export contract address and ABI for direct use
export { CONTRACT_ADDRESS, DGMarketCoreABI };