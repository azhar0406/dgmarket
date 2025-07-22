'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Shield } from 'lucide-react';

// Mock user data
const users = [
  {
    address: '0x1234567890123456789012345678901234567890',
    role: 'admin',
    addedDate: '2024-01-01',
    addedBy: '0x0000...0000',
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    role: 'backend',
    addedDate: '2024-01-15',
    addedBy: '0x1234...7890',
  },
  {
    address: '0x3456789012345678901234567890123456789012',
    role: 'user',
    addedDate: '2024-01-20',
    addedBy: 'system',
  },
];

export function RoleManagement() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Role
          </CardTitle>
          <CardDescription>
            Grant roles to wallet addresses for system access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="walletAddress">Wallet Address</Label>
              <Input id="walletAddress" placeholder="0x..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="backend">Backend Service</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full">
            <Shield className="h-4 w-4 mr-2" />
            Grant Role
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Roles
          </CardTitle>
          <CardDescription>
            Manage existing user roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-mono text-sm">
                    {user.address.slice(0, 10)}...{user.address.slice(-8)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Added {user.addedDate} by {user.addedBy === 'system' ? 'system' : `${user.addedBy.slice(0, 6)}...${user.addedBy.slice(-4)}`}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={
                    user.role === 'admin' ? 'default' : 
                    user.role === 'backend' ? 'secondary' : 
                    'outline'
                  }>
                    {user.role}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive">
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}