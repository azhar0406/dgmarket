'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, TrendingUp } from 'lucide-react';

// Mock data
const createdCards = [
  {
    id: '1',
    brand: 'Custom Brand',
    value: 100,
    askingPrice: 90,
    createdDate: new Date('2024-01-20'),
    status: 'listed',
    views: 45,
    offers: 3,
  },
  {
    id: '2',
    brand: 'Steam',
    value: 50,
    askingPrice: 45,
    createdDate: new Date('2024-01-18'),
    status: 'sold',
    views: 82,
    offers: 7,
  },
];

export function MyCreatedCards() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {createdCards.map((card) => (
          <Card key={card.id} className="transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{card.brand}</CardTitle>
                <Badge variant={card.status === 'listed' ? 'default' : 'secondary'}>
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
                  <span className="text-sm text-muted-foreground">Asking:</span>
                  <span className="font-semibold">${card.askingPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm">{card.createdDate.toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span>{card.views} views</span>
                </div>
                <span>{card.offers} offers</span>
              </div>
              
              {card.status === 'listed' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}