'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Zap, Clock } from 'lucide-react';

export function RestockingSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Chainlink Automation Settings
          </CardTitle>
          <CardDescription>
            Configure automated restocking using Chainlink Functions and external APIs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Auto-Restocking</Label>
              <p className="text-sm text-muted-foreground">
                Automatically restock when inventory falls below threshold
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkInterval">Check Interval (minutes)</Label>
              <Input id="checkInterval" type="number" defaultValue="60" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxRestockAmount">Max Restock Amount</Label>
              <Input id="maxRestockAmount" type="number" defaultValue="100" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">Gift Card API Endpoint</Label>
            <Input id="apiEndpoint" placeholder="https://api.giftcards.com/v1/purchase" />
          </div>
          
          <Button className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Update Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Restock Activity
          </CardTitle>
          <CardDescription>
            History of automated restocking operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                timestamp: '2024-01-15 14:30:00',
                brand: 'Amazon',
                amount: 50,
                status: 'success',
                cost: '$2,450',
              },
              {
                timestamp: '2024-01-15 12:15:00',
                brand: 'Starbucks',
                amount: 25,
                status: 'success',
                cost: '$625',
              },
              {
                timestamp: '2024-01-15 10:45:00',
                brand: 'Steam',
                amount: 30,
                status: 'failed',
                cost: '-',
              },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{activity.brand}</div>
                  <div className="text-sm text-muted-foreground">{activity.timestamp}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">+{activity.amount} cards</div>
                  <div className={`text-xs ${
                    activity.status === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {activity.status} • {activity.cost}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}