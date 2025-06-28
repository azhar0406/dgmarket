'use client';

import { CreateGiftCardForm } from '@/components/create/create-gift-card-form';
import { Navigation } from '@/components/navigation/navigation';
import { Footer } from '@/components/layout/footer';
import { useAdmin } from '@/hooks/use-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CreatePage() {
  const { isAdmin, isConnected } = useAdmin();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <CardTitle>Connect Wallet Required</CardTitle>
                <CardDescription>
                  Please connect your wallet to create gift cards.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild>
                  <Link href="/">Go Home</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  You don't have permission to create gift cards.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild>
                  <Link href="/marketplace">Go to Marketplace</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
            Create Gift Card
          </h1>
          <p className="text-muted-foreground mt-2">
            Create secure, private gift cards with encrypted values
          </p>
        </div>
        <CreateGiftCardForm />
      </main>
      <Footer />
    </div>
  );
}