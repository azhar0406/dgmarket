// hooks/use-purchase-with-okx.ts
// Simplified version with better wagmi integration

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, useSendTransaction } from 'wagmi';
import { parseEther, formatEther, parseUnits } from 'viem';
import { OKXDexService } from '@/lib/services/okx-dex';
import { waitForTransactionReceipt } from '@/lib/utils/viem-client';
import { getErrorMessage, formatUserError } from '@/lib/utils/error-handling';
import { CONTRACT_ADDRESSES } from '@/lib/contract-addresses';
import DGMarketCoreABI from '@/lib/abis/DGMarketCore.json';
import { toast } from 'sonner';

interface PurchaseStep {
  step: 'idle' | 'calculating' | 'simulating' | 'swapping' | 'approving' | 'purchasing' | 'success' | 'error';
  message: string;
  txHash?: string;
  ethAmount?: string;
  usdcAmount?: string;
}

export function usePurchaseWithOKX() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  
  const [currentStep, setCurrentStep] = useState<PurchaseStep>({ 
    step: 'idle', 
    message: '' 
  });

  // Initialize OKX DEX service for Base Sepolia
  const okxService = new OKXDexService('https://base-sepolia-rpc.publicnode.com');

  // Check current USDC allowance (Base Sepolia USDC)
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`, // Base Sepolia USDC
    abi: [
      {
        "type": "function",
        "name": "allowance",
        "inputs": [
          {"name": "owner", "type": "address"},
          {"name": "spender", "type": "address"}
        ],
        "outputs": [{"name": "", "type": "uint256"}]
      }
    ],
    functionName: 'allowance',
    args: [address, CONTRACT_ADDRESSES.DGMARKET_CORE],
    query: { enabled: !!address }
  });

  /**
   * Helper function to wait for transaction confirmation using Viem
   */
  const waitForTransaction = async (txHash: `0x${string}`, timeoutMs: number = 300000): Promise<boolean> => {
    return await waitForTransactionReceipt(txHash, timeoutMs);
  };

  /**
   * Main function to purchase gift card with ETH via OKX DEX
   */
  const purchaseWithETH = useCallback(async (
    cardId: number, 
    priceInUSDC: number
  ) => {
    if (!address) {
      toast.error('Please connect your wallet');
      throw new Error('Wallet not connected');
    }

    try {
      // Step 1: Calculate required ETH amount
      setCurrentStep({ 
        step: 'calculating', 
        message: 'Calculating ETH required for swap...' 
      });

      const calculation = await okxService.calculateETHForUSDC(priceInUSDC.toString(), 10); // 10% buffer for testnet
      
      console.log('ETH Calculation for Base Sepolia:', calculation);

      toast.info(`Need ${calculation.ethRequiredFormatted} ETH to get ${calculation.expectedUSDC} USDC`);

      // Step 2: Execute ETH → USDC swap
      setCurrentStep({ 
        step: 'swapping', 
        message: 'Swapping ETH to USDC via OKX DEX...', 
        ethAmount: calculation.ethRequiredFormatted,
        usdcAmount: calculation.expectedUSDC
      });

      const swapData = await okxService.getSwapTransaction(
        calculation.ethRequired,
        address,
        '0.02' // 2% slippage for Base Sepolia
      );

      console.log('Executing swap on Base Sepolia...');

      // Execute raw transaction for the swap
      const swapHash = await sendTransactionAsync({
        to: swapData.tx.to as `0x${string}`,
        value: BigInt(swapData.tx.value || calculation.ethRequired),
        data: swapData.tx.data as `0x${string}`,
      });

      console.log('Swap transaction submitted:', swapHash);
      setCurrentStep({ 
        step: 'swapping', 
        message: 'Waiting for swap confirmation...', 
        txHash: swapHash 
      });

      // Wait for swap to complete
      const swapSuccess = await waitForTransaction(swapHash);
      if (!swapSuccess) {
        throw new Error('Swap transaction failed or timed out');
      }

      toast.success(`ETH swapped to USDC! TX: ${swapHash.slice(0, 10)}...`);

      // Step 3: Check if USDC approval is needed
      await refetchAllowance();
      const requiredUSDC = BigInt(priceInUSDC * 1e6); // USDC has 6 decimals
      const currentUSDCAllowance = currentAllowance as bigint || BigInt(0);

      let approveHash: `0x${string}` | undefined;

      if (currentUSDCAllowance < requiredUSDC) {
        setCurrentStep({ 
          step: 'approving', 
          message: 'Approving USDC for marketplace...' 
        });

        approveHash = await writeContractAsync({
          address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
          abi: [
            {
              "type": "function",
              "name": "approve",
              "inputs": [
                {"name": "spender", "type": "address"},
                {"name": "amount", "type": "uint256"}
              ],
              "outputs": [{"name": "", "type": "bool"}]
            }
          ],
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`, requiredUSDC],
        });

        const approveSuccess = await waitForTransaction(approveHash);
        if (!approveSuccess) {
          throw new Error('USDC approval failed');
        }

        toast.success('USDC approved!');
      }

      // Step 4: Purchase gift card
      setCurrentStep({ 
        step: 'purchasing', 
        message: 'Purchasing gift card...' 
      });

      const purchaseHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.DGMARKET_CORE as `0x${string}`,
        abi: DGMarketCoreABI,
        functionName: 'purchaseGiftCard',
        args: [BigInt(cardId)],
      });

      const purchaseSuccess = await waitForTransaction(purchaseHash);
      if (!purchaseSuccess) {
        throw new Error('Gift card purchase failed');
      }

      // Success!
      setCurrentStep({ 
        step: 'success', 
        message: 'Gift card purchased successfully!',
        txHash: purchaseHash
      });
      
      toast.success('🎉 Gift card purchased successfully with ETH!');

      return {
        success: true,
        swapHash,
        approveHash,
        purchaseHash,
        ethUsed: calculation.ethRequiredFormatted,
        usdcReceived: calculation.expectedUSDC,
      };

    } catch (error: any) {
      console.error('Purchase with ETH failed:', error);
      
      const errorMessage = formatUserError(error);
      setCurrentStep({ 
        step: 'error', 
        message: `Purchase failed: ${errorMessage}` 
      });
      
      toast.error(`Purchase failed: ${errorMessage}`);
      
      return { success: false };
    }
  }, [address, currentAllowance, writeContractAsync, sendTransactionAsync, refetchAllowance]);

  /**
   * Get preview of ETH cost for USDC amount
   */
  const getETHCostPreview = useCallback(async (usdcAmount: number) => {
    try {
      const calculation = await okxService.calculateETHForUSDC(usdcAmount.toString());
      const currentPrice = await okxService.getCurrentETHUSDCPrice();
      
      return {
        ethRequired: calculation.ethRequiredFormatted,
        expectedUSDC: calculation.expectedUSDC,
        priceImpact: calculation.priceImpact,
        currentETHPrice: currentPrice.ethPrice,
        network: 'Base Sepolia'
      };
    } catch (error: any) {
      console.error('Failed to get cost preview:', error);
      return null;
    }
  }, []);

  /**
   * Reset purchase state
   */
  const resetPurchaseState = useCallback(() => {
    setCurrentStep({ step: 'idle', message: '' });
  }, []);

  /**
   * Check if purchase is in progress
   */
  const isPurchasing = currentStep.step !== 'idle' && currentStep.step !== 'success' && currentStep.step !== 'error';

  return {
    // Main functions
    purchaseWithETH,
    getETHCostPreview,
    resetPurchaseState,
    
    // State
    currentStep,
    isPurchasing,
    
    // Utils for testing
    okxService
  };
}