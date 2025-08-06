// components/marketplace/marketplace-container.tsx
// Enhanced marketplace with OKX DEX ETH payment functionality

'use client';

import { useState, useMemo, useCallback } from 'react';
import { formatUnits } from 'viem';
import { toast } from 'sonner';
import { useActiveListings } from '@/hooks/use-contracts';
import { CONTRACT_ADDRESSES } from '@/lib/contract-addresses';
import { EnhancedGiftCard } from './enhanced-gift-card'; // Import the enhanced component
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Filter, Zap, DollarSign, TrendingUp } from 'lucide-react';

// Contract categories
const CATEGORIES = [
  'Food & Dining',
  'Shopping', 
  'Entertainment',
  'Travel',
  'Gaming'
];

export function MarketplaceContainer() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'newest' | 'oldest'>('newest');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'both' | 'usdc' | 'eth'>('both');

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
      price: parseFloat(formatUnits(listing.publicPrice, 6)), // USDC 6 decimals
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
  }, [listings, refreshTrigger]);

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

  // Calculate price statistics
  const priceStats = useMemo(() => {
    if (filteredAndSortedListings.length === 0) return null;
    
    const prices = filteredAndSortedListings.map(l => l.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    return { minPrice, maxPrice, avgPrice };
  }, [filteredAndSortedListings]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading gift cards from blockchain...</p>
            <p className="text-sm text-gray-500">Connecting to Base network...</p>
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
              onClick={() => {
                refetch?.();
                window.location.reload();
              }} 
              className="mt-4"
            >
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Payment Options Info */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">DGMarket</h1>
            <p className="text-gray-600">
              Discover {transformedListings.length} gift card{transformedListings.length !== 1 ? 's' : ''} on the blockchain
            </p>
          </div>
          
          {/* Payment Methods Info */}
          <div className="hidden lg:block">
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-orange-50">
              <div className="text-sm space-y-2">
                <div className="font-semibold text-gray-900 mb-2">Payment Options</div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700">Direct USDC Payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-700">ETH Auto-swap via OKX DEX</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Price Statistics */}
        {priceStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-3 text-center">
              <div className="text-sm text-gray-600">Price Range</div>
              <div className="text-lg font-bold text-gray-900">
                ${priceStats.minPrice.toFixed(0)} - ${priceStats.maxPrice.toFixed(0)}
              </div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-sm text-gray-600">Average Price</div>
              <div className="text-lg font-bold text-gray-900">
                ${priceStats.avgPrice.toFixed(2)} USDC
              </div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-sm text-gray-600">Total Available</div>
              <div className="text-lg font-bold text-gray-900">
                {filteredAndSortedListings.filter(l => l.isActive).length} Cards
              </div>
            </Card>
          </div>
        )}
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

          {/* Payment Method Filter */}
          <div className="lg:w-48">
            <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Payment method..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both ETH & USDC</SelectItem>
                <SelectItem value="usdc">USDC Only</SelectItem>
                <SelectItem value="eth">ETH Only</SelectItem>
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
        <div>
          <p className="text-gray-600">
            {filteredAndSortedListings.length} result{filteredAndSortedListings.length !== 1 ? 's' : ''}
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
            {searchQuery && ` for "${searchQuery}"`}
          </p>
          {paymentMethod !== 'both' && (
            <p className="text-xs text-gray-500 mt-1">
              Showing {paymentMethod === 'usdc' ? 'USDC' : 'ETH'} payment option only
            </p>
          )}
        </div>
        
        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live blockchain data</span>
        </div>
      </div>

      {/* Payment Methods Legend */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 via-white to-orange-50 rounded-lg border">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gray-700" />
          Payment Methods Available
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900">Direct USDC Payment</div>
              <div className="text-blue-700 mt-1">
                • Pay directly with USDC tokens<br/>
                • Requires USDC balance in wallet<br/>
                • Instant transaction approval
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
            <Zap className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <div className="font-medium text-orange-900">ETH Auto-Swap Payment</div>
              <div className="text-orange-700 mt-1">
                • Pay with ETH, auto-swap to USDC<br/>
                • Powered by OKX DEX aggregator<br/>
                • 3-step process: Swap → Approve → Purchase
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gift Cards Grid - USING ENHANCED COMPONENT */}
      {filteredAndSortedListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedListings.map((listing) => (
            <EnhancedGiftCard 
              key={`${listing.id}-${refreshTrigger}`} // Force re-render on refresh
              listing={listing} 
              onPurchaseSuccess={handlePurchaseSuccess}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <p className="text-gray-600 text-lg mb-2">No gift cards match your criteria</p>
            <p className="text-gray-500 mb-4">Try adjusting your search or category filter</p>
            
            {(selectedCategory !== 'all' || searchQuery || paymentMethod !== 'both') && (
              <Button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setPaymentMethod('both');
                }}
                className="mx-auto"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Contract Info Footer */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contract Information */}
        <Card className="p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            🔗 Smart Contract Info
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex justify-between">
              <span>DGMarket Core:</span>
              <code className="text-xs bg-white px-2 py-1 rounded">
                {CONTRACT_ADDRESSES.DGMARKET_CORE.slice(0, 10)}...{CONTRACT_ADDRESSES.DGMARKET_CORE.slice(-8)}
              </code>
            </div>
            <div className="flex justify-between">
              <span>USDC Token:</span>
              <code className="text-xs bg-white px-2 py-1 rounded">
                0x833589...2913
              </code>
            </div>
            <div className="flex justify-between">
              <span>Network:</span>
              <span className="text-green-600 font-medium">Base Sepolia</span>
            </div>
            <div className="flex justify-between">
              <span>Currency:</span>
              <span>USDC (6 decimals)</span>
            </div>
          </div>
        </Card>

        {/* OKX DEX Integration Info - Base Sepolia */}
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            ⚡ OKX DEX Integration (Sepolia)
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex justify-between">
              <span>Swap Provider:</span>
              <span className="text-orange-600 font-medium">OKX DEX Aggregator</span>
            </div>
            <div className="flex justify-between">
              <span>Network:</span>
              <span className="text-orange-600 font-medium">Base Sepolia Testnet</span>
            </div>
            <div className="flex justify-between">
              <span>Supported Pairs:</span>
              <span>ETH → USDC (Sepolia)</span>
            </div>
            <div className="flex justify-between">
              <span>Slippage Tolerance:</span>
              <span>1-2%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Marketplace Statistics */}
      <div className="mt-6">
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="font-semibold text-gray-900 mb-3">📊 Marketplace Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">{transformedListings.length}</div>
              <div className="text-xs text-gray-600">Total Cards</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {transformedListings.filter(l => l.isActive).length}
              </div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">{CATEGORIES.length}</div>
              <div className="text-xs text-gray-600">Categories</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600">
                {priceStats ? `$${priceStats.minPrice}` : 'N/A'}
              </div>
              <div className="text-xs text-gray-600">Min Price</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {priceStats ? `$${priceStats.maxPrice}` : 'N/A'}
              </div>
              <div className="text-xs text-gray-600">Max Price</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">🔧 Development Debug Info</h4>
          <div className="text-xs text-yellow-700 space-y-1">
            <p>Contract addresses loaded: {CONTRACT_ADDRESSES ? '✅' : '❌'}</p>
            <p>Listings fetched: {listings?.length || 0}</p>
            <p>Transformed listings: {transformedListings.length}</p>
            <p>Filtered results: {filteredAndSortedListings.length}</p>
            <p>Refresh trigger: {refreshTrigger}</p>
            <p>OKX DEX service: {typeof window !== 'undefined' ? '✅ Available' : '⏳ Loading'}</p>
          </div>
        </div>
      )}
    </div>
  );
}