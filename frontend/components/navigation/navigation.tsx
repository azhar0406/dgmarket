'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConnectWallet } from '@/components/wallet/connect-wallet';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useAdmin } from '@/hooks/use-admin';
import { 
  ShoppingCart, 
  CreditCard,
  Plus,
  Settings,
  Menu,
  X,
  Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const baseNavigation = [
  { name: 'Home', href: '/', icon: null },
  { name: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
  { name: 'My Cards', href: '/my-cards', icon: CreditCard },
];

const adminNavigation = [
  { name: 'Create', href: '/create', icon: Plus },
  { name: 'Admin', href: '/admin', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { isAdmin } = useAdmin();

  const navigation = isAdmin ? [...baseNavigation, ...adminNavigation] : baseNavigation;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-purple-800">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <span className="hidden font-bold sm:inline-block">DG Market</span>
            </Link>
            
            <div className="hidden md:flex md:space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                      pathname === item.href
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <ConnectWallet />
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {sidebarOpen && (
          <div className="md:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                      pathname === item.href
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}