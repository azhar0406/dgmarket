// frontend/hooks/use-user-cards.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { NETWORK_CONFIG_CROSS_CHAIN, PAYMENT_CONFIG, DEBUG_CONFIG } from '@/lib/constants';
import { useToast } from './use-toast';

// Import your DGMarketCore ABI - you'll need to add this
// import { DGMarketCoreABI } from '@/lib/abis/DGMarketCore';

interface GiftCard {
  cardId: number;
  title: string;
  brand: string;
  category: string;
  price: number;
  imageUrl?: string;
  isPurchased: boolean;
  owner: string;
  purchasedAt?: number;
  isRevealed?: boolean;
}

interface UseUserCardsReturn {
  cards: GiftCard[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  newCardCount: number; // Count of cards added since last check
  clearNewCardCount: () => void;
}

export function useUserCards(): UseUserCardsReturn {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { toast } = useToast();
  
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCardCount, setNewCardCount] = useState(0);
  const [lastCardCount, setLastCardCount] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  // Debug logging utility
  const debugLog = useCallback((message: string, data?: any) => {
    if (DEBUG_CONFIG.enabled) {
      console.log(`[User Cards] ${message}`, data);
    }
  }, []);

  // Fetch user's gift cards from the contract
  const fetchUserCards = useCallback(async (showLoading = true) => {
    if (!address || !publicClient || !isConnected) {
      debugLog('Cannot fetch - missing requirements', { address, publicClient: !!publicClient, isConnected });
      return;
    }

    // Prevent too frequent calls
    const now = Date.now();
    if (now - lastFetchRef.current < 5000) { // 5 second minimum between calls
      return;
    }
    lastFetchRef.current = now;

    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    
    try {
      debugLog('Fetching user cards for address', address);
      
      // Get user's card IDs from contract
      // Note: You'll need to replace this with your actual ABI
      const userCardIds = await publicClient.readContract({
        address: NETWORK_CONFIG_CROSS_CHAIN.BASE_SEPOLIA.contracts.DGMARKET_CORE as `0x${string}`,
        abi: [
          {
            "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
            "name": "getUserGiftCards",
            "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
            "stateMutability": "view",
            "type": "function"
          }
        ], // Replace with actual DGMarketCoreABI
        functionName: 'getUserGiftCards',
        args: [address],
      });
      
      debugLog('Raw card IDs from contract', userCardIds);

      if (!userCardIds || (userCardIds as any[]).length === 0) {
        setCards([]);
        setNewCardCount(0);
        setLastCardCount(0);
        return;
      }

      // Fetch details for each card
      const cardPromises = (userCardIds as any[]).map(async (cardId: bigint) => {
        try {
          // Get card core data
          const cardCore = await publicClient.readContract({
            address: NETWORK_CONFIG_CROSS_CHAIN.BASE_SEPOLIA.contracts.DGMARKET_CORE as `0x${string}`,
            abi: [
              {
                "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "name": "cardCores",
                "outputs": [
                  {"internalType": "address", "name": "owner", "type": "address"},
                  {"internalType": "uint256", "name": "publicPrice", "type": "uint256"},
                  {"internalType": "bool", "name": "isPurchased", "type": "bool"},
                  {"internalType": "bool", "name": "isActive", "type": "bool"}
                ],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: 'cardCores',
            args: [cardId],
          }) as any;

          // Get card metadata
          const cardMeta = await publicClient.readContract({
            address: NETWORK_CONFIG_CROSS_CHAIN.BASE_SEPOLIA.contracts.DGMARKET_CORE as `0x${string}`,
            abi: [
              {
                "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "name": "cardMetas",
                "outputs": [
                  {"internalType": "string", "name": "title", "type": "string"},
                  {"internalType": "string", "name": "brand", "type": "string"},
                  {"internalType": "string", "name": "category", "type": "string"},
                  {"internalType": "string", "name": "imageUrl", "type": "string"}
                ],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: 'cardMetas',
            args: [cardId],
          }) as any;

          // Get card status for purchase timestamp
          const cardStatus = await publicClient.readContract({
            address: NETWORK_CONFIG_CROSS_CHAIN.BASE_SEPOLIA.contracts.DGMARKET_CORE as `0x${string}`,
            abi: [
              {
                "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "name": "cardStatuses",
                "outputs": [
                  {"internalType": "uint256", "name": "purchasedAt", "type": "uint256"}
                ],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: 'cardStatuses',
            args: [cardId],
          }) as any;

          return {
            cardId: Number(cardId),
            title: cardMeta[0] || `Gift Card #${cardId}`,
            brand: cardMeta[1] || 'Unknown Brand',
            category: cardMeta[2] || 'General',
            price: Number(cardCore[1]) / 1000000, // Convert from USDC decimals (6)
            imageUrl: cardMeta[3] || undefined,
            isPurchased: cardCore[2],
            owner: cardCore[0],
            purchasedAt: Number(cardStatus[0]) * 1000, // Convert to milliseconds
            isRevealed: false, // You can add logic to check if card is revealed
          } as GiftCard;
        } catch (error) {
          debugLog('Error fetching card details', { cardId, error });
          // Return a fallback card object
          return {
            cardId: Number(cardId),
            title: `Gift Card #${cardId}`,
            brand: 'Unknown',
            category: 'General',
            price: 0,
            isPurchased: true,
            owner: address,
            purchasedAt: Date.now(),
          } as GiftCard;
        }
      });

      const fetchedCards = await Promise.all(cardPromises);
      const sortedCards = fetchedCards.sort((a, b) => (b.purchasedAt || 0) - (a.purchasedAt || 0));
      
      debugLog('Fetched cards', { count: sortedCards.length, cards: sortedCards });

      // Check for new cards
      const currentCount = sortedCards.length;
      if (lastCardCount > 0 && currentCount > lastCardCount) {
        const newCards = currentCount - lastCardCount;
        setNewCardCount(prev => prev + newCards);
        
        // Show notification for new cards
        toast({
          title: "New Gift Card Available!",
          description: `${newCards} new gift card${newCards > 1 ? 's' : ''} added to your collection.`,
        });
        
        debugLog('New cards detected', { newCards, currentCount, lastCardCount });
      }

      setCards(sortedCards);
      setLastCardCount(currentCount);
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch gift cards';
      debugLog('Fetch error', { error, errorMessage });
      setError(errorMessage);
      
      // Don't show error toast for routine background fetches
      if (showLoading) {
        toast({
          title: "Error Loading Cards",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [address, publicClient, isConnected, lastCardCount, toast, debugLog]);

  // Clear new card count (call when user views the cards)
  const clearNewCardCount = useCallback(() => {
    setNewCardCount(0);
  }, []);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!address || !isConnected) {
      debugLog('Clearing interval - user disconnected');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCards([]);
      setNewCardCount(0);
      setLastCardCount(0);
      return;
    }

    // Initial fetch
    fetchUserCards(true);

    // Set up polling interval for cross-chain purchases
    const intervalMs = PAYMENT_CONFIG.monitoring.cardRefreshInterval;
    debugLog('Setting up card refresh interval', { intervalMs });
    
    intervalRef.current = setInterval(() => {
      debugLog('Auto-refreshing user cards');
      fetchUserCards(false); // Don't show loading for background refreshes
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [address, isConnected, fetchUserCards]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    await fetchUserCards(true);
  }, [fetchUserCards]);

  return {
    cards,
    loading,
    error,
    refetch,
    newCardCount,
    clearNewCardCount,
  };
}