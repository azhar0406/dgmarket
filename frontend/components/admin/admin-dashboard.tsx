'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryManagement } from './inventory-management';
import { RestockingSettings } from './restocking-settings';
import { RoleManagement } from './role-management';
import { SystemStats } from './system-stats';

export function AdminDashboard() {
  return (
    <div className="space-y-8">
      <SystemStats />
      
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="restocking">Restocking</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="inventory" className="space-y-4">
          <InventoryManagement />
        </TabsContent>
        
        <TabsContent value="restocking" className="space-y-4">
          <RestockingSettings />
        </TabsContent>
        
        <TabsContent value="roles" className="space-y-4">
          <RoleManagement />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <div>Settings content coming soon...</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}