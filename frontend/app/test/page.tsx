// app/test/page.tsx
'use client';

import React from 'react';
import { EnvTest } from '@/components/test/env-test';
import { OKXHookTest } from '@/components/test/okx-hook-test';
import { ModalTest } from '@/components/test/modal-test';

export default function TestPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🧪 OKX Cross-Chain Testing</h1>
        <p className="text-muted-foreground">
          Test all components of the OKX integration before going live
        </p>
      </div>

      {/* Environment Test */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">1. Environment Variables</h2>
        <EnvTest />
      </section>

      {/* Hook Test */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">2. Payment Hook Testing</h2>
        <OKXHookTest />
      </section>

      {/* Modal Test */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">3. Payment Modal Testing</h2>
        <ModalTest />
      </section>

      {/* Test Results Summary */}
      <section>
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">✅ Testing Checklist</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Environment:</h4>
              <ul className="space-y-1">
                <li>□ OKX API credentials loaded</li>
                <li>□ Network RPCs configured</li>
                <li>□ Contract addresses set</li>
                <li>□ Admin address configured</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Functionality:</h4>
              <ul className="space-y-1">
                <li>□ ETH calculation works</li>
                <li>□ Gas estimates reasonable</li>
                <li>□ Modal opens/closes</li>
                <li>□ Payment flow UI works</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}