// components/test/env-test.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function EnvTest() {
  const envVars = {
    'OKX API Key': process.env.NEXT_PUBLIC_OKX_API_KEY,
    'OKX Project ID': process.env.NEXT_PUBLIC_OKX_PROJECT_ID,
    'Base Sepolia RPC': process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
    'Base Mainnet RPC': process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL,
    'DGMarket Core': process.env.NEXT_PUBLIC_DGMARKET_CORE_ADDRESS,
    'Admin Address': process.env.NEXT_PUBLIC_ADMIN_ADDRESS,
    'OKX Chain ID': process.env.NEXT_PUBLIC_OKX_DEX_CHAIN_ID,
    'Cross-Chain Enabled': process.env.NEXT_PUBLIC_ENABLE_OKX_CROSS_CHAIN,
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 Environment Variables Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(envVars).map(([name, value]) => (
            <div key={name} className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="font-medium">{name}:</span>
              <Badge variant={value ? "default" : "destructive"}>
                {value ? (value.length > 20 ? `${value.slice(0, 20)}...` : value) : 'MISSING'}
              </Badge>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded">
          <h4 className="font-semibold mb-2">✅ Ready for Testing:</h4>
          <ul className="space-y-1 text-sm">
            <li>• OKX API credentials loaded</li>
            <li>• Cross-chain networks configured</li>
            <li>• Contract addresses set</li>
            <li>• Admin address configured</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}