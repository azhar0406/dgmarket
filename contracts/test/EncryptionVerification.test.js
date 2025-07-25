// Test script to try direct string encryption with Inco SDK
// Based on official docs: https://docs.inco.org/js-sdk/existing-project

import { getViemChain, supportedChains } from '@inco/js';
import { Lightning } from '@inco/js/lite';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

async function testDirectStringEncryption() {
  try {
    console.log("🧪 Testing Direct String Encryption with Inco SDK");
    
    // Setup exactly like docs
    const chainId = supportedChains.baseSepolia;
    const zap = Lightning.latest('testnet', chainId);
    
    const walletClient = createWalletClient({
      chain: getViemChain(chainId),
      account: privateKeyToAccount(process.env.PRIVATE_KEY_BASE_SEPOLIA || '0x1234567890123456789012345678901234567890123456789012345678901234'),
      transport: http(), // or your transport
    });
    
    const dappAddress = '0xC09C42826d3a86bF9d9a9a2cAE96156dAF177863'; // Your DGMarketCore
    
    // TEST 1: Number (known to work from docs)
    console.log("\n✅ Test 1: Number encryption (baseline)");
    const numberPlaintext = 42;
    try {
      const numberCiphertext = await zap.encrypt(numberPlaintext, {
        accountAddress: walletClient.account.address,
        dappAddress,
      });
      console.log("✅ Number encryption SUCCESS:", numberCiphertext.substring(0, 20) + "...");
    } catch (error) {
      console.log("❌ Number encryption FAILED:", error.message);
    }
    
    // TEST 2: String directly (what you want to test)
    console.log("\n🧪 Test 2: Direct string encryption");
    const stringPlaintext = "GIFT-CARD-CODE-123";
    try {
      const stringCiphertext = await zap.encrypt(stringPlaintext, {
        accountAddress: walletClient.account.address,
        dappAddress,
      });
      console.log("✅ STRING ENCRYPTION SUCCESS:", stringCiphertext.substring(0, 20) + "...");
      return { success: true, ciphertext: stringCiphertext };
    } catch (error) {
      console.log("❌ String encryption FAILED:", error.message);
      console.log("Error details:", error);
    }
    
    // TEST 3: BigInt from string (if direct fails)
    console.log("\n🔄 Test 3: BigInt conversion fallback");
    try {
      const bigIntValue = BigInt(`0x${Buffer.from(stringPlaintext).toString('hex')}`);
      const bigIntCiphertext = await zap.encrypt(bigIntValue, {
        accountAddress: walletClient.account.address,
        dappAddress,
      });
      console.log("✅ BigInt conversion SUCCESS:", bigIntCiphertext.substring(0, 20) + "...");
    } catch (error) {
      console.log("❌ BigInt conversion FAILED:", error.message);
    }
    
    // TEST 4: Simple string-to-number conversion
    console.log("\n🔢 Test 4: Simple string-to-number");
    try {
      // Convert string to ASCII numbers
      const asciiSum = stringPlaintext.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const asciiCiphertext = await zap.encrypt(asciiSum, {
        accountAddress: walletClient.account.address,
        dappAddress,
      });
      console.log("✅ ASCII sum encryption SUCCESS:", asciiCiphertext.substring(0, 20) + "...");
    } catch (error) {
      console.log("❌ ASCII sum encryption FAILED:", error.message);
    }
    
  } catch (error) {
    console.error("🚨 Setup error:", error);
  }
}

// Alternative: Test what types Inco SDK accepts
async function testIncoAcceptedTypes() {
  console.log("\n🔍 Testing what types Inco SDK accepts...");
  
  const testValues = [
    { name: "Number", value: 42 },
    { name: "String", value: "test" },
    { name: "BigInt", value: 42n },
    { name: "Boolean", value: true },
    { name: "Array", value: [1, 2, 3] },
    { name: "Object", value: { test: 1 } },
  ];
  
  for (const test of testValues) {
    try {
      console.log(`Testing ${test.name}:`, typeof test.value);
      // This would normally call zap.encrypt, but we'll just check the type
      if (typeof test.value === 'number' || typeof test.value === 'bigint') {
        console.log(`✅ ${test.name} - Likely to work`);
      } else {
        console.log(`❓ ${test.name} - Need to test`);
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Failed:`, error.message);
    }
  }
}

// Run the tests
console.log("🚀 Starting Inco Direct String Encryption Tests...");
testDirectStringEncryption();
testIncoAcceptedTypes();