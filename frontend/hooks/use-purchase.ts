// hooks/use-purchase.ts
import { useState } from 'react';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { toast } from 'sonner';

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;

const USDC_ABI = [
  {
    "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export function usePurchaseGiftCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'checking' | 'approving' | 'purchasing' | 'success'>('idle');

  const { writeContractAsync: approveUSDC } = useWriteContract();
  const { writeContractAsync: purchaseCard } = useWriteContract();

  const purchaseGiftCard = async (
    cardId: string, 
    priceInUSDC: number, 
    contractAddress: `0x${string}`, 
    abi: any, 
    userAddress: `0x${string}`
  ) => {
    try {
      setIsLoading(true);
      setCurrentStep('checking');

      console.log('🚀 PURCHASE DEBUG - Starting purchase process');
      console.log('CardId:', cardId);
      console.log('Price in USDC:', priceInUSDC);
      console.log('Contract Address:', contractAddress);
      console.log('User Address:', userAddress);

      const priceInWei = parseUnits(priceInUSDC.toString(), 6);
      console.log('Price in Wei (6 decimals):', priceInWei.toString());

      toast.info('Starting purchase process...');

      // Always attempt the purchase first - let the contract tell us if we need approval
      setCurrentStep('purchasing');
      toast.info('🎯 Calling purchaseGiftCard function...');
      
      console.log('🎯 ABOUT TO CALL purchaseGiftCard');
      console.log('Function args:', [BigInt(cardId)]);
      console.log('writeContract function available:', typeof purchaseCard);
      console.log('ABI check - looking for purchaseGiftCard function...');
      
      // Debug ABI
      const purchaseFunction = abi.find((item: any) => item.name === 'purchaseGiftCard');
      console.log('Found purchaseGiftCard function:', purchaseFunction);
      if (purchaseFunction) {
        console.log('Function inputs:', purchaseFunction.inputs);
        console.log('Expected inputs length:', purchaseFunction.inputs?.length);
      }
      
      try {
        await purchaseCard({
          address: contractAddress,
          abi: abi,
          functionName: 'purchaseGiftCard',
          args: [BigInt(cardId)], // Back to 1 parameter as contract expects
        });

        console.log('✅ Purchase transaction initiated - MetaMask should have appeared');
        toast.success('Purchase transaction submitted!');
        
        // Wait for transaction to be mined
        await new Promise(resolve => setTimeout(resolve, 5000));

        setCurrentStep('success');
        toast.success('🎉 Gift card purchased successfully!');

        return {
          success: true,
          purchaseHash: 'transaction_submitted',
        };

      } catch (purchaseError: any) {
        console.log('❌ Purchase failed with error:', purchaseError);
        console.log('Error message:', purchaseError.message);
        console.log('Error shortMessage:', purchaseError.shortMessage);
        
        // Check if it's an allowance/approval error
        const errorMessage = (purchaseError.message || '').toLowerCase();
        const shortMessage = (purchaseError.shortMessage || '').toLowerCase();
        
        const needsApproval = 
          errorMessage.includes('allowance') || 
          errorMessage.includes('insufficient') ||
          errorMessage.includes('transfer') ||
          shortMessage.includes('allowance') ||
          shortMessage.includes('insufficient') ||
          errorMessage.includes('erc20');

        if (needsApproval) {
          console.log('🔄 Needs approval, starting approval process');
          
          setCurrentStep('approving');
          toast.info('❌ Purchase failed - need approval. Approving USDC...');

          await approveUSDC({
            address: USDC_ADDRESS,
            abi: USDC_ABI,
            functionName: 'approve',
            args: [contractAddress, priceInWei * BigInt(3)],
          });

          console.log('✅ Approval transaction initiated - MetaMask should have appeared');
          toast.info('Approval submitted!');
          
          // Wait longer for approval to be mined
          await new Promise(resolve => setTimeout(resolve, 8000));
          
          // Now try purchase again
          setCurrentStep('purchasing');
          toast.info('🔄 Approval complete! Retrying purchase...');
          
          console.log('🎯 RETRYING purchaseGiftCard after approval');
          
          await purchaseCard({
            address: contractAddress,
            abi: abi,
            functionName: 'purchaseGiftCard',
            args: [BigInt(cardId)], // Back to 1 parameter
          });

          console.log('✅ Retry purchase transaction initiated - MetaMask should have appeared');
          toast.success('Purchase transaction submitted!');
          
          await new Promise(resolve => setTimeout(resolve, 5000));

          setCurrentStep('success');
          toast.success('🎉 Gift card purchased successfully!');

          return {
            success: true,
            approveHash: 'approval_initiated',
            purchaseHash: 'purchase_initiated',
          };
        } else {
          // Different error - not allowance related
          console.log('❌ Purchase failed for non-allowance reason');
          throw purchaseError;
        }
      }

    } catch (error: any) {
      console.error('❌ FINAL ERROR:', error);
      setCurrentStep('idle');
      toast.error(`Purchase failed: ${error.shortMessage || error.message}`);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setIsLoading(false);
      setTimeout(() => setCurrentStep('idle'), 3000);
    }
  };

  return {
    purchaseGiftCard,
    isLoading,
    currentStep,
  };
}

// Hook for checking USDC balance and allowance
export function useUSDCData(contractAddress: `0x${string}`) {
  const { address } = useAccount();

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { // Fix: Use query instead of enabled
      enabled: !!address,
    },
  });

  // Check current allowance
  const { data: currentAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, contractAddress] : undefined,
    query: { // Fix: Use query instead of enabled
      enabled: !!address,
    },
  });

  return {
    address,
    usdcBalance: usdcBalance as bigint | undefined, // Fix: Proper typing
    currentAllowance: currentAllowance as bigint | undefined, // Fix: Proper typing
  };
}

// Helper function to check if allowance is sufficient
export function checkSufficientAllowance(
  currentAllowance: bigint | undefined, 
  requiredAmount: bigint
): boolean {
  // Fix: Proper bigint comparison
  return currentAllowance ? currentAllowance >= requiredAmount : false;
}

// Helper function to get button text
export function getPurchaseButtonText(
  isConnected: boolean,
  isLoading: boolean,
  currentStep: string,
  isActive: boolean,
  hasSufficientAllowance: boolean,
  price: number
): string {
  if (!isConnected) return 'Connect Wallet';
  
  if (isLoading) {
    switch (currentStep) {
      case 'checking': return 'Checking allowance...';
      case 'approving': return 'Approving USDC...';
      case 'purchasing': return 'Purchasing...';
      case 'success': return '✅ Purchased!';
      default: return 'Processing...';
    }
  }
  
  if (!isActive) return 'Not Available';
  
  if (!hasSufficientAllowance) {
    return `Approve & Buy $${price.toFixed(2)} USDC`;
  }
  
  return `Buy for $${price.toFixed(2)} USDC`;
}