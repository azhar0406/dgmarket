// components/marketplace/enhanced-gift-card.tsx
// Enhanced Gift Card Component with OKX cross-chain payment integration

'use client';

import { useState } from 'react';
import { parseUnits } from 'viem';
import { toast } from 'sonner';
import { 
  usePurchaseGiftCard, 
  useUSDCData, 
  checkSufficientAllowance, 
  getPurchaseButtonText 
} from '@/hooks/use-purchase';
import { CONTRACT_ADDRESSES } from '@/lib/contract-addresses';
import { OKXPaymentModal } from './okx-payment-modal';
import DGMarketCoreABI from '@/lib/abis/DGMarketCore.json';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  ShoppingCart, 
  Zap, 
  DollarSign, 
  Eye,
  EyeOff,
  ExternalLink 
} from 'lucide-react';

interface EnhancedGiftCardProps {
  listing: any;
  onPurchaseSuccess?: () => void;
}

export function EnhancedGiftCard({ listing, onPurchaseSuccess }: EnhancedGiftCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showOKXModal, setShowOKXModal] = useState(false);

  // USDC Purchase functionality (existing)
  const { purchaseGiftCard, isLoading: isUSDCLoading, currentStep } = usePurchaseGiftCard();
  const { address, usdcBalance, currentAllowance } = useUSDCData(
    CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`
  );

  // Calculate allowance check for USDC
  const priceInWei = parseUnits(listing.price.toString(), 6);
  const hasSufficientAllowance = checkSufficientAllowance(currentAllowance, priceInWei);

  // Handle USDC purchase (existing functionality)
  const handlePurchaseWithUSDC = async () => {
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
      CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
      DGMarketCoreABI,
      address as `0x${string}`
    );

    if (result.success && onPurchaseSuccess) {
      onPurchaseSuccess();
    }
  };

  // Handle OKX modal success
  const handleOKXSuccess = () => {
    setShowOKXModal(false);
    if (onPurchaseSuccess) {
      onPurchaseSuccess();
    }
  };

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

  const getCategoryGradient = (category: string) => {
    const gradients = {
      'Food & Dining': 'from-orange-100 to-red-100',
      'Shopping': 'from-blue-100 to-cyan-100',
      'Entertainment': 'from-purple-100 to-pink-100',
      'Travel': 'from-green-100 to-emerald-100',
      'Gaming': 'from-red-100 to-pink-100',
    };
    return gradients[category as keyof typeof gradients] || 'from-gray-100 to-gray-200';
  };

  const usdcButtonText = getPurchaseButtonText(
    !!address,
    isUSDCLoading,
    currentStep,
    listing.isActive,
    hasSufficientAllowance,
    listing.price
  );

  const isButtonDisabled = !listing.isActive || isUSDCLoading || !address;

  return (
    <>
      <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-border/50 bg-card h-full flex flex-col">
        <div className="relative overflow-hidden">
          {/* Gift Card Image */}
          <div className="aspect-[3/2] overflow-hidden rounded-t-lg bg-gradient-to-br from-muted/50 to-muted/80 relative">
            {!imageError && listing.image ? (
              <img
                src={listing.image}
                alt={listing.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getCategoryGradient(listing.category)}`}>
                <div className="text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">{listing.title}</p>
                  <p className="text-xs text-muted-foreground/60">{listing.category}</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
          </div>

          {/* Status Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 backdrop-blur-sm border ${
                listing.isActive
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/30"
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

          {/* Price Badge */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-background/95 text-foreground border border-border/50 backdrop-blur-sm font-semibold text-sm px-3 py-1.5 shadow-sm">
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              {listing.price.toFixed(2)} USDC
            </Badge>
          </div>
        </div>

        <CardContent className="p-5 flex-1 flex flex-col">
          {/* Category Badge */}
          <div className="mb-3">
            <Badge className={`text-xs px-2.5 py-1 border ${getCategoryColor(listing.category)}`}>
              {listing.category}
            </Badge>
          </div>

          {/* Title and Description */}
          <div className="mb-4 flex-1">
            <div className="h-14 mb-2 flex items-start">
              <h3 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary/80 transition-colors leading-tight">
                {listing.title}
              </h3>
            </div>
            <div className="h-10 flex items-start">
              <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                {listing.description}
              </p>
            </div>
          </div>

          {/* Contract Details */}
          <div className="mb-5 p-3 bg-muted/30 rounded-md text-xs space-y-1.5 border border-border/30">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Card ID:</span>
              <code className="text-foreground font-mono bg-background/50 px-1.5 py-0.5 rounded">
                #{listing.id}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Owner:</span>
              <code className="text-foreground font-mono bg-background/50 px-1.5 py-0.5 rounded text-xs">
                {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
              </code>
            </div>
          </div>

          {/* Balance Display */}
          {address && usdcBalance && (
            <div className="mb-4 text-center">
              <p className="text-xs text-muted-foreground">
                Your USDC balance: ${(Number(usdcBalance) / 1e6).toFixed(2)}
              </p>
              {currentAllowance && (
                <p className="text-xs text-muted-foreground">
                  Allowance: ${(Number(currentAllowance) / 1e6).toFixed(2)} USDC
                </p>
              )}
            </div>
          )}

          {/* Payment Buttons */}
          <div className="mt-auto space-y-3">
            {/* NEW: OKX Cross-Chain Payment Button */}
            <Button
              onClick={() => setShowOKXModal(true)}
              disabled={isButtonDisabled}
              variant="outline"
              className="w-full h-11 font-medium transition-all duration-200 border-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              🚀 Pay with ETH (Cross-Chain)
            </Button>

            {/* Existing: Direct USDC Payment Button */}
            <Button
              onClick={handlePurchaseWithUSDC}
              disabled={isButtonDisabled}
              className={`w-full h-11 font-medium transition-all duration-200 ${
                listing.isActive && !isUSDCLoading
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              } ${currentStep === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {isUSDCLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <DollarSign className="h-4 w-4 mr-2" />
              {usdcButtonText}
            </Button>

            {/* Payment Methods Info */}
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p className="flex items-center justify-center gap-2">
                <Zap className="h-3 w-3 text-orange-500" />
                ETH auto-swapped via OKX DEX
              </p>
              <p className="flex items-center justify-center gap-2">
                <DollarSign className="h-3 w-3 text-blue-500" />
                Direct USDC payment
              </p>
              <p className="mt-2 border-t pt-2">
                {listing.isRevealed 
                  ? "Details visible after purchase" 
                  : "Gift card details hidden until revealed"
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OKX Payment Modal */}
      <OKXPaymentModal
        isOpen={showOKXModal}
        onClose={() => setShowOKXModal(false)}
        cardId={parseInt(listing.id)}
        cardTitle={listing.title}
        usdcPrice={listing.price}
        cardImage={listing.image}
        onPurchaseSuccess={handleOKXSuccess}
      />
    </>
  );
}