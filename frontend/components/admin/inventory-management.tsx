'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Plus, AlertTriangle } from 'lucide-react';
import { GIFT_CARD_CATEGORIES } from '@/lib/constants';

// Mock inventory data
const inventoryData = [
  {
    category: 'retail',
    brand: 'Amazon',
    current: 45,
    threshold: 20,
    target: 100,
    status: 'healthy',
    lastRestock: '2024-01-15',
  },
  {
    category: 'dining',
    brand: 'Starbucks',
    current: 12,
    threshold: 15,
    target: 50,
    status: 'low',
    lastRestock: '2024-01-10',
  },
  {
    category: 'entertainment',
    brand: 'Netflix',
    current: 28,
    threshold: 25,
    target: 75,
    status: 'healthy',
    lastRestock: '2024-01-12',
  },
  {
    category: 'gaming',
    brand: 'Steam',
    current: 5,
    threshold: 10,
    target: 40,
    status: 'critical',
    lastRestock: '2024-01-08',
  },
];

export function InventoryManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Inventory Overview</h3>
          <p className="text-sm text-muted-foreground">
            Monitor and manage gift card inventory across all categories
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Inventory
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1">
        {inventoryData.map((item) => (
          <Card key={`${item.category}-${item.brand}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{item.brand}</CardTitle>
                  <CardDescription className="capitalize">
                    {GIFT_CARD_CATEGORIES.find(c => c.id === item.category)?.name}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      item.status === 'critical' ? 'destructive' : 
                      item.status === 'low' ? 'secondary' : 
                      'default'
                    }
                  >
                    {item.status}
                  </Badge>
                  {item.status !== 'healthy' && (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Stock</span>
                  <span className="font-medium">{item.current} / {item.target}</span>
                </div>
                <Progress value={(item.current / item.target) * 100} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Threshold: {item.threshold}</span>
                  <span>Target: {item.target}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-muted-foreground">Last restock: </span>
                  <span>{new Date(item.lastRestock).toLocaleDateString()}</span>
                </div>
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restock Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}