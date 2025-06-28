'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign,
  RefreshCw,
  AlertTriangle 
} from 'lucide-react';

// Mock data
const stats = [
  {
    title: 'Total Volume',
    value: '$245,231',
    change: '+12.5%',
    changeType: 'positive' as const,
    icon: DollarSign,
    description: 'Last 30 days',
  },
  {
    title: 'Active Listings',
    value: '1,847',
    change: '+3.2%',
    changeType: 'positive' as const,
    icon: Package,
    description: 'Currently available',
  },
  {
    title: 'Total Users',
    value: '3,291',
    change: '+8.1%',
    changeType: 'positive' as const,
    icon: Users,
    description: 'Registered wallets',
  },
  {
    title: 'Restock Requests',
    value: '23',
    change: '-5.4%',
    changeType: 'negative' as const,
    icon: RefreshCw,
    description: 'Pending automation',
  },
];

const alerts = [
  {
    type: 'warning' as const,
    message: 'Amazon gift cards running low (12 remaining)',
    timestamp: '2 hours ago',
  },
  {
    type: 'info' as const,
    message: 'Chainlink restock completed for Starbucks',
    timestamp: '4 hours ago',
  },
  {
    type: 'error' as const,
    message: 'Failed restock request for Steam cards',
    timestamp: '6 hours ago',
  },
];

export function SystemStats() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Badge 
                  variant={stat.changeType === 'positive' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {stat.change}
                </Badge>
                <span>{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            System Alerts
          </CardTitle>
          <CardDescription>
            Recent notifications and system status updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.map((alert, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                alert.type === 'error' ? 'bg-red-500' : 
                alert.type === 'warning' ? 'bg-yellow-500' : 
                'bg-blue-500'
              }`} />
              <div className="flex-1">
                <p className="text-sm">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}