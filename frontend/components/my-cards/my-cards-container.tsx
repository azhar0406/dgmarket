'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Shield, ShoppingBag, Gift, Copy, Pin } from 'lucide-react';
import { useMyPurchasedCards, useRevealGiftCardWithFHE } from '@/hooks/use-my-purchased-cards';
import { toast } from 'sonner';

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

  // Now render the real content
  return <MountedMyCards />;
}

// Separate component that only renders after mounting
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
  const { revealCard, isRevealing, revealedCards } = useRevealGiftCardWithFHE(); // Updated to use revealedCards
  const [visibleCodes, setVisibleCodes] = useState<{[key: string]: boolean}>({});
  const [visiblePins, setVisiblePins] = useState<{[key: string]: boolean}>({});

  const handleRevealCard = async (cardId: string) => {
    const success = await revealCard(cardId);
    if (success) {
      toast.success('Gift card revealed successfully!');
    } else {
      toast.error('Failed to reveal gift card');
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

  // ... (keep existing loading, error, and empty state logic)

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" suppressHydrationWarning>
      {purchasedCards.map((card) => {
        const revealedData = revealedCards[card.id]; // Now contains {code, pin}
        const isCodeVisible = visibleCodes[card.id];
        const isPinVisible = visiblePins[card.id];
        const hasRevealedData = !!revealedData;

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
                      disabled={isRevealing}
                    >
                      {isRevealing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mr-2"></div>
                          Decrypting...
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
                        Use the <strong>Gift Card Code</strong> to redeem your card
                      </p>
                      <p className="flex items-center gap-1 mt-1">
                        <Pin className="h-3 w-3" />
                        Enter the <strong>Security PIN</strong> when prompted during redemption
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