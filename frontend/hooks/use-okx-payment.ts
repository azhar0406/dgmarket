// frontend/hooks/use-okx-payment.ts
'use client';

import { useState, useCallback } from 'react';
import { useWalletClient, usePublicClient, useSwitchChain, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { 
  NETWORK_CONFIG_CROSS_CHAIN, 
  ADMIN_CONFIG, 
  PAYMENT_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  DEBUG_CONFIG 
} from '@/lib/constants';
import { useToast } from './use-toast';

interface OKXPaymentState {
  step: 'idle' | 'calculating' | 'switching' | 'paying' | 'processing' | 'success' | 'error';
  ethRequired: string;
  usdValue: number;
  gasEstimate: string;
  txHash?: string;
  error?: string;
  orderId?: string;
  progress: number; // 0-100 for progress bar
}

interface PaymentDetails {
  user: string;
  cardId: number;
  usdcAmount: number;
  ethPaid: string;
  txHash: string;
  orderId: string;
  timestamp: number;
}

export function useOKXPayment() {
  const [state, setState] = useState<OKXPaymentState>({ 
    step: 'idle', 
    ethRequired: '0',
    usdValue: 0,
    gasEstimate: '0',
    progress: 0
  });
  
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();
  const { address } = useAccount();
  const { toast } = useToast();

  // Debug logging utility
  const debugLog = useCallback((message: string, data?: any) => {
    if (DEBUG_CONFIG.enabled) {
      console.log(`[OKX Payment] ${message}`, data);
    }
  }, []);

  // Fetch current ETH price from API
  const fetchETHPrice = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PRICE_API_URL}?ids=ethereum&vs_currencies=usd`
      );
      const data = await response.json();
      return data.ethereum?.usd || PAYMENT_CONFIG.ethPriceUSD;
    } catch (error) {
      debugLog('Failed to fetch ETH price, using fallback', error);
      return PAYMENT_CONFIG.ethPriceUSD;
    }
  }, [debugLog]);

  // Calculate ETH required for USDC purchase + gas
  const calculateETHRequired = useCallback(async (usdcAmount: number) => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    setState(prev => ({ 
      ...prev, 
      step: 'calculating',
      progress: 10,
      usdValue: usdcAmount 
    }));
    
    try {
      debugLog('Calculating ETH required for USDC amount', { usdcAmount });
      
      // Get current ETH price
      setState(prev => ({ ...prev, progress: 30 }));
      const ethPriceUSD = await fetchETHPrice();
      debugLog('Current ETH price', { ethPriceUSD });
      
      // Calculate ETH needed for USDC amount
      const ethForUSDC = usdcAmount / ethPriceUSD;
      
      // Estimate gas costs
      setState(prev => ({ ...prev, progress: 60 }));
      const gasPrice = await publicClient.getGasPrice();
      const gasLimit = BigInt(
        PAYMENT_CONFIG.gasEstimates.ethTransfer + 
        PAYMENT_CONFIG.gasEstimates.contractCall
      );
      const gasCostWei = gasPrice * gasLimit;
      const gasCostEth = Number(formatEther(gasCostWei));
      
      // Total ETH needed (USDC value + gas + buffer)
      const totalEth = (ethForUSDC + gasCostEth) * PAYMENT_CONFIG.gasEstimates.bufferMultiplier;
      
      debugLog('ETH calculation complete', {
        ethForUSDC,
        gasCostEth,
        totalEth,
        gasPrice: gasPrice.toString()
      });
      
      setState(prev => ({ 
        ...prev, 
        step: 'idle',
        ethRequired: totalEth.toFixed(6),
        gasEstimate: gasCostEth.toFixed(6),
        progress: 100
      }));
      
      return totalEth.toFixed(6);
    } catch (error: any) {
      debugLog('ETH calculation failed', error);
      setState(prev => ({ 
        ...prev, 
        step: 'error',
        error: ERROR_MESSAGES.paymentCalculationFailed,
        progress: 0
      }));
      throw error;
    }
  }, [publicClient, fetchETHPrice, debugLog]);

  // Check if user has sufficient ETH balance
  const checkETHBalance = useCallback(async (requiredETH: string): Promise<boolean> => {
    if (!publicClient || !address) return false;

    try {
      const balance = await publicClient.getBalance({ address });
      const balanceEth = Number(formatEther(balance));
      const required = Number(requiredETH);
      
      debugLog('ETH balance check', { 
        balance: balanceEth, 
        required, 
        sufficient: balanceEth >= required 
      });
      
      return balanceEth >= required;
    } catch (error) {
      debugLog('Balance check failed', error);
      return false;
    }
  }, [publicClient, address, debugLog]);

  // Execute OKX cross-chain payment
  const executeOKXPayment = useCallback(async (cardId: number, usdcAmount: number) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    if (!ADMIN_CONFIG.address || ADMIN_CONFIG.address === '0x') {
      throw new Error(ERROR_MESSAGES.adminAddressNotSet);
    }

    try {
      // Step 1: Calculate ETH required
      debugLog('Starting OKX payment flow', { cardId, usdcAmount });
      setState(prev => ({ ...prev, step: 'calculating', progress: 5 }));
      
      const ethRequired = await calculateETHRequired(usdcAmount);
      
      // Step 2: Check ETH balance
      setState(prev => ({ ...prev, progress: 15 }));
      const hasSufficientBalance = await checkETHBalance(ethRequired);
      if (!hasSufficientBalance) {
        throw new Error(ERROR_MESSAGES.insufficientETH);
      }
      
      // Step 3: Switch to Base Sepolia for ETH payment
      debugLog('Switching to Base Sepolia');
      setState(prev => ({ ...prev, step: 'switching', progress: 25 }));
      
      try {
        await switchChain({ chainId: baseSepolia.id });
        debugLog('Network switch successful');
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          // Network not added to wallet
          throw new Error('Please add Base Sepolia network to your wallet');
        }
        throw new Error(ERROR_MESSAGES.networkSwitchFailed);
      }
      
      // Step 4: Send ETH to admin address on Base Sepolia
      debugLog('Sending ETH payment to admin', { 
        admin: ADMIN_CONFIG.address, 
        amount: ethRequired 
      });
      setState(prev => ({ ...prev, step: 'paying', progress: 50 }));
      
      const txHash = await walletClient.sendTransaction({
        to: ADMIN_CONFIG.address as `0x${string}`,
        value: parseEther(ethRequired),
        chain: baseSepolia,
      });
      
      debugLog('Transaction sent', { txHash });
      setState(prev => ({ 
        ...prev, 
        step: 'processing',
        txHash,
        progress: 75
      }));
      
      // Step 5: Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
        timeout: PAYMENT_CONFIG.timeouts.payment
      });
      
      if (receipt.status === 'success') {
        // Generate order ID for tracking
        const orderId = `okx-${Date.now()}-${cardId}-${address.slice(-6)}`;
        
        debugLog('Payment successful', { orderId, txHash });
        setState(prev => ({ 
          ...prev, 
          step: 'success',
          orderId,
          progress: 100
        }));
        
        toast({
          title: "Payment Sent Successfully!",
          description: SUCCESS_MESSAGES.paymentSent,
        });
        
        // Return payment details for admin processing
        const paymentDetails: PaymentDetails = {
          user: address,
          cardId,
          usdcAmount,
          ethPaid: ethRequired,
          txHash,
          orderId,
          timestamp: Date.now(),
        };
        
        debugLog('Payment details', paymentDetails);
        return paymentDetails;
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error: any) {
      debugLog('Payment execution failed', error);
      
      let errorMessage = error.message;
      if (error.message.includes('User rejected')) {
        errorMessage = 'Transaction was cancelled by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = ERROR_MESSAGES.insufficientETH;
      }
      
      setState(prev => ({ 
        ...prev, 
        step: 'error',
        error: errorMessage,
        progress: 0
      }));
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  }, [walletClient, publicClient, address, switchChain, calculateETHRequired, checkETHBalance, toast, debugLog]);

  // Reset payment state
  const resetPayment = useCallback(() => {
    debugLog('Resetting payment state');
    setState({ 
      step: 'idle', 
      ethRequired: '0',
      usdValue: 0,
      gasEstimate: '0',
      progress: 0
    });
  }, [debugLog]);

  // Get current step description for UI
  const getStepDescription = useCallback(() => {
    switch (state.step) {
      case 'calculating':
        return 'Calculating payment amount...';
      case 'switching':
        return 'Switching to Base Sepolia...';
      case 'paying':
        return 'Sending ETH payment...';
      case 'processing':
        return 'Confirming transaction...';
      case 'success':
        return 'Payment successful! Processing gift card...';
      case 'error':
        return 'Payment failed';
      default:
        return 'Ready to pay';
    }
  }, [state.step]);

  return {
    state,
    calculateETHRequired,
    executeOKXPayment,
    resetPayment,
    getStepDescription,
    isLoading: ['calculating', 'switching', 'paying', 'processing'].includes(state.step),
    canRetry: state.step === 'error',
  };
}