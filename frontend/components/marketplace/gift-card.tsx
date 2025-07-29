// File: /components/marketplace/gift-card.tsx
// Dynamic gift card component with real contract data

'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, EyeOff, ShoppingCart, ExternalLink, Calendar, User } from 'lucide-react';
import { usePurchaseGiftCard } from '@/hooks/use-contracts';

interface GiftCardProps {
  listing: {
    id: string;
    title: string;
    price: number;
    category: string;
    image: string;
    seller: string;
    creator: string;
    isActive: boolean;
    isRevealed: boolean;
    expiryDate: Date;
    createdAt: Date;
    description: string;
    originalCardId: bigint;
    originalPrice: bigint;
  };
}

// Category colors for consistent theming
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

// Format address for display
const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format date for display
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

export function GiftCard({ listing }: GiftCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { purchaseGiftCard, isPending } = usePurchaseGiftCard();

  const handlePurchase = async () => {
    try {
      await purchaseGiftCard(Number(listing.originalCardId), listing.originalPrice);
      // Handle success (you might want to show a success toast here)
    } catch (error) {
      console.error('Purchase failed:', error);
      // Handle error (you might want to show an error toast here)
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Check if card is expired
  const isExpired = listing.expiryDate && listing.expiryDate < new Date();

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${isExpired ? 'opacity-75' : ''}`}>
      <div className="relative">
        {/* Gift Card Image */}
        <div className="aspect-[3/2] overflow-hidden rounded-t-lg bg-gradient-to-br from-gray-100 to-gray-200">
          {!imageError && listing.image ? (
            <img
              src={listing.image}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={handleImageError}
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
          <Badge 
            variant={listing.isActive ? "default" : "secondary"}
            className="text-xs"
          >
            {listing.isActive ? "Active" : "Inactive"}
          </Badge>
          
          {listing.isRevealed && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <Eye className="h-3 w-3 mr-1" />
                    Revealed
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gift card details have been revealed</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {!listing.isRevealed && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hidden
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gift card details are hidden until revealed</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {isExpired && (
            <Badge variant="destructive" className="text-xs">
              Expired
            </Badge>
          )}
        </div>

        {/* Price Badge */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-white text-gray-900 border shadow-sm font-semibold">
            {listing.price.toFixed(4)} ETH
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Category */}
        <div className="mb-2">
          <Badge 
            variant="outline" 
            className={`text-xs ${getCategoryColor(listing.category)}`}
          >
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

        {/* Contract Details (Toggleable) */}
        <div className="mb-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            {showDetails ? 'Hide' : 'Show'} blockchain details
          </button>
          
          {showDetails && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">Owner:</span>
                <code className="text-gray-800">{formatAddress(listing.seller)}</code>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-800">{formatDate(listing.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600">Card ID:</span>
                <code className="text-gray-800">#{listing.id}</code>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600">Price (Wei):</span>
                <code className="text-gray-800">{listing.originalPrice.toString()}</code>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            className="w-full" 
            onClick={handlePurchase}
            disabled={!listing.isActive || isExpired || isPending}
          >
            {isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </>
            ) : isExpired ? (
              'Expired'
            ) : !listing.isActive ? (
              'Not Available'
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Buy for {listing.price.toFixed(4)} ETH
              </>
            )}
          </Button>

          <div className="text-xs text-gray-500 text-center">
            {listing.isRevealed ? (
              'Details visible after purchase'
            ) : (
              'Gift card details hidden until revealed'
            )}
          </div>
        </div>

        {/* Expiry Date */}
        {listing.expiryDate && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Expires:</span>
              <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                {formatDate(listing.expiryDate)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}