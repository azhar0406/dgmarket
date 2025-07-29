// Create this as: /app/diagnostic/page.tsx

'use client';

import { ContractDiagnostic } from '@/components/debug/contract-diagnostic';

export default function DiagnosticPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <ContractDiagnostic />
      </main>
    </div>
  );
}