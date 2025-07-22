'use client';

import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  {
    label: 'Total Value Locked',
    value: '$2.4M',
    description: 'Secured in smart contracts',
  },
  {
    label: 'Gift Cards Traded',
    value: '12,847',
    description: 'Successfully completed transactions',
  },
  {
    label: 'Active Users',
    value: '3,291',
    description: 'Verified wallet addresses',
  },
  {
    label: 'Supported Brands',
    value: '150+',
    description: 'Popular gift card brands',
  },
];

export function Stats() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Trusted by Thousands
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join our growing community of secure gift card traders
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-lg font-semibold text-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}