'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    step: '01',
    title: 'Connect Your Wallet',
    description: 'Connect your Web3 wallet to start trading gift cards securely on the blockchain.',
  },
  {
    step: '02',
    title: 'Browse or Create',
    description: 'Browse available gift cards or create your own with encrypted values for privacy.',
  },
  {
    step: '03',
    title: 'Secure Transaction',
    description: 'Complete transactions using supported tokens with automatic price conversion.',
  },
  {
    step: '04',
    title: 'Manage & Redeem',
    description: 'Access your gift cards anytime and redeem them with full privacy protection.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get started with DG Market in four simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {step.step}
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRight className="hidden lg:block h-5 w-5 text-muted-foreground absolute -right-4 top-8" />
                    )}
                  </div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {step.description}
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