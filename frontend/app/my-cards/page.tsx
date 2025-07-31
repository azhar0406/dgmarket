'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import everything to prevent SSR issues
const Navigation = dynamic(() => 
  import('@/components/navigation/navigation').then(mod => ({ default: mod.Navigation })), 
  { ssr: false }
);

const Footer = dynamic(() => 
  import('@/components/layout/footer').then(mod => ({ default: mod.Footer })), 
  { ssr: false }
);

const MyCardsContainer = dynamic(() => 
  import('@/components/my-cards/my-cards-container').then(mod => ({ 
    default: mod.MyCardsContainer 
  })), 
  { ssr: false }
);

export default function MyCardsPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show minimal loading until everything is mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 mb-8"></div>
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <div className="h-12 bg-gray-200 rounded w-64 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-96"></div>
            </div>
            <div className="space-y-6">
              <div className="h-8 bg-gray-200 rounded w-48"></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <div className="h-8 bg-gray-200 rounded flex-1"></div>
                      <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="h-32 bg-gray-200 mt-16"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
            My Gift Cards
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage your purchased gift cards
          </p>
        </div>
        <MyCardsContainer />
      </main>
      <Footer />
    </div>
  );
}