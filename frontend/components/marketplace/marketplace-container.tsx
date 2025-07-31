// File: /components/marketplace/marketplace-container.tsx
// Enhanced marketplace with purchase functionality

'use client';

import { useState, useMemo, useCallback } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { toast } from 'sonner';
import { useActiveListings } from '@/hooks/use-contracts';
import { 
  usePurchaseGiftCard, 
  useUSDCData, 
  checkSufficientAllowance, 
  getPurchaseButtonText 
} from '@/hooks/use-purchase';
import { DGMARKET_CORE_ADDRESS } from '@/lib/contract-addresses';
import DGMarketCoreABI from '@/lib/abis/DGMarketCore.json';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShoppingCart, Search, Filter } from 'lucide-react';

// Contract categories from your verified data
const CATEGORIES = [
  'Food & Dining',
  'Shopping', 
  'Entertainment',
  'Travel',
  'Gaming'
];

// Enhanced Gift Card Component with Purchase Functionality
function SimpleGiftCard({ listing, onPurchaseSuccess }: { 
  listing: any; 
  onPurchaseSuccess?: () => void; 
}) {
  const [imageError, setImageError] = useState(false);
  
  // Purchase functionality
  const { purchaseGiftCard, isLoading, currentStep } = usePurchaseGiftCard();
  const { address, usdcBalance, currentAllowance } = useUSDCData(
    DGMARKET_CORE_ADDRESS as `0x${string}`
  );

  // Calculate allowance check
  const priceInWei = parseUnits(listing.price.toString(), 6);
  const hasSufficientAllowance = checkSufficientAllowance(currentAllowance, priceInWei);

  const handlePurchase = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Check USDC balance
    const balanceInUSDC = usdcBalance ? Number(usdcBalance) / 1e6 : 0;
    if (balanceInUSDC < listing.price) {
      toast.error(`Insufficient USDC balance. You have ${balanceInUSDC.toFixed(2)} USDC, need ${listing.price.toFixed(2)} USDC`);
      return;
    }

    const result = await purchaseGiftCard(
      listing.id,
      listing.price,
      DGMARKET_CORE_ADDRESS as `0x${string}`,
      DGMarketCoreABI,
      address as `0x${string}`
    );

    if (result.success && onPurchaseSuccess) {
      onPurchaseSuccess();
    }
  };

  const buttonText = getPurchaseButtonText(
    !!address,
    isLoading,
    currentStep,
    listing.isActive,
    hasSufficientAllowance,
    listing.price
  );

  const getCategoryColor = (category: string) => {
    const colors = {
      'Food & Dining': 'bg-orange-100 text-orange-800 border-orange-200',
      'Shopping': 'bg-blue-100 text-blue-800 border-blue-200',
      'Entertainment': 'bg-purple-100 text-purple-800 border-purple-200',
      'Travel': 'bg-green-100 text-green-800 border-green-200',
      'Gaming': 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const isButtonDisabled = !listing.isActive || isLoading || !address;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <div className="relative">
        {/* Gift Card Image */}
        <div className="aspect-[3/2] overflow-hidden rounded-t-lg bg-gradient-to-br from-gray-100 to-gray-200">
          {!imageError && listing.image ? (
            <img
              src={listing.image}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Gift Card</p>
                <p className="text-xs text-gray-400">{listing.category}</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant={listing.isActive ? "default" : "secondary"} className="text-xs">
            {listing.isActive ? "Active" : "Inactive"}
          </Badge>
          
          {listing.isRevealed && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              Revealed
            </Badge>
          )}

          {!listing.isRevealed && (
            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
              Hidden
            </Badge>
          )}
        </div>

        {/* Price Badge - FIXED: USDC instead of ETH */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-white text-gray-900 border shadow-sm font-semibold">
            ${listing.price.toFixed(2)} USDC
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Category */}
        <div className="mb-2">
          <Badge variant="outline" className={`text-xs ${getCategoryColor(listing.category)}`}>
            {listing.category}
          </Badge>
        </div>

        {/* Title and Description */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
            {listing.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {listing.description}
          </p>
        </div>

        {/* Contract Details */}
        <div className="mb-4 p-2 bg-gray-50 rounded text-xs space-y-1">
          <div>
            <span className="text-gray-600">Card ID:</span>
            <code className="text-gray-800 ml-1">#{listing.id}</code>
          </div>
          <div>
            <span className="text-gray-600">Owner:</span>
            <code className="text-gray-800 ml-1">{listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</code>
          </div>
        </div>

        {/* USDC Balance Display */}
        {address && usdcBalance && (
          <div className="mb-3 text-center">
            <p className="text-xs text-gray-500">
              Your USDC balance: ${(Number(usdcBalance) / 1e6).toFixed(2)}
            </p>
            {currentAllowance && (
              <p className="text-xs text-gray-500">
                Allowance: ${(Number(currentAllowance) / 1e6).toFixed(2)} USDC
              </p>
            )}
          </div>
        )}

        {/* Purchase Button with Full Functionality */}
        <Button 
          className={`w-full ${currentStep === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}`}
          disabled={isButtonDisabled}
          onClick={handlePurchase}
        >
          {isLoading && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          <ShoppingCart className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>

        <div className="text-xs text-gray-500 text-center mt-2">
          {listing.isRevealed ? 'Details visible' : 'Details hidden until revealed'}
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketplaceContainer() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'newest' | 'oldest'>('newest');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get live contract data with refetch capability
  const { data: listings, isLoading, error, refetch } = useActiveListings();

  // Handle purchase success - refresh marketplace data
  const handlePurchaseSuccess = useCallback(() => {
    console.log('Purchase successful! Refreshing marketplace...');
    
    // Force refresh of marketplace data
    if (refetch) {
      refetch();
    }
    
    // Alternative: Force component refresh
    setRefreshTrigger(prev => prev + 1);
    
    // Show success message
    toast.success('🎉 Purchase successful! Marketplace updated.');
  }, [refetch]);

  // Transform contract data to marketplace format
  const transformedListings = useMemo(() => {
    if (!listings) return [];
    
    return listings.map(listing => ({
      id: listing.cardId.toString(),
      title: listing.description,
      price: parseFloat(formatUnits(listing.publicPrice, 6)), // FIXED: USDC 6 decimals
      category: listing.category,
      image: listing.imageUrl || '/placeholder-gift-card.jpg',
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
  }, [listings, refreshTrigger]); // Added refreshTrigger to dependencies

  // Get category counts
  const categoryInventories = useMemo(() => {
    const inventories: Record<string, number> = {};
    
    CATEGORIES.forEach(category => {
      const categoryCount = transformedListings.filter(listing => listing.category === category).length;
      inventories[category] = categoryCount;
    });
    
    return inventories;
  }, [transformedListings]);

  // Filter and sort listings
  const filteredAndSortedListings = useMemo(() => {
    let filtered = transformedListings;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(listing => listing.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(query) ||
        listing.category.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query)
      );
    }

    // Sort listings
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
      break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
    }

    return filtered;
  }, [transformedListings, selectedCategory, searchQuery, sortBy]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading gift cards from blockchain...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-2">Failed to load gift cards</p>
            <p className="text-gray-600">Error: {error.message}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DGMarket</h1>
        <p className="text-gray-600">
          Discover {transformedListings.length} gift card{transformedListings.length !== 1 ? 's' : ''} on the blockchain
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search gift cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Sort Dropdown */}
          <div className="lg:w-48">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600 mr-2">Category:</span>
          
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All ({transformedListings.length})
          </Button>
          
          {CATEGORIES.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              disabled={categoryInventories[category] === 0}
            >
              {category} ({categoryInventories[category]})
            </Button>
          ))}
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-600">
          {filteredAndSortedListings.length} result{filteredAndSortedListings.length !== 1 ? 's' : ''}
          {selectedCategory !== 'all' && ` in ${selectedCategory}`}
          {searchQuery && ` for "${searchQuery}"`}
        </p>
        
        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live blockchain data</span>
        </div>
      </div>

      {/* Gift Cards Grid - NOW WITH PURCHASE FUNCTIONALITY */}
      {filteredAndSortedListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedListings.map((listing) => (
            <SimpleGiftCard 
              key={listing.id} 
              listing={listing} 
              onPurchaseSuccess={handlePurchaseSuccess}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No gift cards match your criteria</p>
          <p className="text-gray-500 mt-2">Try adjusting your search or category filter</p>
          {(selectedCategory !== 'all' || searchQuery) && (
            <Button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Contract Info Footer */}
      <div className="mt-12 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Live Contract Data</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Contract: {DGMARKET_CORE_ADDRESS.slice(0, 10)}...{DGMARKET_CORE_ADDRESS.slice(-8)}</p>
          <p>Network: Base Sepolia</p>
          <p>Total Listings: {transformedListings.length}</p>
          <p>Categories: {CATEGORIES.join(', ')}</p>
          <p>Currency: USDC (6 decimals)</p>
        </div>
      </div>
    </div>
  );
}