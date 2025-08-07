'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, ShoppingBag, Gift, Copy, Pin, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useMyPurchasedCards } from '@/hooks/use-my-purchased-cards';
import { toast } from 'sonner';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES } from '@/lib/contract-addresses';
import { decryptValue } from '@/utils/incoEncryption';
import DGMarketCoreABI from '@/lib/abis/DGMarketCore.json';

// Base Sepolia Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Fallback client
const fallbackPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

// Updated NetworkStatus component for your my-cards-container.tsx
// Replace the existing NetworkStatus function with this one

function NetworkStatus() {
  const { chain } = useAccount();
  const [isChecking, setIsChecking] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);

  // Direct network detection - more reliable than wagmi chain
  useEffect(() => {
    const getCurrentNetwork = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const numericChainId = parseInt(chainId, 16);
          setCurrentChainId(numericChainId);
          console.log('🔍 Current network detected:', numericChainId);
        } catch (error) {
          console.error('Failed to get current network:', error);
        }
      }
    };

    getCurrentNetwork();

    // Listen for network changes
    const handleChainChanged = (chainId: string) => {
      const numericChainId = parseInt(chainId, 16);
      setCurrentChainId(numericChainId);
      console.log('🔄 Network changed to:', numericChainId);
    };

    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Use direct chain detection as primary, wagmi as fallback
  const detectedChainId = currentChainId ?? (chain?.id || null);
  const isCorrectNetwork = detectedChainId === BASE_SEPOLIA_CHAIN_ID;
  const isBaseMainnet = detectedChainId === 8453;

  const getNetworkName = (chainId: number | null) => {
    switch (chainId) {
      case 8453: return 'Base Mainnet';
      case 84532: return 'Base Sepolia';
      case 1: return 'Ethereum Mainnet';
      case 11155111: return 'Sepolia';
      default: return chain?.name || 'Unknown Network';
    }
  };

  const handleSwitchNetwork = async () => {
    setIsChecking(true);
    
    try {
      // Direct MetaMask network switch call
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log('🔄 Attempting to switch to Base Sepolia (84532)...');
        
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x14a34' }], // 84532 in hex
        });
        
        console.log('✅ Network switch request sent to MetaMask');
        
        // Wait for the network to actually change before showing success
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
          try {
            const newChainId = await window.ethereum.request({ method: 'eth_chainId' });
            const newNumericChainId = parseInt(newChainId, 16);
            
            if (newNumericChainId === BASE_SEPOLIA_CHAIN_ID) {
              console.log('✅ Network successfully switched to Base Sepolia');
              setCurrentChainId(BASE_SEPOLIA_CHAIN_ID);
              toast.success('Successfully switched to Base Sepolia!');
              
              // Small delay then reload to ensure UI updates
              setTimeout(() => {
                window.location.reload();
              }, 500);
              break;
            }
          } catch (checkError) {
            console.log('Still checking network switch...');
          }
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          console.log('⚠️ Network switch timeout - but may have succeeded');
          toast.success('Network switch requested - please check MetaMask');
        }
        
      } else {
        throw new Error('MetaMask not detected');
      }
    } catch (error: any) {
      console.error('❌ Network switch failed:', error);
      
      if (error.code === 4001) {
        toast.error('Network switch cancelled by user');
      } else if (error.code === 4902) {
        // Network not added to MetaMask, try adding it
        console.log('🔧 Network not found, attempting to add Base Sepolia...');
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x14a34', // 84532 in hex
              chainName: 'Base Sepolia',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.base.org'],
              blockExplorerUrls: ['https://sepolia-explorer.base.org'],
            }],
          });
          toast.success('Base Sepolia added and switched!');
        } catch (addError: any) {
          console.error('❌ Failed to add network:', addError);
          toast.error('Failed to add Base Sepolia. Please add it manually in MetaMask.');
        }
      } else {
        toast.error(`Failed to switch network: ${error.message}`);
        toast.info('Please switch to Base Sepolia manually in your wallet');
      }
    } finally {
      setIsChecking(false);
    }
  };

  if (isCorrectNetwork) {
    return (
      <Alert className="border-green-200 bg-green-50 text-green-800">
        <Wifi className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between w-full">
          <span>✅ Connected to Base Sepolia - Ready to reveal cards!</span>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Base Sepolia
          </Badge>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <div className="flex items-center justify-between">
          <span>
            {isBaseMainnet ? '⚠️ Connected to Base Mainnet' : '⚠️ Wrong network detected'}
          </span>
          <Badge variant="outline" className="border-yellow-300 text-black">
            {getNetworkName(detectedChainId)}
          </Badge>
        </div>
        <div>
          <p className="text-sm mb-2">
            To reveal your gift cards, please switch to Base Sepolia testnet.
          </p>
          <Button
            size="sm"
            onClick={handleSwitchNetwork}
            disabled={isChecking}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Switching...
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 mr-2" />
                Switch to Base Sepolia
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Direct function to reveal and decrypt gift card
async function revealAndDecryptGiftCard(
  cardId: string, 
  walletClient: any, 
  publicClient: any, 
  address: string
) {
  try {
    console.log('🎯 Starting direct reveal for card:', cardId);

    // First simulate the contract call to check if it will work
    const simulation = await publicClient.simulateContract({
      address: CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
      abi: DGMarketCoreABI,
      functionName: 'getMyGiftCardsWithEncryption',
      args: [],
      account: address as `0x${string}`
    });

    const myCards = simulation.result;
    console.log('📋 User cards found:', myCards.length);

    // Find the specific card
    const card = myCards.find((c: any) => c.cardId.toString() === cardId);
    
    if (!card) {
      throw new Error(`Card ${cardId} not found in your collection`);
    }

    console.log('🎴 Found card:', {
      cardId: card.cardId.toString(),
      isRevealed: card.isRevealed,
      category: card.category
    });

    let encryptedHandles;

    if (card.isRevealed) {
      // Card already revealed - use existing handles
      console.log('✅ Card already revealed');
      encryptedHandles = [card.encryptedCode, card.encryptedPin];
    } else {
      // Need to reveal first
      console.log('📡 Revealing card...');
      
      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
        abi: DGMarketCoreABI,
        functionName: 'revealGiftCard',
        args: [BigInt(cardId)]
      });

      console.log('✅ Reveal transaction:', txHash);
      toast.success('Reveal transaction submitted! Waiting for confirmation...');
      
      // Wait for transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Get updated card data
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

    // Step 2: Decrypt the handles using your utility function
    console.log('🔓 Starting decryption...');
    
    const [decryptedCode, decryptedPin] = await Promise.all([
      decryptValue({
        walletClient,
        handle: encryptedHandles[0],
        valueType: 'code'
      }),
      decryptValue({
        walletClient,
        handle: encryptedHandles[1],
        valueType: 'pin'
      })
    ]);

    console.log('✅ Successfully decrypted gift card!');

    return {
      success: true,
      code: decryptedCode,
      pin: decryptedPin,
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

// My Cards Container with Network Check
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
  const { address, chain } = useAccount();
  
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
      
      {/* Network Status Alert */}
      <NetworkStatus />
      
      <MyPurchasedCards />
    </div>
  );
}

export function MyPurchasedCards() {
  const { address, chain } = useAccount();
  const { data: purchasedCards, isLoading, error, refetch } = useMyPurchasedCards(address);
  
  // Direct state management
  const [revealedCards, setRevealedCards] = useState<{[key: string]: {code: string, pin: string}}>({});
  const [revealingCards, setRevealingCards] = useState<{[key: string]: boolean}>({});
  const [visibleCodes, setVisibleCodes] = useState<{[key: string]: boolean}>({});
  const [visiblePins, setVisiblePins] = useState<{[key: string]: boolean}>({});

  // Wagmi hooks
  const { data: walletClient } = useWalletClient();
  const wagmiPublicClient = usePublicClient();

  const isCorrectNetwork = chain?.id === BASE_SEPOLIA_CHAIN_ID;

  // Direct reveal function
  const handleRevealCard = async (cardId: string) => {
    if (!walletClient || !address) {
      toast.error('Wallet not connected');
      return;
    }

    if (!isCorrectNetwork) {
      toast.error('Please switch to Base Sepolia network first');
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
                      disabled={isThisCardRevealing || !isCorrectNetwork}
                      className={!isCorrectNetwork ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      {isThisCardRevealing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mr-2"></div>
                          Decrypting FHE...
                        </>
                      ) : !isCorrectNetwork ? (
                        <>
                          <WifiOff className="h-4 w-4 mr-2" />
                          Switch Network First
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

                {/* Network Warning for Individual Cards */}
                {!isCorrectNetwork && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <p className="text-xs text-yellow-700 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Switch to Base Sepolia to reveal this card
                    </p>
                  </div>
                )}

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