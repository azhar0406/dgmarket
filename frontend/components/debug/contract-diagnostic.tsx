// Create this as: /components/debug/contract-diagnostic.tsx

import { useContractDiagnostic, useCategoryInventoryTest } from '@/hooks/use-contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export function ContractDiagnostic() {
  const diagnostic = useContractDiagnostic();
  const categoryInventory = useCategoryInventoryTest('retail');

  const StatusIcon = ({ status, isLoading }: { status: boolean | null, isLoading?: boolean }) => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Contract Diagnostic</h1>
        <p className="text-muted-foreground">Testing contract connectivity and function calls</p>
      </div>

      {/* Contract Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>DGMarketCore:</strong>
              <code className="block text-xs mt-1 p-2 bg-muted rounded">
                0x8b15...E185
              </code>
            </div>
            <div>
              <strong>Chain:</strong>
              <span className="block mt-1">Base Sepolia (84532)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Connectivity Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon 
                status={diagnostic.connectivity.isConnected} 
                isLoading={diagnostic.connectivity.isLoading} 
              />
              Contract Connectivity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Badge variant={diagnostic.connectivity.isConnected ? "default" : "destructive"}>
                  {diagnostic.connectivity.isConnected ? "Connected" : "Failed"}
                </Badge>
              </div>
              {diagnostic.connectivity.error && (
                <p className="text-xs text-red-600">
                  {diagnostic.connectivity.error.message}
                </p>
              )}
              {diagnostic.connectivity.data && (
                <div className="text-xs text-green-600">
                  ✓ getCategoryInventory() working
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Listings Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon 
                status={diagnostic.listings.error ? false : true} 
                isLoading={diagnostic.listings.isLoading} 
              />
              Active Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Badge variant={diagnostic.listings.error ? "destructive" : 
                              diagnostic.listings.isEmpty ? "secondary" : "default"}>
                  {diagnostic.listings.error ? "Error" : 
                   diagnostic.listings.isEmpty ? "Empty" : 
                   `${diagnostic.listings.listings.length} cards`}
                </Badge>
              </div>
              {diagnostic.listings.error && (
                <p className="text-xs text-red-600">
                  Function reverted - likely no gift cards exist yet
                </p>
              )}
              {diagnostic.listings.isEmpty && (
                <p className="text-xs text-blue-600">
                  ✓ Contract connected but no active listings
                </p>
              )}
              {diagnostic.listings.rawData && (
                <p className="text-xs text-green-600">
                  Raw data: {JSON.stringify(diagnostic.listings.rawData)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Individual Card Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon 
                status={diagnostic.testCard.exists} 
                isLoading={diagnostic.testCard.isLoading} 
              />
              Card Reading (ID: 1)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Badge variant={diagnostic.testCard.exists ? "default" : "destructive"}>
                  {diagnostic.testCard.exists ? "Exists" : "Not Found"}
                </Badge>
              </div>
              {diagnostic.testCard.error && (
                <p className="text-xs text-red-600">
                  {diagnostic.testCard.error.message}
                </p>
              )}
              {diagnostic.testCard.data && (
                <div className="text-xs text-green-600">
                  ✓ getGiftCard(1) successful
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon 
                status={!!categoryInventory.data} 
                isLoading={categoryInventory.isLoading} 
              />
              Category Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryInventory.data && (
                <div>
                  <Badge variant="default">Working</Badge>
                  <div className="text-xs mt-2">
                    <div>Count: {categoryInventory.data.count}</div>
                    <div>Threshold: {categoryInventory.data.threshold}</div>
                    <div>Active: {categoryInventory.data.active ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}
              {categoryInventory.error && (
                <div>
                  <Badge variant="destructive">Error</Badge>
                  <p className="text-xs text-red-600 mt-1">
                    {categoryInventory.error.message}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusIcon status={diagnostic.summary.contractConnected} />
              <span>Contract Connected: {diagnostic.summary.contractConnected ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon status={diagnostic.summary.listingsWork} />
              <span>Listings Function: {diagnostic.summary.listingsWork ? 'Working' : 'Reverting'}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon status={diagnostic.summary.hasData} />
              <span>Has Data: {diagnostic.summary.hasData ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon status={diagnostic.summary.cardReadWorks} />
              <span>Card Reading: {diagnostic.summary.cardReadWorks ? 'Working' : 'Not Working'}</span>
            </div>
          </div>

          {diagnostic.summary.contractConnected && diagnostic.summary.isEmpty && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🎯 <strong>Diagnosis:</strong> Contract is connected and working, but no gift cards have been created yet. 
                The marketplace will show fallback data until gift cards are added to the contract.
              </p>
            </div>
          )}

          {!diagnostic.summary.contractConnected && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                ❌ <strong>Issue:</strong> Contract connection failed. Check network, contract address, and ABI.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="text-center">
        <Button onClick={() => window.location.reload()}>
          Refresh Diagnostic
        </Button>
      </div>
    </div>
  );
}