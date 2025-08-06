// scripts/debug-okx-chains.js
// Debug test to find the correct chainId/chainIndex for Base Sepolia

require('dotenv').config();

async function debugOKXChains() {
  console.log('🔍 Debugging OKX DEX Chain Support');
  console.log('='.repeat(50));

  const axios = require('axios');
  const CryptoJS = require('crypto-js');
  
  const apiKey = process.env.OKX_API_KEY;
  const secretKey = process.env.OKX_SECRET_KEY;
  const apiPassphrase = process.env.OKX_API_PASSPHRASE;
  const projectId = process.env.OKX_PROJECT_ID;

  function getHeaders(timestamp, method, requestPath, queryString = "", body = "") {
    const stringToSign = timestamp + method + requestPath + (queryString || body);
    return {
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": CryptoJS.enc.Base64.stringify(
        CryptoJS.HmacSHA256(stringToSign, secretKey)
      ),
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": apiPassphrase,
      "OK-ACCESS-PROJECT": projectId,
    };
  }

  try {
    // Test 1: Get supported chains for DEX aggregator
    console.log('\n🌐 Test 1: Get Supported Chains for DEX Aggregator');
    console.log('-'.repeat(50));
    
    const timestamp1 = new Date().toISOString();
    const path1 = '/api/v5/dex/aggregator/supported/chain';
    const headers1 = getHeaders(timestamp1, 'GET', path1);
    
    try {
      const response1 = await axios.get(`https://web3.okx.com${path1}`, { headers: headers1 });
      
      if (response1.data.code === '0') {
        console.log('✅ Supported chains for DEX aggregator:');
        response1.data.data.forEach(chain => {
          const isBase = chain.chainName && chain.chainName.toLowerCase().includes('base');
          const indicator = isBase ? '🎯' : '  ';
          console.log(`${indicator} ${chain.chainName || 'Unknown'} (chainId: ${chain.chainId || chain.chainIndex})`);
        });
        
        // Look specifically for Base chains
        const baseChains = response1.data.data.filter(chain => 
          chain.chainName && chain.chainName.toLowerCase().includes('base')
        );
        
        if (baseChains.length > 0) {
          console.log('\n🎯 Base Networks Found:');
          baseChains.forEach(chain => {
            console.log(`  - ${chain.chainName}: chainId=${chain.chainId}, chainIndex=${chain.chainIndex}`);
          });
        }
      } else {
        console.log('❌ Failed to get DEX aggregator chains:', response1.data.msg);
      }
    } catch (error) {
      console.log('❌ DEX aggregator chains API not available:', error?.response?.data?.msg || error?.message);
    }

    // Test 2: Get supported chains for cross-chain
    console.log('\n🌐 Test 2: Get Cross-Chain Supported Chains');
    console.log('-'.repeat(50));
    
    const timestamp2 = new Date().toISOString();
    const path2 = '/api/v5/dex/cross-chain/supported/chain';
    const headers2 = getHeaders(timestamp2, 'GET', path2);
    
    try {
      const response2 = await axios.get(`https://web3.okx.com${path2}`, { headers: headers2 });
      
      if (response2.data.code === '0') {
        console.log('✅ Supported chains for cross-chain:');
        response2.data.data.forEach(chain => {
          const isBase = chain.chainName && chain.chainName.toLowerCase().includes('base');
          const indicator = isBase ? '🎯' : '  ';
          console.log(`${indicator} ${chain.chainName || 'Unknown'} (chainId: ${chain.chainId || chain.chainIndex})`);
        });
      } else {
        console.log('❌ Failed to get cross-chain chains:', response2.data.msg);
      }
    } catch (error) {
      console.log('❌ Cross-chain API not available:', error?.response?.data?.msg || error?.message);
    }

    // Test 3: Try different chain ID formats for Base
    console.log('\n🧪 Test 3: Testing Different Chain ID Formats');
    console.log('-'.repeat(50));
    
    const testChainIds = [
      { id: '8453', name: 'Base Mainnet' },
      { id: '84532', name: 'Base Sepolia' },
      { id: 8453, name: 'Base Mainnet (number)' },
      { id: 84532, name: 'Base Sepolia (number)' }
    ];
    
    for (const testChain of testChainIds) {
      console.log(`\nTesting ${testChain.name} (${testChain.id})...`);
      
      const timestamp3 = new Date().toISOString();
      const path3 = '/api/v5/dex/aggregator/quote';
      
      const params3 = {
        chainId: testChain.id.toString(),
        fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        toTokenAddress: testChain.id.toString() === '8453' 
          ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base mainnet USDC
          : '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
        amount: '500000000000000',
        slippage: '0.005'
      };
      
      const queryString3 = "?" + new URLSearchParams(params3).toString();
      const headers3 = getHeaders(timestamp3, 'GET', path3, queryString3);
      
      try {
        const response3 = await axios.get(
          `https://web3.okx.com${path3}${queryString3}`, 
          { headers: headers3, timeout: 10000 }
        );
        
        if (response3.data.code === '0') {
          console.log(`  ✅ ${testChain.name} WORKS!`);
          const quote = response3.data.data[0];
          console.log(`     Output: ${(parseFloat(quote.toTokenAmount) / 1e6).toFixed(4)} USDC`);
        } else {
          console.log(`  ❌ ${testChain.name}: Code ${response3.data.code} - ${response3.data.msg}`);
        }
      } catch (error) {
        console.log(`  ❌ ${testChain.name}: ${error?.response?.data?.msg || error?.message}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 4: Try with chainIndex parameter instead of chainId
    console.log('\n🧪 Test 4: Testing chainIndex Parameter');
    console.log('-'.repeat(50));
    
    const timestamp4 = new Date().toISOString();
    const path4 = '/api/v5/dex/aggregator/quote';
    
    const params4 = {
      chainIndex: '84532', // Try chainIndex instead of chainId
      fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      toTokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: '500000000000000',
      slippage: '0.005'
    };
    
    const queryString4 = "?" + new URLSearchParams(params4).toString();
    const headers4 = getHeaders(timestamp4, 'GET', path4, queryString4);
    
    try {
      const response4 = await axios.get(
        `https://web3.okx.com${path4}${queryString4}`, 
        { headers: headers4 }
      );
      
      if (response4.data.code === '0') {
        console.log('✅ chainIndex parameter works for Base Sepolia!');
        return { success: true, useChainIndex: true, chainId: '84532' };
      } else {
        console.log(`❌ chainIndex failed: Code ${response4.data.code} - ${response4.data.msg}`);
      }
    } catch (error) {
      console.log(`❌ chainIndex test failed: ${error?.response?.data?.msg || error?.message}`);
    }

  } catch (error) {
    console.error('❌ Debug test failed:', error?.message);
    return { success: false, error: error?.message };
  }

  return { success: false, error: 'No working configuration found' };
}

// Run debug
debugOKXChains()
  .then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('🔍 Debug Complete');
    
    if (result.success) {
      console.log('✅ Found working configuration!');
      if (result.useChainIndex) {
        console.log('💡 Use chainIndex instead of chainId');
      }
      console.log(`🎯 Working Chain ID: ${result.chainId}`);
    } else {
      console.log('❌ No working configuration found');
      console.log('💡 Consider using Base mainnet (8453) instead');
    }
  })
  .catch(console.error);