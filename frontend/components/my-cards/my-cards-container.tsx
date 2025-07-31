'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Shield, ShoppingBag, Gift, Copy, Pin } from 'lucide-react';
import { useMyPurchasedCards } from '@/hooks/use-my-purchased-cards';
import { toast } from 'sonner';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES } from '@/lib/contract-addresses';
import { decryptValue } from '@/utils/incoEncryption'; // Import the decryptValue function
import DGMarketCoreABI from '@/lib/abis/DGMarketCore.json';

// Fallback client
const fallbackPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

// Direct function to reveal and decrypt gift card
async function revealAndDecryptGiftCard(
  cardId: string, 
  walletClient: any, 
  publicClient: any, 
  address: string
) {
  try {
    console.log('🎯 Starting direct reveal for card:', cardId);
    console.log('👤 User address:', address);
    console.log('🔌 Wallet client:', !!walletClient);
    console.log('🌐 Public client:', !!publicClient);

    // Step 1: Debug what msg.sender is being used
    console.log('🔍 Testing different contract call methods...');
    
    // Method 1: Direct public client call (current failing approach)
    console.log('📞 Method 1: Direct publicClient.readContract...');
    try {
      const myCards1 = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
        abi: DGMarketCoreABI,
        functionName: 'getMyGiftCardsWithEncryption',
        args: []
      });
      console.log('✅ Method 1 result:', myCards1);
      console.log('📊 Method 1 card count:', myCards1.length);
    } catch (error1: any) {
      console.error('❌ Method 1 failed:', error1.message);
    }

    // Method 2: Try with simulateContract and account parameter
    console.log('📞 Method 2: simulateContract with account...');
    try {
      const simulation = await publicClient.simulateContract({
        address: CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
        abi: DGMarketCoreABI,
        functionName: 'getMyGiftCardsWithEncryption',
        args: [],
        account: address as `0x${string}` // This should set msg.sender correctly!
      });
      const myCards2 = simulation.result;
      console.log('✅ Method 2 result:', myCards2);
      console.log('📊 Method 2 card count:', myCards2.length);
    } catch (error2: any) {
      console.error('❌ Method 2 failed:', error2.message);
    }

    // Method 3: Try wallet client readContract if available
    if (walletClient && typeof walletClient.readContract === 'function') {
      console.log('📞 Method 3: walletClient.readContract...');
      try {
        const myCards3 = await walletClient.readContract({
          address: CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
          abi: DGMarketCoreABI,
          functionName: 'getMyGiftCardsWithEncryption',
          args: []
        });
        console.log('✅ Method 3 result:', myCards3);
        console.log('📊 Method 3 card count:', myCards3.length);
      } catch (error3: any) {
        console.error('❌ Method 3 failed:', error3.message);
      }
    } else {
      console.log('⚠️ Method 3: walletClient.readContract not available');
    }

    // Now let's use the method that works - try Method 2 first
    console.log('🎯 Using Method 2 (simulateContract with account) for main logic...');
    
    let myCards;
    try {
      const contractResult = await publicClient.simulateContract({
        address: CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
        abi: DGMarketCoreABI,
        functionName: 'getMyGiftCardsWithEncryption',
        args: [],
        account: address as `0x${string}` // CRITICAL: This sets msg.sender correctly!
      });
      myCards = contractResult.result;
    } catch (simulateError: any) {
      console.error('❌ simulateContract failed, falling back to readContract:', simulateError.message);
      // Fallback to Method 1
      myCards = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
        abi: DGMarketCoreABI,
        functionName: 'getMyGiftCardsWithEncryption',
        args: []
      });
    }

    console.log('📋 Final cards result:', myCards);
    console.log('📊 Total cards found:', myCards.length);

    if (myCards.length > 0) {
      console.log('🎴 Card details:');
      myCards.forEach((card: any, index: number) => {
        console.log(`   Card ${index + 1}:`, {
          cardId: card.cardId.toString(),
          owner: card.owner,
          isPurchased: card.isPurchased,
          isRevealed: card.isRevealed,
          description: card.description
        });
      });
    }

    // Find the specific card
    const card = myCards.find((c: any) => c.cardId.toString() === cardId);
    
    if (!card) {
      const availableCardIds = myCards.map((c: any) => c.cardId.toString());
      throw new Error(`Card ${cardId} not found in your collection. Available cards: [${availableCardIds.join(', ')}]. You own ${myCards.length} cards total.`);
    }

    console.log('🎴 Found target card:', {
      cardId: card.cardId.toString(),
      owner: card.owner,
      isPurchased: card.isPurchased,
      isRevealed: card.isRevealed,
      category: card.category,
      description: card.description
    });

    let encryptedHandles;

    if (card.isRevealed) {
      // Card already revealed - use existing handles
      console.log('✅ Card already revealed, using existing handles');
      encryptedHandles = [card.encryptedCode, card.encryptedPin];
    } else {
      // Need to reveal first
      console.log('📡 Card not revealed, calling reveal transaction...');
      
      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
        abi: DGMarketCoreABI,
        functionName: 'revealGiftCard',
        args: [BigInt(cardId)]
      });

      console.log('✅ Reveal transaction:', txHash);
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Get updated card data
      console.log('🔄 Getting updated card data...');
      const updatedResult = await publicClient.simulateContract({
        address: CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
        abi: DGMarketCoreABI,
        functionName: 'getMyGiftCardsWithEncryption',
        args: [],
        account: address as `0x${string}`
      });

      const updatedCards = updatedResult.result;
      const updatedCard = updatedCards.find((c: any) => c.cardId.toString() === cardId);
      
      if (!updatedCard || !updatedCard.isRevealed) {
        throw new Error('Card reveal failed or not confirmed yet');
      }

      encryptedHandles = [updatedCard.encryptedCode, updatedCard.encryptedPin];
    }

    console.log('🔑 Encrypted handles:', encryptedHandles);

    // Step 2: Decrypt the handles
    console.log('🔓 Starting decryption...');
    
    const decryptedData = await decryptWithIncoFHE(walletClient, {
      encryptedCode: encryptedHandles[0],
      encryptedPin: encryptedHandles[1]
    });

    console.log('✅ Successfully decrypted gift card!');

    return {
      success: true,
      code: decryptedData.code,
      pin: decryptedData.pin,
      cardData: card
    };

  } catch (error: any) {
    console.error('❌ Reveal and decrypt failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      code: null,
      pin: null
    };
  }
}

