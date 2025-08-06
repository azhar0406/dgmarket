// components/test/okx-hook-test.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useOKXPayment } from '@/hooks/use-okx-payment';
import { useAccount } from 'wagmi';

export function OKXHookTest() {
  const { address, isConnected } = useAccount();
  const { state, calculateETHRequired, resetPayment, getStepDescription } = useOKXPayment();
  const [testAmount, setTestAmount] = useState(5); // $5 USDC

  const handleTestCalculation = async () => {
    try {
      await calculateETHRequired(testAmount);
    } catch (error) {
      console.error('Calculation test failed:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 OKX Payment Hook Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Status */}
        <div className="flex items-center gap-2">
          <span>Wallet Status:</span>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Not Connected'}
          </Badge>
        </div>

        {/* Test Calculation */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Test USDC Amount:</label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              placeholder="USDC amount"
              className="flex-1"
            />
            <Button 
              onClick={handleTestCalculation}
              disabled={!isConnected || state.step === 'calculating'}
            >
              Calculate ETH
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-muted p-4 rounded space-y-2">
          <div className="flex justify-between">
            <span>Step:</span>
            <Badge>{state.step}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Description:</span>
            <span className="text-sm">{getStepDescription()}</span>
          </div>
          <div className="flex justify-between">
            <span>ETH Required:</span>
            <span className="font-mono">{state.ethRequired} ETH</span>
          </div>
          <div className="flex justify-between">
            <span>Gas Estimate:</span>
            <span className="font-mono">{state.gasEstimate} ETH</span>
          </div>
          <div className="flex justify-between">
            <span>Progress:</span>
            <span>{state.progress}%</span>
          </div>
          {state.error && (
            <div className="text-red-600 text-sm">
              Error: {state.error}
            </div>
          )}
        </div>

        {/* Reset Button */}
        <Button variant="outline" onClick={resetPayment} className="w-full">
          Reset State
        </Button>

        {/* Test Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded text-sm">
          <h4 className="font-semibold mb-2">🧪 Test Steps:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Connect your wallet</li>
            <li>Enter a USDC amount (e.g., 5)</li>
            <li>Click "Calculate ETH"</li>
            <li>Check if ETH calculation works</li>
            <li>Verify gas estimates are reasonable</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}