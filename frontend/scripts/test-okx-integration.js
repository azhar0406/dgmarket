// scripts/test-okx-integration-corrected.js
// Following OKX official documentation format exactly

require('dotenv').config();

async function testOKXIntegration() {
  console.log('🧪 Testing OKX DEX Integration (Base Sepolia - Following Official Docs)');
  console.log('='.repeat(60));

  try {
    const axios = require('axios');
    const CryptoJS = require('crypto-js');
    
    // Exact format from OKX documentation
    const apiKey = process.env.OKX_API_KEY;
    const secretKey = process.env.OKX_SECRET_KEY;
    const apiPassphrase = process.env.OKX_API_PASSPHRASE;
    const projectId = process.env.OKX_PROJECT_ID;

    if (!apiKey || !secretKey || !apiPassphrase || !projectId) {
      throw new Error("Missing required environment variables");
    }

    // Helper function exactly as shown in OKX docs
    function getHeaders(timestamp, method, requestPath, queryString = "") {
      const stringToSign = timestamp + method + requestPath + queryString;
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

    // Test 1: Basic quote request (following official docs format)
    console.log('\n📊 Test 1: Getting Quote (Official Format)');
    console.log('-'.repeat(40));
    
    const timestamp = new Date().toISOString();
    const method = 'GET';
    const requestPath = '/api/v5/dex/aggregator/quote';
    
    // Parameters exactly as in OKX docs for Base Sepolia
    const params = {
      chainId: '84532', // Base Sepolia (as mentioned in docs)
      fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native ETH
      toTokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
      amount: '500000000000000', // 0.0005 ETH (from docs example)
      slippage: '0.005' // 0.5% slippage tolerance
    };
    
    const queryString = "?" + new URLSearchParams(params).toString();
    const headers = getHeaders(timestamp, method, requestPath, queryString);
    
    console.log('Request Details:');
    console.log(`  Chain ID: ${params.chainId} (Base Sepolia)`);
    console.log(`  From: ETH (${params.fromTokenAddress})`);
    console.log(`  To: USDC (${params.toTokenAddress})`);
    console.log(`  Amount: ${params.amount} wei (${parseFloat(params.amount) / 1e18} ETH)`);
    console.log(`  Slippage: ${params.slippage}`);
    console.log(`  URL: https://web3.okx.com${requestPath}${queryString}`);
    
    console.log('\nMaking API request...');
    
    const response = await axios.get(
      `https://web3.okx.com${requestPath}${queryString}`, 
      { 
        headers,
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('\nAPI Response Status:', response.status);
    console.log('API Response Code:', response.data.code);
    
    if (response.data.code === '0') {
      console.log('✅ SUCCESS! Base Sepolia is supported by OKX DEX');
      
      const quote = response.data.data[0];
      console.log('\n💱 Quote Details:');
      console.log(`  Input: ${parseFloat(quote.fromTokenAmount) / 1e18} ETH`);
      console.log(`  Output: ${parseFloat(quote.toTokenAmount) / 1e6} USDC`);
      console.log(`  Price Impact: ${quote.priceImpact}%`);
      console.log(`  From Token: ${quote.fromToken.tokenSymbol} (${quote.fromToken.decimal} decimals)`);
      console.log(`  To Token: ${quote.toToken.tokenSymbol} (${quote.toToken.decimal} decimals)`);
      
      return {
        success: true,
        quote: quote,
        network: 'Base Sepolia',
        chainId: '84532'
      };
      
    } else {
      console.log('❌ API returned error code:', response.data.code);
      console.log('❌ API error message:', response.data.msg);
      console.log('❌ Full response:', JSON.stringify(response.data, null, 2));
      
      throw new Error(`OKX API Error (Code ${response.data.code}): ${response.data.msg || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('\n❌ Test Failed');
    console.error('Error Type:', error?.constructor?.name);
    console.error('Error Message:', error?.message);
    
    // Check for specific error types
    if (error?.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response Headers:', error.response.headers);
      console.error('Response Data:', error.response.data);
    }
    
    if (error?.code === 'ECONNREFUSED') {
      console.log('\n🔧 Network connection issue - check internet');
    } else if (error?.message?.includes('timeout')) {
      console.log('\n🔧 Request timeout - try again');
    } else if (error?.message?.includes('401') || error?.message?.includes('403')) {
      console.log('\n🔧 Authentication issue - check API credentials');
    }
    
    return {
      success: false,
      error: error?.message || 'Unknown error',
      details: {
        status: error?.response?.status,
        data: error?.response?.data
      }
    };
  }
}

// Test environment variables
function testEnvironment() {
  console.log('\n🔧 Environment Variables Check:');
  console.log('-'.repeat(40));
  
  const vars = ['OKX_API_KEY', 'OKX_SECRET_KEY', 'OKX_API_PASSPHRASE', 'OKX_PROJECT_ID'];
  let allPresent = true;
  
  vars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    const display = varName.includes('SECRET') || varName.includes('PASSPHRASE') 
      ? '***' 
      : (value ? value.slice(0, 10) + '...' : 'MISSING');
    console.log(`${status} ${varName}: ${display}`);
    
    if (!value) allPresent = false;
  });
  
  return allPresent;
}

// Run the test
async function main() {
  const envOk = testEnvironment();
  
  if (!envOk) {
    console.log('\n❌ Environment setup incomplete');
    console.log('\n🔧 Add missing variables to .env.local:');
    console.log('OKX_API_KEY=89250d3a-2e2d-4ef3-9659-6de9afe6a2a6');
    console.log('OKX_SECRET_KEY=70FEDA5003C9CEE78BBE204381343D73');
    console.log('OKX_API_PASSPHRASE=your_custom_passphrase');
    console.log('OKX_PROJECT_ID=8c10399d652588e1e20308d90a9fc655');
    process.exit(1);
  }
  
  const result = await testOKXIntegration();
  
  console.log('\n' + '='.repeat(60));
  console.log(`📋 Final Result: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (result.success) {
    console.log('🎉 Base Sepolia works with OKX DEX!');
    console.log('🚀 You can proceed with the ETH payment integration');
  } else {
    console.log(`❌ Error: ${result.error}`);
    if (result.details) {
      console.log('📋 Details:', result.details);
    }
  }
  
  process.exit(result.success ? 0 : 1);
}

main();