// Decryption function using your utils
async function decryptWithIncoFHE(
  walletClient: any, 
  handles: { encryptedCode: string; encryptedPin: string }
) {
  try {
    console.log('🔐 Starting Inco FHE decryption...');
    console.log('🔑 Input handles:', handles);
    
    // Use your utils functions directly
    const [decryptedCode, decryptedPin] = await Promise.all([
      decryptValue({
        walletClient,
        handle: handles.encryptedCode,
        valueType: 'code'
      }),
      decryptValue({
        walletClient,
        handle: handles.encryptedPin,
        valueType: 'pin'
      })
    ]);
    
    console.log('✅ Final decrypted values:');
    console.log(`   Code: "${decryptedCode}"`);
    console.log(`   PIN: "${decryptedPin}"`);
    
    return {
      code: decryptedCode,
      pin: decryptedPin
    };
    
  } catch (error: any) {
    console.error('❌ Inco FHE decryption failed:', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

export function MyCardsContainer() {
  const [isMounted, setIsMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsClient(true);
  }, []);

  // Show loading until completely mounted
  if (!isMounted || !isClient) {
    return (
      <div className="space-y-6" suppressHydrationWarning>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
            <h2 className="text-2xl font-bold">My Purchased Gift Cards</h2>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="flex gap-2 mt-4">
                <div className="h-8 bg-gray-200 rounded flex-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <MountedMyCards />;
}

function MountedMyCards() {
  const { address } = useAccount();
  
  if (!address) {
    return (
      <div className="text-center py-12" suppressHydrationWarning>
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground mb-4">
          Please connect your wallet to view your purchased gift cards
        </p>
        <Button asChild>
          <a href="/marketplace">Browse Marketplace</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">My Purchased Gift Cards</h2>
        </div>
        <Button asChild variant="outline">
          <a href="/marketplace">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Browse More
          </a>
        </Button>
      </div>
      <MyPurchasedCards />
    </div>
  );
}

export function MyPurchasedCards() {
  const { address } = useAccount();
  const { data: purchasedCards, isLoading, error, refetch } = useMyPurchasedCards(address);
  
  // Direct state management instead of complex hook
  const [revealedCards, setRevealedCards] = useState<{[key: string]: {code: string, pin: string}}>({});
  const [revealingCards, setRevealingCards] = useState<{[key: string]: boolean}>({});
  const [visibleCodes, setVisibleCodes] = useState<{[key: string]: boolean}>({});
  const [visiblePins, setVisiblePins] = useState<{[key: string]: boolean}>({});

  // Wagmi hooks
  const { data: walletClient } = useWalletClient();
  const wagmiPublicClient = usePublicClient();

  // Direct reveal function
  const handleRevealCard = async (cardId: string) => {
    if (!walletClient || !address) {
      toast.error('Wallet not connected');
      return;
    }

    const publicClient = wagmiPublicClient || fallbackPublicClient;
    
    setRevealingCards(prev => ({ ...prev, [cardId]: true }));

    try {
      const result = await revealAndDecryptGiftCard(cardId, walletClient, publicClient, address);
      
      if (result.success && result.code && result.pin) {
        setRevealedCards(prev => ({
          ...prev,
          [cardId]: {
            code: result.code,
            pin: result.pin
          }
        }));
        
        toast.success('Gift card revealed successfully!');
      } else {
        toast.error(`Failed to reveal: ${result.error}`);
      }
    } catch (error: any) {
      console.error('❌ Unexpected error:', error);
      toast.error('Unexpected error occurred');
    } finally {
      setRevealingCards(prev => ({ ...prev, [cardId]: false }));
    }
  };

  const handleToggleCodeVisibility = (cardId: string) => {
    setVisibleCodes(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleTogglePinVisibility = (cardId: string) => {
    setVisiblePins(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Gift card code copied to clipboard!');
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    toast.success('PIN copied to clipboard!');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={refetch}>Try Again</Button>
      </div>
    );
  }

  // Empty state
  if (!purchasedCards || purchasedCards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <Gift className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Gift Cards Yet</h3>
        <p className="text-muted-foreground mb-4">
          You haven't purchased any gift cards yet. Browse our marketplace to get started!
        </p>
        <Button asChild>
          <a href="/marketplace">Browse Marketplace</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" suppressHydrationWarning>
      {purchasedCards.map((card) => {
        const revealedData = revealedCards[card.id];
        const isCodeVisible = visibleCodes[card.id];
        const isPinVisible = visiblePins[card.id];
        const hasRevealedData = !!revealedData;
        const isThisCardRevealing = revealingCards[card.id] || false;

        return (
          <Card key={card.id} className="transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{card.brand}</CardTitle>
                <Badge variant={hasRevealedData ? "secondary" : "default"}>
                  {hasRevealedData ? "Revealed" : "Active"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Value:</span>
                  <span className="font-semibold">${card.value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Category:</span>
                  <span className="text-sm">{card.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Purchased:</span>
                  <span className="text-sm" suppressHydrationWarning>
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Reveal Section */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Encrypted Data</span>
                  </div>
                  {!hasRevealedData && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevealCard(card.id)}
                      disabled={isThisCardRevealing}
                    >
                      {isThisCardRevealing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mr-2"></div>
                          Decrypting FHE...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Reveal Code & PIN
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Gift Card Code Display */}
                {hasRevealedData && (
                  <div className="space-y-3">
                    {/* Gift Card Code Section */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">Gift Card Code</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleCodeVisibility(card.id)}
                            className="h-6 w-6 p-0"
                          >
                            {isCodeVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          {isCodeVisible && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyCode(revealedData.code)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="font-mono text-sm">
                        {isCodeVisible ? (
                          <span className="select-all bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                            {revealedData.code}
                          </span>
                        ) : (
                          <span className="filter blur-sm select-none text-gray-400">
                            {revealedData.code.replace(/./g, '•')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PIN Section */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Pin className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">Security PIN</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTogglePinVisibility(card.id)}
                            className="h-6 w-6 p-0"
                          >
                            {isPinVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          {isPinVisible && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyPin(revealedData.pin)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="font-mono text-sm">
                        {isPinVisible ? (
                          <span className="select-all bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded">
                            {revealedData.pin}
                          </span>
                        ) : (
                          <span className="filter blur-sm select-none text-gray-400">
                            {revealedData.pin.replace(/./g, '•')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Usage Instructions */}
                    <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded p-2">
                      <p className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Real values decrypted via <strong>Inco FHE</strong>
                      </p>
                      <p className="flex items-center gap-1 mt-1">
                        <Gift className="h-3 w-3" />
                        Decrypted from blockchain encryption
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Shield className="h-3 w-3" />
                <span>Protected by Inco FHE encryption</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}