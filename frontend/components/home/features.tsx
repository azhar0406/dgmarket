'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Zap, Lock, Coins, RefreshCw, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Shield,
    title: 'Privacy-First Design',
    description: 'Encrypted gift card values and private user balances using Inco Lightning TEE technology.',
    color: 'text-primary',
  },
  {
    icon: Coins,
    title: 'Multi-Token Support',
    description: 'Accept payments in ETH and swap to various ERC-20 tokens with real-time OKX Dex API',
    color: 'text-green-600',
  },
  {
    icon: Lock,
    title: 'Secure Ownership Transfer',
    description: 'Confidential gift card transfers with cryptographic proof of ownership.',
    color: 'text-purple-600',
  },
  {
    icon: RefreshCw,
    title: 'Automated Restocking',
    description: 'Chainlink Functions automatically restock gift cards when inventory runs low.',
    color: 'text-blue-600',
  },
  {
    icon: Zap,
    title: 'Instant Transactions',
    description: 'Fast and efficient blockchain transactions with minimal gas fees.',
    color: 'text-yellow-600',
  },
  {
    icon: Globe,
    title: 'Global Marketplace',
    description: 'Access gift cards from popular brands worldwide with seamless cross-border trading.',
    color: 'text-red-600',
  },
];

export function Features() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Powerful Features for Secure Gift Card Trading
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built on cutting-edge blockchain technology for maximum security and privacy
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}