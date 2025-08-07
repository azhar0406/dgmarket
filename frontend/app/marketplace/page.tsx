// app/marketplace/page.tsx
// Updated marketplace page with Base Mainnet network detection and ETH-focused payments

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { formatUnits } from "viem";
import { toast } from 'sonner';
import { useAccount, useSwitchChain } from 'wagmi';
import { Navigation } from "@/components/navigation/navigation";
import { Footer } from "@/components/layout/footer";
import { EnhancedGiftCard } from "@/components/marketplace/enhanced-gift-card";
import {
  useActiveListings,
  useAllCategories,
  useCategoryStatistics,
} from "@/hooks/use-contracts";
import { CONTRACT_ADDRESSES } from '@/lib/contract-addresses';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ShoppingCart,
  Search,
  Filter,
  TrendingUp,
  Zap,
  AlertTriangle,
  Wifi,
  WifiOff,
} from "lucide-react";

// Base Mainnet Chain ID for ETH payments
const BASE_MAINNET_CHAIN_ID = 8453;

// Updated MarketplaceNetworkStatus component for your marketplace/page.tsx
// Replace the existing MarketplaceNetworkStatus function with this one

function MarketplaceNetworkStatus() {
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
  const isCorrectNetwork = detectedChainId === BASE_MAINNET_CHAIN_ID;
  const isBaseSepolia = detectedChainId === 84532;

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
        console.log('🔄 Attempting to switch to Base Mainnet (8453)...');
        
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // 8453 in hex
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
            
            if (newNumericChainId === BASE_MAINNET_CHAIN_ID) {
              console.log('✅ Network successfully switched to Base Mainnet');
              setCurrentChainId(BASE_MAINNET_CHAIN_ID);
              toast.success('Successfully switched to Base Mainnet!');
              
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
        console.log('🔧 Network not found, attempting to add Base Mainnet...');
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105', // 8453 in hex
              chainName: 'Base Mainnet',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
          toast.success('Base Mainnet added and switched!');
        } catch (addError: any) {
          console.error('❌ Failed to add network:', addError);
          toast.error('Failed to add Base Mainnet. Please add it manually in MetaMask.');
        }
      } else {
        toast.error(`Failed to switch network: ${error.message}`);
        toast.info('Please switch to Base Mainnet manually in your wallet');
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
          <span>✅ Connected to Base Mainnet - Ready to purchase with ETH!</span>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Base Mainnet
          </Badge>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 text-orange-800">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <div className="flex items-center justify-between">
          <span>
            {isBaseSepolia ? '⚠️ Connected to Base Sepolia' : '⚠️ Wrong network detected'}
          </span>
          <Badge variant="outline" className="border-orange-300 text-black">
            {getNetworkName(detectedChainId)}
          </Badge>
        </div>
        <div>
          <p className="text-sm mb-2">
            To purchase gift cards with ETH, please switch to Base Mainnet.
          </p>
          <Button
            size="sm"
            onClick={handleSwitchNetwork}
            disabled={isChecking}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Switching...
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 mr-2" />
                Switch to Base Mainnet
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default function MarketplacePage() {
  const [isClient, setIsClient] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "price-asc" | "price-desc" | "newest" | "oldest"
  >("newest");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { chain } = useAccount();
  const isCorrectNetwork = chain?.id === BASE_MAINNET_CHAIN_ID;

  // Get live contract data
  const {
    data: listings,
    isLoading: listingsLoading,
    error: listingsError,
    refetch: refetchListings,
  } = useActiveListings();
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useAllCategories();
  const { data: statistics, isLoading: statsLoading } = useCategoryStatistics();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle purchase success - refresh marketplace data
  const handlePurchaseSuccess = useCallback(() => {
    console.log('Purchase successful! Refreshing marketplace...');
    
    // Force refresh of marketplace data
    if (refetchListings) {
      refetchListings();
    }
    
    // Alternative: Force component refresh
    setRefreshTrigger(prev => prev + 1);
    
    // Show success message
    toast.success('🎉 Purchase successful! Marketplace updated.');
  }, [refetchListings]);

  // Transform contract data to marketplace format
  const transformedListings = useMemo(() => {
    if (!listings) return [];

    return listings.map((listing) => ({
      id: listing.cardId.toString(),
      title: listing.description,
      price: parseFloat(formatUnits(listing.publicPrice, 6)), // USDC 6 decimals
      category: listing.category,
      image: listing.imageUrl || null,
      seller: listing.owner,
      creator: listing.creator,
      isActive: listing.isActive,
      isRevealed: listing.isRevealed,
      expiryDate: new Date(Number(listing.expiryDate) * 1000),
      createdAt: new Date(Number(listing.createdAt) * 1000),
      description: listing.description,
      originalCardId: listing.cardId,
      originalPrice: listing.publicPrice,
    }));
  }, [listings, refreshTrigger]);

  // Get category counts from transformed listings
  const categoryInventories = useMemo(() => {
    const inventories: Record<string, number> = {};

    if (categoriesData) {
      categoriesData.forEach((categoryName) => {
        const liveCount = transformedListings.filter(
          (listing) => listing.category === categoryName
        ).length;
        inventories[categoryName] = liveCount;
      });
    }

    return inventories;
  }, [transformedListings, categoriesData]);

  // Filter and sort listings
  const filteredAndSortedListings = useMemo(() => {
    let filtered = transformedListings;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (listing) => listing.category === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (listing) =>
          listing.title.toLowerCase().includes(query) ||
          listing.category.toLowerCase().includes(query) ||
          listing.description.toLowerCase().includes(query)
      );
    }

    // Sort listings
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
    }

    return filtered;
  }, [transformedListings, selectedCategory, searchQuery, sortBy]);

  const isLoading = listingsLoading || categoriesLoading;
  const error = listingsError || categoriesError;

  // Server-side rendering placeholder
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-16 bg-background border-b flex items-center px-4">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="ml-auto flex gap-2">
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>

        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
              Gift Card Marketplace
            </h1>
            <p className="text-muted-foreground mt-2">
              Browse and purchase gift cards from the community
            </p>
          </div>

          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading marketplace...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {/* Header with ETH Payment Focus */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-orange-500 bg-clip-text text-transparent">
            DGMarket - ETH Cross-Chain Gift Cards
          </h1>
          <p className="text-muted-foreground mt-2">
            Purchase gift cards with ETH via automated cross-chain swaps
          </p>

          {/* ETH Payment Method Banner - Simplified */}
          <div className="mt-6">
            <Card className="bg-gradient-to-r from-orange-50 to-blue-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8 text-orange-600" />
                  <div>
                    <h3 className="font-semibold text-orange-900">ETH Cross-Chain Payment</h3>
                    <p className="text-sm text-orange-700">
                      Pay with ETH on Base Mainnet → Auto-swap to USDC → Purchase gift card
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Network Status Alert */}
          <div className="mt-4">
            <MarketplaceNetworkStatus />
          </div>

          {/* Simplified Process Explanation */}
          <Alert className="mt-4">
            <Zap className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong> Pay with ETH on Base Mainnet! Our system uses 
              OKX DEX to swap ETH → USDC and purchase your gift card automatically. 
              Cards appear in "My Cards" within 2-3 minutes.
            </AlertDescription>
          </Alert>

          {/* Dynamic Statistics */}
          {statistics && !statsLoading && (
            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>{statistics.totalCards} total cards</span>
              </div>
              <div>{statistics.activeCategories} active categories</div>
              {statistics.categoriesNeedingRestock > 0 && (
                <div className="text-orange-500">
                  {statistics.categoriesNeedingRestock} categories need restocking
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              Loading gift cards from blockchain...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-destructive mb-2">
                Failed to load marketplace
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {error.message}
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Marketplace Content */}
        {!isLoading && !error && (
          <>
            {/* Live Data Indicator */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-lg text-foreground">
                {transformedListings.length} gift card
                {transformedListings.length !== 1 ? "s" : ""} available
                {categoriesData &&
                  ` across ${categoriesData.length} categories`}
              </p>

              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">
                  Live blockchain data
                </span>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="mb-8 space-y-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search gift cards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-background border-border"
                  />
                </div>

                {/* Sort Dropdown */}
                <div className="lg:w-56">
                  <Select
                    value={sortBy}
                    onValueChange={(value: any) => setSortBy(value)}
                  >
                    <SelectTrigger className="h-11 bg-background border-border">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="price-asc">
                        Price: Low to High
                      </SelectItem>
                      <SelectItem value="price-desc">
                        Price: High to Low
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Category Filter */}
              <div className="flex items-center gap-3 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">
                  Filter by category:
                </span>

                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                  className="rounded-full h-8"
                >
                  All ({transformedListings.length})
                </Button>

                {/* Dynamic categories from contract */}
                {categoriesData &&
                  categoriesData.map((categoryName, index) => (
                    <Button
                      key={index}
                      variant={
                        selectedCategory === categoryName
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedCategory(categoryName)}
                      disabled={categoryInventories[categoryName] === 0}
                      className="rounded-full h-8"
                    >
                      {categoryName} ({categoryInventories[categoryName] || 0})
                    </Button>
                  ))}

                {/* Loading categories indicator */}
                {categoriesLoading && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs text-muted-foreground">
                      Loading categories...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Results Info */}
            <div className="mb-6">
              <p className="text-muted-foreground">
                {filteredAndSortedListings.length} result
                {filteredAndSortedListings.length !== 1 ? "s" : ""}
                {selectedCategory !== "all" && ` in ${selectedCategory}`}
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>

            {/* Gift Cards Grid with Enhanced Component */}
            {filteredAndSortedListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedListings.map((listing) => (
                  <div key={`${listing.id}-${refreshTrigger}`} className="h-full">
                    <EnhancedGiftCard 
                      listing={listing} 
                      onPurchaseSuccess={handlePurchaseSuccess}
                      isCorrectNetwork={isCorrectNetwork}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No gift cards found
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || selectedCategory !== "all"
                      ? "Try adjusting your search or category filter"
                      : "No gift cards are currently available"}
                  </p>
                  {(selectedCategory !== "all" || searchQuery) && (
                    <Button
                      onClick={() => {
                        setSelectedCategory("all");
                        setSearchQuery("");
                      }}
                      variant="outline"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Cross-Chain Contract Info Footer */}
            <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Base Mainnet Info - Primary */}
              <div className="p-6 bg-orange-50/50 rounded-lg border border-orange-200/50">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  🌉 Base Mainnet (ETH Payments)
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>SimpleBridge:</span>
                    <code className="text-foreground font-mono bg-background/50 px-2 py-1 rounded text-xs">
                      0xF7cF...dd4Ba
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span>Network ID:</span>
                    <span className="text-foreground">8453</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="text-foreground">ETH via OKX DEX</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto-Swap:</span>
                    <span className="text-foreground font-semibold">
                      ETH → USDC
                    </span>
                  </div>
                </div>
              </div>

              {/* Base Sepolia Info - Secondary */}
              <div className="p-6 bg-blue-50/50 rounded-lg border border-blue-200/50">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  🔗 Base Sepolia (Gift Card Storage)
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>DGMarket Core:</span>
                    <code className="text-foreground font-mono bg-background/50 px-2 py-1 rounded text-xs">
                      {CONTRACT_ADDRESSES.DGMARKET_CORE.slice(0, 8)}...{CONTRACT_ADDRESSES.DGMARKET_CORE.slice(-6)}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span>Network ID:</span>
                    <span className="text-foreground">84532</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gift Cards:</span>
                    <span className="text-foreground">Encrypted with FHE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Listings:</span>
                    <span className="text-foreground font-semibold">
                      {transformedListings.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cross-Chain Flow Explanation */}
            <div className="mt-8 p-6 bg-gradient-to-r from-orange-50/50 via-white to-blue-50/50 rounded-lg border">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                ⚡ Cross-Chain Payment Flow
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-orange-100 rounded-lg">
                  <div className="font-semibold text-orange-900 mb-1">1. Pay ETH</div>
                  <div className="text-orange-700 text-xs">Base Mainnet</div>
                </div>
                <div className="text-center p-3 bg-yellow-100 rounded-lg">
                  <div className="font-semibold text-yellow-900 mb-1">2. OKX Swap</div>
                  <div className="text-yellow-700 text-xs">ETH → USDC</div>
                </div>
                <div className="text-center p-3 bg-purple-100 rounded-lg">
                  <div className="font-semibold text-purple-900 mb-1">3. Bridge Signal</div>
                  <div className="text-purple-700 text-xs">Cross-chain event</div>
                </div>
                <div className="text-center p-3 bg-green-100 rounded-lg">
                  <div className="font-semibold text-green-900 mb-1">4. Gift Card</div>
                  <div className="text-green-700 text-xs">Assigned to wallet</div>
                </div>
              </div>
            </div>

            {/* Dynamic Categories List */}
            {categoriesData && categoriesData.length > 0 && (
              <div className="mt-6 p-6 bg-muted/20 rounded-lg border border-border/30">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Available Categories:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {categoriesData.map((categoryName, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {categoryName} ({categoryInventories[categoryName] || 0})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}