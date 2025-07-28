// File: /app/marketplace/page.tsx
// Refined design with USDC display and improved button/price styling

'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatEther } from 'viem';
import { Navigation } from '@/components/navigation/navigation';
import { Footer } from '@/components/layout/footer';
import { useActiveListings } from '@/hooks/use-contracts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShoppingCart, Search, Filter, Eye, EyeOff, DollarSign } from 'lucide-react';

// Contract categories
const CATEGORIES = [
  'Food & Dining',
  'Shopping', 
  'Entertainment',
  'Travel',
  'Gaming'
];

// Enhanced Gift Card Component with refined design
function RefinedGiftCard({ listing }: { listing: any }) {
  const [imageError, setImageError] = useState(false);

  const getCategoryColor = (category: string) => {
    const colors = {
      'Food & Dining': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'Shopping': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'Entertainment': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'Travel': 'bg-green-500/10 text-green-400 border-green-500/20',
      'Gaming': 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-border/50 bg-card">
      <div className="relative overflow-hidden">
        {/* Gift Card Image/Placeholder */}
        <div className="aspect-[3/2] overflow-hidden rounded-t-lg bg-gradient-to-br from-muted/50 to-muted/80 relative">
          {!imageError && listing.image ? (
            <img
              src={listing.image}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Gift Card</p>
                <p className="text-xs text-muted-foreground/60">{listing.category}</p>
              </div>
            </div>
          )}

          {/* Subtle overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
        </div>

        {/* Status Badges - Smaller and subtle */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <Badge 
            variant="outline"
            className={`text-xs px-2 py-0.5 backdrop-blur-sm border ${
              listing.isActive 
                ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
            }`}
          >
            {listing.isActive ? "Active" : "Inactive"}
          </Badge>
          
          {listing.isRevealed ? (
            <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 border-blue-500/30 backdrop-blur-sm">
              <Eye className="h-2.5 w-2.5 mr-1" />
              Revealed
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs px-2 py-0.5 bg-background/90 text-muted-foreground border-border/50 backdrop-blur-sm">
              <EyeOff className="h-2.5 w-2.5 mr-1" />
              Hidden
            </Badge>
          )}
        </div>

        {/* Smaller, subtle price badge */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-background/95 text-foreground border border-border/50 backdrop-blur-sm font-semibold text-sm px-3 py-1.5 shadow-sm">
            <DollarSign className="h-3.5 w-3.5 mr-1" />
            {listing.price.toFixed(2)} USDC
          </Badge>
        </div>
      </div>

      <CardContent className="p-5">
        {/* Category - more subtle */}
        <div className="mb-3">
          <Badge className={`text-xs px-2.5 py-1 border ${getCategoryColor(listing.category)}`}>
            {listing.category}
          </Badge>
        </div>

        {/* Title and Description */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary/80 transition-colors">
            {listing.title}
          </h3>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
            {listing.description}
          </p>
        </div>

        {/* Contract Details - more subtle */}
        <div className="mb-5 p-3 bg-muted/30 rounded-md text-xs space-y-1.5 border border-border/30">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Card ID:</span>
            <code className="text-foreground font-mono bg-background/50 px-1.5 py-0.5 rounded">#{listing.id}</code>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Owner:</span>
            <code className="text-foreground font-mono bg-background/50 px-1.5 py-0.5 rounded text-xs">
              {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
            </code>
          </div>
        </div>

        {/* Refined Action Button */}
        <Button 
          className={`w-full h-11 font-medium transition-all duration-200 ${
            listing.isActive 
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          disabled={!listing.isActive}
        >
          {!listing.isActive ? (
            'Not Available'
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buy for ${listing.price.toFixed(2)} USDC
            </>
          )}
        </Button>

        <div className="text-center mt-3">
          <p className="text-xs text-muted-foreground/80">
            {listing.isRevealed ? 'Details visible after purchase' : 'Gift card details hidden until revealed'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const [isClient, setIsClient] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'newest' | 'oldest'>('newest');

  // Get live contract data
  const { data: listings, isLoading, error } = useActiveListings();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Transform contract data to marketplace format - Convert 18-decimal values to USDC
  const transformedListings = useMemo(() => {
    if (!listings) return [];
    
    return listings.map(listing => ({
      id: listing.cardId.toString(),
      title: listing.description,
      // Convert from 18-decimal wei to USDC display value
      price: parseFloat(formatEther(listing.publicPrice)),
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
  }, [listings]);

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

  // Server-side rendering placeholder
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background">
        {/* Server-side loading state */}
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
        {/* Header - Your existing design */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
            Gift Card Marketplace
          </h1>
          <p className="text-muted-foreground mt-2">
            Browse and purchase gift cards from the community
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading gift cards from blockchain...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-destructive mb-2">Failed to load marketplace</h3>
              <p className="text-muted-foreground text-sm mb-4">{error.message}</p>
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
                {transformedListings.length} gift card{transformedListings.length !== 1 ? 's' : ''} available
              </p>
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">Live blockchain data</span>
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
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="h-11 bg-background border-border">
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
              <div className="flex items-center gap-3 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">Filter by category:</span>
                
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className="rounded-full h-8"
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
                    className="rounded-full h-8"
                  >
                    {category} ({categoryInventories[category]})
                  </Button>
                ))}
              </div>
            </div>

            {/* Results Info */}
            <div className="mb-6">
              <p className="text-muted-foreground">
                {filteredAndSortedListings.length} result{filteredAndSortedListings.length !== 1 ? 's' : ''}
                {selectedCategory !== 'all' && ` in ${selectedCategory}`}
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>

            {/* Gift Cards Grid */}
            {filteredAndSortedListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedListings.map((listing) => (
                  <RefinedGiftCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No gift cards found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || selectedCategory !== 'all' 
                      ? "Try adjusting your search or category filter" 
                      : "No gift cards are currently available"}
                  </p>
                  {(selectedCategory !== 'all' || searchQuery) && (
                    <Button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchQuery('');
                      }}
                      variant="outline"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Contract Info Footer */}
            <div className="mt-16 p-6 bg-muted/20 rounded-lg border border-border/50">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                🔗 Live Blockchain Data
              </h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span>Contract Address:</span>
                  <code className="text-foreground font-mono bg-background/50 px-2 py-1 rounded text-xs">0x8b15...E185</code>
                </div>
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span className="text-foreground">Base Sepolia</span>
                </div>
                <div className="flex justify-between">
                  <span>Token:</span>
                  <span className="text-foreground font-semibold">USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Active Listings:</span>
                  <span className="text-foreground font-semibold">{transformedListings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Categories:</span>
                  <span className="text-foreground">{CATEGORIES.join(', ')}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}