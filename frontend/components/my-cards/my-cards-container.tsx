'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MyCreatedCards } from './my-created-cards';
import { MyPurchasedCards } from './my-purchased-cards';

export function MyCardsContainer() {
  return (
    <Tabs defaultValue="purchased" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="purchased">Purchased Cards</TabsTrigger>
        <TabsTrigger value="created">Created Cards</TabsTrigger>
      </TabsList>
      <TabsContent value="purchased" className="space-y-4">
        <MyPurchasedCards />
      </TabsContent>
      <TabsContent value="created" className="space-y-4">
        <MyCreatedCards />
      </TabsContent>
    </Tabs>
  );
}