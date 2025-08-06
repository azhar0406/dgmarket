// components/test/modal-test.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OKXPaymentModal } from '@/components/marketplace/okx-payment-modal';

export function ModalTest() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Test data
  const testCard = {
    cardId: 1,
    title: "Amazon Gift Card",
    usdcPrice: 5,
    cardImage: "https://via.placeholder.com/200x120/FF9900/FFFFFF?text=Amazon"
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🎨 Payment Modal Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded">
          <h4 className="font-semibold mb-2">Test Gift Card:</h4>
          <div className="space-y-1 text-sm">
            <div>ID: {testCard.cardId}</div>
            <div>Title: {testCard.title}</div>
            <div>Price: ${testCard.usdcPrice} USDC</div>
          </div>
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="w-full"
        >
          🚀 Open OKX Payment Modal
        </Button>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded text-sm">
          <h4 className="font-semibold mb-2">🧪 Modal Test Checklist:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Modal opens correctly</li>
            <li>Gift card preview shows</li>
            <li>ETH calculation displays</li>
            <li>Payment breakdown is clear</li>
            <li>Progress indicators work</li>
            <li>Error states display properly</li>
            <li>Modal closes on cancel</li>
          </ul>
        </div>

        <OKXPaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          cardId={testCard.cardId}
          cardTitle={testCard.title}
          usdcPrice={testCard.usdcPrice}
          cardImage={testCard.cardImage}
        />
      </CardContent>
    </Card>
  );
}