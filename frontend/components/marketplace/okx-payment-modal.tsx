// components/marketplace/okx-payment-modal.tsx
// Complete OKX cross-chain payment modal with step-by-step UI

'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Loader2, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Zap,
  ExternalLink,
  RefreshCw,
  X,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { useOKXCrossChainPurchase } from '@/hooks/use-okx-cross-chain-purchase';

interface OKXPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: number;
  cardTitle: string;
  usdcPrice: number;
  cardImage?: string;
  onPurchaseSuccess?: () => void;
}

export function OKXPaymentModal({ 
  isOpen, 
  onClose, 
  cardId, 
  cardTitle, 
  usdcPrice,
  cardImage,
  onPurchaseSuccess 
}: OKXPaymentModalProps) {
  const [ethPreview, setEthPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { 
    currentStep,
    isPurchasing,
    purchaseWithETH,
    getETHCostPreview,
    resetPurchaseState,
    contracts
  } = useOKXCrossChainPurchase();

  // Calculate ETH preview when modal opens
  useEffect(() => {
    if (isOpen && !ethPreview && usdcPrice > 0) {
      setPreviewLoading(true);
      getETHCostPreview(usdcPrice)
        .then(preview => {
          setEthPreview(preview);
          setPreviewLoading(false);
        })
        .catch(error => {
          console.error('Failed to get ETH preview:', error);
          setPreviewLoading(false);
        });
    }
  }, [isOpen, usdcPrice, getETHCostPreview, ethPreview]);

  // Handle payment execution
  const handlePayment = async () => {
    try {
      const result = await purchaseWithETH(cardId, usdcPrice);
      
      if (result.success && onPurchaseSuccess) {
        // Wait a moment for success UI, then trigger refresh
        setTimeout(() => {
          onPurchaseSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error('Payment execution failed:', error);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isPurchasing) {
      resetPurchaseState();
      setEthPreview(null);
      setPreviewLoading(false);
      onClose();
    }
  };

  // Handle retry
  const handleRetry = () => {
    resetPurchaseState();
    setEthPreview(null);
    setPreviewLoading(false);
  };

  // Get step-specific content
  const getStepContent = () => {
    if (previewLoading) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-sm text-muted-foreground">Calculating ETH required...</p>
        </div>
      );
    }

    switch (currentStep.step) {
      case 'idle':
        return (
          <div className="space-y-6">
            {/* Gift Card Preview */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {cardImage && (
                    <img 
                      src={cardImage} 
                      alt={cardTitle}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{cardTitle}</h4>
                    <p className="text-2xl font-bold text-green-600">${usdcPrice} USDC</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Breakdown */}
            {ethPreview && (
              <div className="bg-gradient-to-br from-blue-50 to-orange-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold">Cross-Chain Payment Breakdown</h4>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gift Card Value:</span>
                    <span className="font-semibold">{ethPreview.breakdown.cardValue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Card ETH Cost:</span>
                    <span className="font-mono">{ethPreview.cardETH} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gas & Processing:</span>
                    <span className="font-mono">{ethPreview.gasETH} ETH</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total ETH Payment:</span>
                      <div className="text-right">
                        <div className="font-mono font-bold text-lg">{ethPreview.ethRequired} ETH</div>
                        <div className="text-xs text-muted-foreground">
                          ≈ {ethPreview.breakdown.total}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* How it Works */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>How it works:</strong> You pay ETH on Base Sepolia. Our admin system 
                automatically swaps it to USDC on Base Mainnet via OKX DEX and purchases your 
                gift card. The card will appear in "My Cards" within 2-3 minutes.
              </AlertDescription>
            </Alert>

            {/* Current ETH Price */}
            {ethPreview && (
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>Current ETH Price: ${ethPreview.currentETHPrice?.toFixed(0)}</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'calculating':
        return (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="font-medium">{currentStep.message}</p>
            <Progress value={currentStep.progress} className="mt-4" />
          </div>
        );

      case 'switching':
        return (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="font-medium">Switching to Base Sepolia...</span>
            </div>
            <Progress value={currentStep.progress} className="mb-4" />
            <p className="text-sm text-muted-foreground">
              Please approve the network switch in your wallet
            </p>
          </div>
        );

      case 'paying':
        return (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
              <span className="font-medium">Sending ETH Payment...</span>
            </div>
            <Progress value={currentStep.progress} className="mb-4" />
            
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-mono">{currentStep.ethAmount} ETH</span>
              </div>
              <div className="flex justify-between">
                <span>To:</span>
                <span className="font-mono text-xs">
                  {contracts.ADMIN_ADDRESS.slice(0, 8)}...{contracts.ADMIN_ADDRESS.slice(-6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Network:</span>
                <span className="text-blue-600 font-medium">Base Sepolia</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              Please confirm the transaction in your wallet
            </p>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <span className="font-medium">Processing Cross-Chain Purchase...</span>
            </div>
            <Progress value={currentStep.progress} className="mb-4" />
            
            {currentStep.txHash && (
              <div className="bg-muted p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Transaction Hash:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(
                      `https://sepolia.basescan.org/tx/${currentStep.txHash}`,
                      '_blank'
                    )}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
                <code className="text-xs bg-background px-2 py-1 rounded block">
                  {currentStep.txHash?.slice(0, 20)}...{currentStep.txHash?.slice(-20)}
                </code>
              </div>
            )}

            {currentStep.orderId && (
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Order ID:</span>
                  <Badge variant="outline" className="ml-2">
                    {currentStep.orderId}
                  </Badge>
                </div>
              </div>
            )}
            
            <div className="text-left space-y-2 text-sm text-muted-foreground">
              <p>✅ ETH payment confirmed on Base Sepolia</p>
              <p>🔄 Admin swapping ETH → USDC on Base Mainnet...</p>
              <p>🌉 Cross-chain event being processed...</p>
              <p>🎁 Gift card being assigned to your wallet...</p>
            </div>
            
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This process typically takes 2-3 minutes. Your gift card will automatically 
                appear in "My Cards" when complete.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-xl text-green-600">Payment Successful!</h4>
                <p className="text-muted-foreground mt-2">
                  Your gift card is being processed via cross-chain bridge.
                </p>
              </div>
            </div>
            
            {currentStep.orderId && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="outline" className="border-green-300 text-green-700">
                    Order ID: {currentStep.orderId}
                  </Badge>
                </div>
                <p className="text-sm text-green-700">
                  Save this Order ID for reference
                </p>
              </div>
            )}

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What's next:</strong> Switch back to Base Sepolia to view your new gift card. 
                It will appear in "My Cards" within 2-3 minutes as the cross-chain process completes.
              </AlertDescription>
            </Alert>

            {currentStep.txHash && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(
                    `https://sepolia.basescan.org/tx/${currentStep.txHash}`,
                    '_blank'
                  )}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Transaction
                </Button>
              </div>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="py-8">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-xl text-red-600">Payment Failed</h4>
                <p className="text-muted-foreground mt-2">
                  {currentStep.error}
                </p>
              </div>
            </div>

            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Transaction failed:</strong> {currentStep.message}
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Common solutions:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Ensure you have sufficient ETH balance</li>
                <li>Check your network connection</li>
                <li>Make sure Base Sepolia is added to your wallet</li>
                <li>Try refreshing the ETH price estimate</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Get action buttons based on current state
  const getActionButtons = () => {
    switch (currentStep.step) {
      case 'idle':
        return (
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1"
              disabled={isPurchasing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePayment} 
              className="flex-1 bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-700 hover:to-orange-700"
              disabled={!ethPreview || isPurchasing}
            >
              <Zap className="w-4 h-4 mr-2" />
              Pay {ethPreview?.ethRequired || '...'} ETH
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 'success':
        return (
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/my-cards'}
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              View My Cards
            </Button>
            <Button 
              onClick={handleClose} 
              className="flex-1"
            >
              Close
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleRetry} 
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        );

      default:
        return (
          <Button disabled className="w-full">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {currentStep.message}
          </Button>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Cross-Chain ETH Payment
          </DialogTitle>
          <DialogDescription>
            Pay with ETH via OKX DEX cross-chain bridge
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Progress indicator */}
          {isPurchasing && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Payment Progress</span>
                <span className="font-medium">{currentStep.progress}%</span>
              </div>
              <Progress value={currentStep.progress} className="h-2" />
            </div>
          )}

          {/* Step content */}
          {getStepContent()}
          
          {/* Action buttons */}
          <div className="pt-4 border-t">
            {getActionButtons()}
          </div>

          {/* Technical details (development) */}
          {process.env.NODE_ENV === 'development' && ethPreview && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800 font-medium mb-2">🔧 Development Info:</p>
              <div className="text-xs text-yellow-700 space-y-1 font-mono">
                <p>Admin Address: {contracts.ADMIN_ADDRESS.slice(0, 10)}...{contracts.ADMIN_ADDRESS.slice(-6)}</p>
                <p>Bridge Contract: {contracts.SIMPLE_BRIDGE_MAINNET.slice(0, 10)}...{contracts.SIMPLE_BRIDGE_MAINNET.slice(-6)}</p>
                <p>DGMarket Contract: {contracts.DGMARKET_CORE_SEPOLIA.slice(0, 10)}...{contracts.DGMARKET_CORE_SEPOLIA.slice(-6)}</p>
                <p>Current Step: {currentStep.step}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}