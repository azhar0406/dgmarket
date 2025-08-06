// hooks/use-okx-cross-chain-purchase.ts
// Complete implementation for ETH → USDC cross-chain purchase

'use client';

import { useState, useCallback } from 'react';
import { useAccount, useSendTransaction, useSwitchChain, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { toast } from 'sonner';

// Contract addresses from your deployment
const CONTRACTS = {
  DGMARKET_CORE_SEPOLIA: '0xd9F2A41902524d20F12B3f2784d2F0962E0090cE',
  SIMPLE_BRIDGE_MAINNET: '0xF7cF8159C710eb23b81b9EA1EbA5Db91Dd0dd4Ba',
  ADMIN_ADDRESS: '0x6328d8Ad7A88526e35c9Dc730e65fF8fEE971c09' // Update with your admin address
};

interface PaymentStep {
  step: 'idle' | 'calculating' | 'switching' | 'paying' | 'processing' | 'success' | 'error';
  progress: number;
  message: string;
  txHash?: string;
  ethAmount?: string;
  orderId?: string;
  error?: string;
}

interface ETHCalculation {
  cardPriceUSDC: number;
  cardETH: number;
  gasETH: number;
  totalETH: number;
  currentETHPrice: number;
}

export function useOKXCrossChainPurchase() {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  
  const [currentStep, setCurrentStep] = useState<PaymentStep>({
    step: 'idle',
    progress: 0,
    message: ''
  });

  // Fetch current ETH price from CoinGecko
  const fetchETHPrice = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
      );
      const data = await response.json();
      return data.ethereum?.usd || 3000; // Fallback price
    } catch (error) {
      console.error('Failed to fetch ETH price:', error);
      return 3000; // Fallback to $3000
    }
  }, []);

  // Calculate total ETH required for purchase
  const calculateETHRequired = useCallback(async (cardPriceUSDC: number): Promise<ETHCalculation> => {
    setCurrentStep({
      step: 'calculating',
      progress: 20,
      message: 'Fetching ETH price...'
    });

    try {
      // Get current ETH price
      const ethPriceUSD = await fetchETHPrice();
      
      setCurrentStep(prev => ({
        ...prev,
        progress: 50,
        message: 'Calculating gas costs...'
      }));

      // Calculate ETH needed for USDC amount
      const cardETH = cardPriceUSDC / ethPriceUSD;
      
      // Estimate gas costs for admin operations
      // (ETH transfer + OKX swap + Bridge event + Sepolia purchase)
      const gasETH = 0.002; // ~$6 for all admin operations
      
      // Total with 10% buffer
      const totalETH = (cardETH + gasETH) * 1.1;

      const calculation: ETHCalculation = {
        cardPriceUSDC,
        cardETH,
        gasETH,
        totalETH,
        currentETHPrice: ethPriceUSD
      };

      setCurrentStep({
        step: 'idle',
        progress: 100,
        message: `Ready to pay ${totalETH.toFixed(6)} ETH`,
        ethAmount: totalETH.toFixed(6)
      });

      return calculation;
    } catch (error) {
      setCurrentStep({
        step: 'error',
        progress: 0,
        message: 'Failed to calculate payment amount',
        error: 'Could not fetch current ETH price'
      });
      throw error;
    }
  }, [fetchETHPrice]);

  // Check if user has sufficient ETH balance
  const checkETHBalance = useCallback(async (requiredETH: number): Promise<boolean> => {
    if (!publicClient || !address) return false;

    try {
      const balance = await publicClient.getBalance({ address });
      const balanceETH = Number(formatEther(balance));
      
      console.log(`ETH Balance: ${balanceETH}, Required: ${requiredETH}`);
      return balanceETH >= requiredETH;
    } catch (error) {
      console.error('Balance check failed:', error);
      return false;
    }
  }, [publicClient, address]);

  // Main purchase function
  const purchaseWithETH = useCallback(async (
    cardId: number, 
    cardPriceUSDC: number
  ) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return { success: false };
    }

    try {
      // Step 1: Calculate ETH required
      const calculation = await calculateETHRequired(cardPriceUSDC);
      
      // Step 2: Check ETH balance
      const hasSufficientBalance = await checkETHBalance(calculation.totalETH);
      if (!hasSufficientBalance) {
        toast.error(`Insufficient ETH. Need ${calculation.totalETH.toFixed(4)} ETH`);
        setCurrentStep({
          step: 'error',
          progress: 0,
          message: 'Insufficient ETH balance',
          error: `Need ${calculation.totalETH.toFixed(4)} ETH`
        });
        return { success: false };
      }

      // Step 3: Switch to Base Sepolia (if not already there)
      setCurrentStep({
        step: 'switching',
        progress: 25,
        message: 'Switching to Base Sepolia...'
      });

      try {
        await switchChain({ chainId: baseSepolia.id });
      } catch (switchError: any) {
        if (switchError.message.includes('rejected')) {
          toast.error('Network switch cancelled by user');
          setCurrentStep({ step: 'idle', progress: 0, message: '' });
          return { success: false };
        }
        throw new Error('Failed to switch to Base Sepolia');
      }

      // Step 4: Send ETH to admin address with payment metadata
      setCurrentStep({
        step: 'paying',
        progress: 50,
        message: 'Sending ETH payment to admin...',
        ethAmount: calculation.totalETH.toFixed(6)
      });

      // Create unique order ID for tracking
      const orderId = `okx-${Date.now()}-${cardId}-${address.slice(-6)}`;
      
      // Send ETH to admin address on Base Sepolia
      const txHash = await sendTransactionAsync({
        to: CONTRACTS.ADMIN_ADDRESS as `0x${string}`,
        value: parseEther(calculation.totalETH.toString()),
        // Include metadata in transaction (for admin to process)
        data: `0x${Buffer.from(JSON.stringify({
          cardId,
          userAddress: address,
          usdcAmount: cardPriceUSDC,
          orderId,
          timestamp: Date.now()
        })).toString('hex')}`
      });

      console.log(`ETH payment sent: ${txHash}`);
      console.log(`Order ID: ${orderId}`);
      console.log(`Card ID: ${cardId}, User: ${address}, USDC: $${cardPriceUSDC}`);

      // Step 5: Processing state (waiting for admin)
      setCurrentStep({
        step: 'processing',
        progress: 75,
        message: 'Processing cross-chain purchase...',
        txHash,
        orderId
      });

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          timeout: 300000 // 5 minutes
        });
      }

      // Success - admin will handle the rest
      setCurrentStep({
        step: 'success',
        progress: 100,
        message: 'Payment confirmed! Gift card will appear in My Cards.',
        txHash,
        orderId
      });

      toast.success('🎉 ETH payment sent! Your gift card is being processed...');

      // Notify admin system (webhook/API call)
      try {
        await fetch('/api/admin/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash,
            orderId,
            cardId,
            userAddress: address,
            usdcAmount: cardPriceUSDC,
            ethAmount: calculation.totalETH,
            network: 'base-sepolia'
          })
        });
      } catch (notifyError) {
        console.log('Admin notification failed, payment still valid:', notifyError);
      }

      return {
        success: true,
        txHash,
        orderId,
        ethUsed: calculation.totalETH,
        cardId
      };

    } catch (error: any) {
      console.error('Cross-chain purchase failed:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('User rejected')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for transaction';
      }

      setCurrentStep({
        step: 'error',
        progress: 0,
        message: 'Purchase failed',
        error: errorMessage
      });

      toast.error(`Purchase failed: ${errorMessage}`);
      return { success: false };
    }
  }, [address, sendTransactionAsync, switchChain, publicClient, calculateETHRequired, checkETHBalance]);

  // Get preview of ETH cost
  const getETHCostPreview = useCallback(async (usdcAmount: number) => {
    try {
      const calculation = await calculateETHRequired(usdcAmount);
      return {
        ethRequired: calculation.totalETH.toFixed(6),
        cardETH: calculation.cardETH.toFixed(6),
        gasETH: calculation.gasETH.toFixed(6),
        currentETHPrice: calculation.currentETHPrice,
        breakdown: {
          cardValue: `$${calculation.cardPriceUSDC}`,
          gasEstimate: `≈$${(calculation.gasETH * calculation.currentETHPrice).toFixed(2)}`,
          total: `≈$${(calculation.totalETH * calculation.currentETHPrice).toFixed(2)}`
        }
      };
    } catch (error) {
      console.error('Preview calculation failed:', error);
      return null;
    }
  }, [calculateETHRequired]);

  // Reset purchase state
  const resetPurchaseState = useCallback(() => {
    setCurrentStep({
      step: 'idle',
      progress: 0,
      message: ''
    });
  }, []);

  return {
    // Main functions
    purchaseWithETH,
    getETHCostPreview,
    calculateETHRequired,
    resetPurchaseState,
    
    // State
    currentStep,
    isPurchasing: ['calculating', 'switching', 'paying', 'processing'].includes(currentStep.step),
    
    // Utils
    contracts: CONTRACTS
  };
}