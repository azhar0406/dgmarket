// components/okx-payment-modal.tsx
// FIXED: Progress flow and transaction confirmation

'use client';

import React, { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Zap,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Clock
} from 'lucide-react';

interface OKXPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: number;
  cardTitle: string;
  usdcPrice: number;
  cardImage?: string;
  onPurchaseSuccess?: () => void;
}

// Payment Processor API Configuration
const PAYMENT_API_URL = process.env.NEXT_PUBLIC_PAYMENT_API_URL || 'http://localhost:3001';
const ADMIN_ADDRESS = '0x6328d8Ad7A88526e35c9Dc730e65fF8fEE971c09';

// Processing steps
const PROCESSING_STEPS = [
  { id: 1, title: 'ETH Payment', description: 'Confirming ETH transaction' },
  { id: 2, title: 'Admin Processing', description: 'Admin swapping ETH → USDC via OKX' },
  { id: 3, title: 'Cross-Chain Event', description: 'Emitting bridge event' },
  { id: 4, title: 'Gift Card Assignment', description: 'Assigning card to your wallet' }
];

export function OKXPaymentModal({
  isOpen,
  onClose,
  cardId,
  cardTitle,
  usdcPrice,
  cardImage,
  onPurchaseSuccess
}: OKXPaymentModalProps) {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  
  // Transaction state
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isWaitingForAPI, setIsWaitingForAPI] = useState(false);
  
  // Wagmi hooks for sending ETH
  const { 
    data: hash, 
    sendTransaction, 
    isPending: isSending, 
    error: sendError,
    reset: resetTransaction
  } = useSendTransaction();
  
  // Wait for transaction receipt
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError 
  } = useWaitForTransactionReceipt({
    hash: hash as `0x${string}` | undefined,
  });

  // Calculate ETH amount needed
  const ethPrice = 3600; // Approximate ETH price
  const ethNeeded = (usdcPrice / ethPrice) + (1 / ethPrice);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsProcessing(false);
      setTxHash('');
      setProcessingStatus('');
      setOrderId('');
      setError('');
      setIsWaitingForAPI(false);
      resetTransaction?.();
    }
  }, [isOpen, resetTransaction]);

  // Manual confirmation check - FIXED
  useEffect(() => {
    if (hash && !isWaitingForAPI && !txHash) {
      const checkConfirmation = async () => {
        try {
          console.log(`🔍 Checking confirmation for ${hash}...`);
          
          // Use web3 provider to check receipt manually
          const receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [hash],
          });
          
          console.log('📋 Receipt status:', receipt);
          
          if (receipt && receipt.status === '0x1') {
            console.log('✅ Transaction confirmed manually!');
            setTxHash(hash);
            setCurrentStep(1);
            setProcessingStatus('ETH payment confirmed! Processing with OKX...');
            processPaymentViaAPI(hash, cardId);
          } else if (receipt && receipt.status === '0x0') {
            setError('Transaction failed');
            setIsProcessing(false);
          }
        } catch (error) {
          console.log('⏳ Still waiting for confirmation...');
          // Continue waiting
        }
      };

      // Check immediately if wagmi hook succeeded
      if (isConfirmed) {
        console.log('✅ ETH transaction confirmed via wagmi:', hash);
        setTxHash(hash);
        setCurrentStep(1);
        setProcessingStatus('ETH payment confirmed! Processing with OKX...');
        processPaymentViaAPI(hash, cardId);
        return;
      }

      // Fallback: Manual checking every 2 seconds
      const interval = setInterval(checkConfirmation, 2000);
      
      // Cleanup interval after 5 minutes
      setTimeout(() => {
        clearInterval(interval);
        if (!txHash) {
          setError('Transaction confirmation timeout');
          setIsProcessing(false);
        }
      }, 300000);

      return () => clearInterval(interval);
    }
  }, [hash, isConfirmed, isWaitingForAPI, txHash, cardId]);

  // Handle send transaction errors
  useEffect(() => {
    if (sendError) {
      console.error('❌ Send transaction error:', sendError);
      setError(`Transaction failed: ${sendError.message || 'Unknown error'}`);
      setIsProcessing(false);
    }
  }, [sendError]);

  // Handle confirmation errors
  useEffect(() => {
    if (confirmError) {
      console.error('❌ Transaction confirmation error:', confirmError);
      setError(`Transaction confirmation failed: ${confirmError.message || 'Unknown error'}`);
      setIsProcessing(false);
    }
  }, [confirmError]);

  // Send transaction hash to payment processor API - FIXED
  const processPaymentViaAPI = async (transactionHash: string, giftCardId: number) => {
    if (isWaitingForAPI) {
      console.log('API call already in progress, skipping...');
      return;
    }

    setIsWaitingForAPI(true);
    
    try {
      setProcessingStatus('Sending to payment processor...');
      
      console.log('🚀 Sending to payment processor API:', {
        txHash: transactionHash,
        cardId: giftCardId,
        userAddress: address
      });

      const response = await fetch(`${PAYMENT_API_URL}/api/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash: transactionHash,
          cardId: giftCardId,
          userAddress: address
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Payment processor API success:', result);
        
        // Update progress through steps with delays for better UX
        if (result.swapResult) {
          setCurrentStep(2);
          setProcessingStatus(`ETH → USDC swap completed (${result.swapResult.usdcReceived} USDC)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (result.bridgeResult) {
          setCurrentStep(3);
          setProcessingStatus('Cross-chain event emitted successfully');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (result.purchaseResult) {
          setCurrentStep(4);
          setProcessingStatus('Gift card assigned successfully!');
          
          // Success!
          setTimeout(() => {
            toast.success(`Gift card ${giftCardId} assigned successfully!`);
            if (onPurchaseSuccess) {
              onPurchaseSuccess();
            }
            onClose();
          }, 2000);
        }
        
        if (result.orderId) {
          setOrderId(result.orderId);
        }
        
      } else {
        console.error('❌ Payment processor API error:', result);
        throw new Error(result.error || 'Payment processing failed');
      }
      
    } catch (error: any) {
      console.error('❌ API processing error:', error);
      setError(`Payment processing failed: ${error.message || 'Unknown error'}`);
      setIsProcessing(false);
    } finally {
      setIsWaitingForAPI(false);
    }
  };

  // Handle ETH payment - FIXED
  const handlePayment = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      // Check ETH balance
      const balanceInETH = balance ? Number(formatEther(balance.value)) : 0;
      if (balanceInETH < ethNeeded) {
        setError(`Insufficient ETH balance. You have ${balanceInETH.toFixed(6)} ETH, need ${ethNeeded.toFixed(6)} ETH`);
        return;
      }

      setIsProcessing(true);
      setError('');
      setCurrentStep(0); // Start at step 0 (preparing)
      setProcessingStatus('Preparing ETH transaction...');

      console.log('💰 Sending ETH payment:', {
        to: ADMIN_ADDRESS,
        value: parseEther(ethNeeded.toString()),
        cardId: cardId
      });

      await sendTransaction({
        to: ADMIN_ADDRESS as `0x${string}`,
        value: parseEther(ethNeeded.toString())
      });

      setProcessingStatus('ETH transaction sent, waiting for confirmation...');
      
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      setError(`Payment failed: ${error.message || 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Copied to clipboard');
    }
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  };

  // Calculate progress percentage - FIXED
  const getProgressPercentage = () => {
    if (currentStep === 0 && (isSending || isConfirming)) {
      return 25; // Transaction in progress
    }
    return (currentStep / (PROCESSING_STEPS.length - 1)) * 100;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Cross-Chain ETH Payment
          </DialogTitle>
          <DialogDescription>
            Pay with ETH via OKX DEX cross-chain bridge
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pb-2">
          {/* Gift Card Info */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            {cardImage && (
              <img
                src={cardImage}
                alt={cardTitle}
                className="w-16 h-16 rounded-md object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold">{cardTitle}</h3>
              <p className="text-sm text-muted-foreground">Card #{cardId}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  ~${usdcPrice.toFixed(2)} USDC
                </Badge>
                <Badge variant="outline">
                  ~{ethNeeded.toFixed(6)} ETH
                </Badge>
              </div>
            </div>
          </div>

          {/* Progress Steps - FIXED */}
          {(isProcessing || isSending || isConfirming || isConfirmed) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Progress value={getProgressPercentage()} className="flex-1" />
                <span className="text-sm text-muted-foreground">
                  {Math.round(getProgressPercentage())}%
                </span>
              </div>

              {PROCESSING_STEPS.map((step, index) => {
                const status = getStepStatus(index);
                const isCurrentlyProcessing = status === 'current' && (
                  (index === 0 && (isSending || isConfirming)) ||
                  (index > 0 && isWaitingForAPI)
                );
                
                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                      status === 'completed' 
                        ? 'bg-green-500 text-white' 
                        : status === 'current'
                        ? 'bg-orange-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : isCurrentlyProcessing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm leading-tight ${
                        status === 'completed' ? 'text-green-600' : 
                        status === 'current' ? 'text-orange-600' : 
                        'text-muted-foreground'
                      }`}>
                        {step.title}
                        {index === 0 && isSending && ' (Sending...)'}
                        {index === 0 && isConfirming && ' (Confirming...)'}
                        {index === 0 && isConfirmed && !isWaitingForAPI && ' (Confirmed!)'}
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Status Message */}
          {processingStatus && (
            <Alert className="py-2">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-sm leading-tight">{processingStatus}</AlertDescription>
            </Alert>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Transaction Hash:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <code className="text-xs bg-background px-2 py-1 rounded block w-full break-all">
                    {txHash}
                  </code>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => copyToClipboard(txHash)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    asChild
                  >
                    <a
                      href={`https://basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Order ID */}
          {orderId && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Order ID:</p>
              <code className="text-xs text-muted-foreground break-all">{orderId}</code>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm leading-tight break-words">{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isProcessing && !isConfirmed && !isSending && !isConfirming ? (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={!address}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  <span className="truncate">Pay {ethNeeded.toFixed(6)} ETH</span>
                </Button>
              </>
            ) : hash && !txHash && !isWaitingForAPI ? (
              // Show "Force Process" if we have hash but stuck on confirmation
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    console.log('🔄 Force processing transaction:', hash);
                    setTxHash(hash);
                    setCurrentStep(1);
                    setProcessingStatus('Force processing transaction...');
                    processPaymentViaAPI(hash, cardId);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Force Process
                </Button>
              </>
            ) : (
              <div className="flex-1 text-center py-2">
                {currentStep >= 4 ? (
                  <p className="text-green-600 font-medium text-sm">
                    ✅ Purchase completed successfully!
                  </p>
                ) : isSending ? (
                  <p className="text-orange-600 font-medium text-sm">
                    🔄 Sending transaction...
                  </p>
                ) : isConfirming ? (
                  <p className="text-orange-600 font-medium text-sm">
                    ⏳ Waiting for confirmation...
                  </p>
                ) : isWaitingForAPI ? (
                  <p className="text-orange-600 font-medium text-sm">
                    🔄 Processing cross-chain purchase...
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Processing payment... This typically takes 2-3 minutes.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Debug Info */}
          {/* {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/30 rounded max-h-32 overflow-y-auto">
              <p><strong>🔧 Debug Info:</strong></p>
              <p>Current Step: {currentStep}</p>
              <p>Is Sending: {isSending.toString()}</p>
              <p>Is Confirming: {isConfirming.toString()}</p>
              <p>Is Confirmed: {isConfirmed.toString()}</p>
              <p>Is Waiting for API: {isWaitingForAPI.toString()}</p>
              <p className="break-all">Hash: {hash || 'None'}</p>
              <p className="break-all">API URL: {PAYMENT_API_URL}</p>
            </div>
          )} */}
        </div>
      </DialogContent>
    </Dialog>
  );
}