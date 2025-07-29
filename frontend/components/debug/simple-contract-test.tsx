// Create this as: /components/debug/direct-contract-test.tsx

'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DGMarketCoreABI from '@/lib/abis/DGMarketCore.json';

const CONTRACT_ADDRESS = '0x8b1587091470Da7f387e0d93730f7256f09DE185';

// Create a public client for direct contract calls
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'), // Base Sepolia RPC
});

export function DirectContractTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch all categories on component mount
  useEffect(() => {
    fetchAllCategories();
  }, []);

  const fetchAllCategories = async () => {
    try {
      console.log('🔄 Fetching all categories (indices 0-4)...');
      const categoryPromises = [];
      
      for (let i = 0; i < 5; i++) {
        categoryPromises.push(
          publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: DGMarketCoreABI,
            functionName: 'categories',
            args: [i],
          })
        );
      }

      const categoryResults = await Promise.all(categoryPromises);
      const categoryNames = categoryResults.map((name, index) => `${index}: ${name}`);
      
      console.log('✅ Categories fetched:', categoryNames);
      setCategories(categoryNames);
    } catch (err) {
      console.error('❌ Failed to fetch categories:', err);
    }
  };

  const testDirectCall = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔄 Making direct contract call...');
      
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DGMarketCoreABI,
        functionName: 'getAllGiftCards',
      });

      console.log('✅ Direct call successful, processing data...');
      
      // First, let's see the raw structure
      console.log('Raw data structure:', {
        isArray: Array.isArray(data),
        length: (data as any[]).length,
        firstItem: (data as any[])[0],
        firstItemType: typeof (data as any[])[0],
        firstItemIsArray: Array.isArray((data as any[])[0]),
        firstItemKeys: (data as any[])[0] ? Object.keys((data as any[])[0]) : 'No keys'
      });
      
      // Process the data to handle BigInt serialization
      const processedData = (data as any[]).map((card, index) => {
        try {
          console.log(`Processing card ${index}:`, card);
          
          // Try both object and array access patterns
          let result;
          
          if (Array.isArray(card)) {
            // Array format: [cardId, publicPrice, owner, creator, expiryDate, category, description, imageUrl, isActive, isRevealed, createdAt]
            result = {
              index,
              accessPattern: 'array',
              cardId: card[0]?.toString() || 'N/A',
              publicPrice: card[1]?.toString() || 'N/A',
              owner: card[2] || 'N/A',
              creator: card[3] || 'N/A', 
              expiryDate: card[4]?.toString() || 'N/A',
              category: card[5] || 'N/A',
              description: card[6] || 'N/A',
              imageUrl: card[7] || 'N/A',
              isActive: Boolean(card[8]),
              isRevealed: Boolean(card[9]),
              createdAt: card[10]?.toString() || 'N/A',
              rawLength: card?.length || 0,
            };
          } else if (typeof card === 'object' && card !== null) {
            // Object format
            result = {
              index,
              accessPattern: 'object',
              cardId: card.cardId?.toString() || 'N/A',
              publicPrice: card.publicPrice?.toString() || 'N/A',
              owner: card.owner || 'N/A',
              creator: card.creator || 'N/A',
              expiryDate: card.expiryDate?.toString() || 'N/A',
              category: card.category || 'N/A',
              description: card.description || 'N/A',
              imageUrl: card.imageUrl || 'N/A',
              isActive: Boolean(card.isActive),
              isRevealed: Boolean(card.isRevealed),
              createdAt: card.createdAt?.toString() || 'N/A',
              rawLength: 'object',
              rawKeys: Object.keys(card).join(', ')
            };
          } else {
            // Unknown format
            result = {
              index,
              accessPattern: 'unknown',
              cardId: 'UNKNOWN',
              publicPrice: 'UNKNOWN',
              category: 'UNKNOWN',
              description: 'UNKNOWN',
              isActive: false,
              isRevealed: false,
              rawType: typeof card,
              rawValue: String(card),
              rawLength: 'unknown'
            };
          }
          
          console.log(`Processed card ${index}:`, result);
          return result;
        } catch (err) {
          console.error(`Error processing card ${index}:`, err);
          return { 
            index, 
            error: err instanceof Error ? err.message : 'Unknown error', 
            raw: card,
            cardId: 'ERROR',
            publicPrice: 'ERROR',
            category: 'ERROR',
            description: 'ERROR',
            isActive: false,
            isRevealed: false,
            accessPattern: 'error'
          };
        }
      });

      console.log('✅ Processed data:', processedData);
      setResult(processedData);
    } catch (err) {
      console.error('❌ Direct call failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testCategoryInventory = async (categoryName: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔄 Testing getCategoryInventory with category: ${categoryName}...`);
      
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DGMarketCoreABI,
        functionName: 'getCategoryInventory',
        args: [categoryName],
      });

      console.log('✅ Category inventory call successful, processing...');
      
      // Handle BigInt in category data
      const processedData = {
        category: categoryName,
        count: data[0]?.toString(),
        threshold: data[1]?.toString(), 
        active: data[2]
      };

      console.log('✅ Processed category data:', processedData);
      setResult({ type: 'categoryInventory', data: processedData });
    } catch (err) {
      console.error('❌ Category inventory call failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testContractConnection = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Testing basic contract connection...');
      
      // Try to get the contract's supported interface
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: DGMarketCoreABI,
        functionName: 'supportsInterface',
        args: ['0x01ffc9a7'], // ERC165 interface ID
      });

      console.log('✅ Contract connection test successful:', data);
      setResult({ type: 'connection', data });
    } catch (err) {
      console.error('❌ Contract connection test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testAllCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Testing all category inventories...');
      
      const results = [];
      
      // Test each category we found
      for (let i = 0; i < 5; i++) {
        try {
          const categoryName = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: DGMarketCoreABI,
            functionName: 'categories',
            args: [i],
          });

          const inventoryData = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: DGMarketCoreABI,
            functionName: 'getCategoryInventory',
            args: [categoryName],
          });

          results.push({
            index: i,
            name: categoryName,
            count: inventoryData[0]?.toString(),
            threshold: inventoryData[1]?.toString(),
            active: inventoryData[2]
          });
        } catch (err) {
          results.push({
            index: i,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }

      console.log('✅ All categories tested:', results);
      setResult({ type: 'allCategories', data: results });
    } catch (err) {
      console.error('❌ All categories test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Direct Contract Call Test - Fixed Categories</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Direct viem Contract Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            
            {/* Categories Display */}
            {categories.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <h4 className="font-semibold text-green-900 mb-2">Available Categories:</h4>
                <div className="text-sm text-green-800">
                  {categories.map((cat, index) => (
                    <div key={index}>{cat}</div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Test Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={testContractConnection}
                disabled={loading}
                variant="outline"
              >
                Test Connection
              </Button>
              <Button 
                onClick={testAllCategories}
                disabled={loading}
                variant="outline"
              >
                Test All Categories
              </Button>
              <Button 
                onClick={() => testCategoryInventory('Gaming')}
                disabled={loading}
                variant="outline"
              >
                Test Gaming Category
              </Button>
              <Button 
                onClick={testDirectCall}
                disabled={loading}
              >
                Get All Gift Cards
              </Button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-blue-800">🔄 Making direct contract call...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800">
                  <strong>Error:</strong> {error}
                </p>
              </div>
            )}

            {/* Success State */}
            {result && (
              <div className="space-y-3">
                <Badge variant="default">✅ Direct Call Successful</Badge>
                
                {/* Handle gift cards array */}
                {Array.isArray(result) && result.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900">Gift Cards Found: {result.length}</h4>
                    <div className="space-y-2 mt-2">
                      {result.map((card: any, index: number) => (
                        <div key={index} className="p-3 bg-gray-50 rounded text-sm border">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-gray-900"><strong>Card ID:</strong> {card.cardId}</div>
                            <div className="text-gray-900"><strong>Price (Wei):</strong> {card.publicPrice}</div>
                            <div className="text-gray-900"><strong>Category:</strong> {card.category}</div>
                            <div className="text-gray-900"><strong>Description:</strong> {card.description}</div>
                            <div className="text-gray-900"><strong>Active:</strong> {card.isActive ? 'Yes' : 'No'}</div>
                            <div className="text-gray-900"><strong>Revealed:</strong> {card.isRevealed ? 'Yes' : 'No'}</div>
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            <div>Access Pattern: {card.accessPattern}</div>
                            <div>Raw Length: {card.rawLength}</div>
                            <div>Owner: {card.owner}</div>
                            {card.rawKeys && <div>Object Keys: {card.rawKeys}</div>}
                            {card.rawType && <div>Raw Type: {card.rawType}</div>}
                          </div>
                          {card.error && (
                            <div className="text-red-600 text-xs mt-1">
                              Error: {card.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Handle empty gift cards array */}
                {Array.isArray(result) && result.length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800">No gift cards found in contract</p>
                  </div>
                )}

                {/* Handle single category inventory result */}
                {result.type === 'categoryInventory' && (
                  <div>
                    <h4 className="font-semibold text-gray-900">Category Inventory ({result.data.category}):</h4>
                    <div className="bg-gray-100 p-3 rounded text-sm space-y-1">
                      <div className="text-gray-900"><strong>Count:</strong> {result.data.count}</div>
                      <div className="text-gray-900"><strong>Threshold:</strong> {result.data.threshold}</div>
                      <div className="text-gray-900"><strong>Active:</strong> {result.data.active ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                )}

                {/* Handle all categories result */}
                {result.type === 'allCategories' && (
                  <div>
                    <h4 className="font-semibold text-gray-900">All Category Inventories:</h4>
                    <div className="space-y-2 mt-2">
                      {result.data.map((cat: any, index: number) => (
                        <div key={index} className="bg-gray-100 p-3 rounded text-sm">
                          {cat.error ? (
                            <div className="text-red-600">
                              <strong>Index {cat.index}:</strong> Error - {cat.error}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-gray-900"><strong>Index {cat.index}:</strong> {cat.name}</div>
                              <div className="text-gray-700">Count: {cat.count} | Threshold: {cat.threshold} | Active: {cat.active ? 'Yes' : 'No'}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Handle connection test result */}
                {result.type === 'connection' && (
                  <div>
                    <h4 className="font-semibold text-gray-900">Connection Test:</h4>
                    <div className="bg-gray-100 p-2 rounded text-sm">
                      <div className="text-gray-900">Supports ERC165: {result.data ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                )}

                {/* Handle any other result */}
                {!Array.isArray(result) && !result.type && (
                  <div>
                    <h4 className="font-semibold">Raw Result:</h4>
                    <div className="bg-gray-100 p-2 rounded text-xs">
                      <div>Type: {typeof result}</div>
                      <div>Value: {String(result)}</div>
                    </div>
                  </div>
                )}

                {/* Debug info */}
                <div className="mt-4 p-2 bg-blue-50 rounded text-xs">
                  <div className="text-blue-900"><strong>Debug:</strong></div>
                  <div className="text-blue-800">Result type: {typeof result}</div>
                  <div className="text-blue-800">Is array: {Array.isArray(result) ? 'Yes' : 'No'}</div>
                  <div className="text-blue-800">Has type property: {result?.type ? result.type : 'No'}</div>
                  <div className="text-blue-800">Result keys: {typeof result === 'object' ? Object.keys(result).join(', ') : 'N/A'}</div>
                </div>
              </div>
            )}

            {/* Contract Info */}
            <div className="mt-6 p-3 bg-gray-50 rounded text-sm">
              <h4 className="font-semibold mb-2 text-gray-900">Contract Details:</h4>
              <div className="text-gray-900"><strong>Address:</strong> {CONTRACT_ADDRESS}</div>
              <div className="text-gray-900"><strong>Chain:</strong> Base Sepolia (84532)</div>
              <div className="text-gray-900"><strong>RPC:</strong> https://sepolia.base.org</div>
              <div className="text-gray-900"><strong>Categories Found:</strong> {categories.length > 0 ? categories.length : 'Loading...'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}