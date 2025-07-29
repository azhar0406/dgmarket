// Create this as: /app/simple-test/page.tsx

'use client';

import { DirectContractTest } from '@/components/debug/simple-contract-test';

export default function SimpleTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <DirectContractTest />
    </div>
  );
}