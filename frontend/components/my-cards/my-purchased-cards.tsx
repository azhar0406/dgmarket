'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Shield } from 'lucide-react';

// Mock data
const purchasedCards = [
  {
    id: '1',
    brand: 'Amazon',
    value: 50,
    purchasePrice: 45,
    purchaseDate: new Date('2024-01-15'),
    status: 'active',
    code: '****-****-1234',
  },
  {
    id: '2',
    brand: 'Starbucks',
    value: 25,
    purchasePrice: 22,
    purchaseDate: new Date('2024-01-10'),
    status: 'redeemed',
    code: '****-****-5678',
  },
];

export function MyPurchasedCards() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {purchasedCards.map((card) => (
          <Card key={card.id} className="transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{card.brand}</CardTitle>
                <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>
                  {card.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Value:</span>
                  <span className="font-semibold">${card.value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Paid:</span>
                  <span className="font-semibold">${card.purchasePrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span className="text-sm">{card.purchaseDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Code:</span>
                  <span className="font-mono text-sm">{card.code}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>Encrypted with TEE</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}