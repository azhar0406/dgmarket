'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Zap, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAdmin } from '@/hooks/use-admin';

export function Hero() {
  const { isAdmin } = useAdmin();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="mb-6 flex justify-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600/10">
                <Lock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600/10">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
            </div>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
                Decentralized
              </span>
              <br />
              Gift Card Marketplace
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Privacy-first gift card trading powered by Inco Lightning's Trusted Execution Environment 
              and Chainlink Functions for automated inventory management.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Button size="lg" className="text-lg" asChild>
              <Link href="/marketplace">
                Explore Marketplace
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg" asChild>
              <Link href={isAdmin ? "/create" : "/my-cards"}>
                {isAdmin ? "Create Gift Card" : "View My Cards"}
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Private Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">24/7</div>
              <div className="text-sm text-muted-foreground">Automated Restocking</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">Multi-Token</div>
              <div className="text-sm text-muted-foreground">Payment Support</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}