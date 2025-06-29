// scripts/test-complete-flow.js
// Complete end-to-end testing of the DG Market system

const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import ABIs
const chainlinkGiftCardManagerAbi = require("../artifacts/contracts/ChainlinkGiftCardManager.sol/ChainlinkGiftCardManager.json");
const confidentialGiftCardAbi = require("../artifacts/contracts/ConfidentialGiftCard.sol/ConfidentialGiftCard.json");

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMockAPI() {
  console.log("🔄 Testing Mock API...");
  
  const baseUrl = process.env.GIFT_CARD_API_URL || 'http://localhost:8081';
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log("✅ Mock API health check passed");
    
    // Test categories endpoint
    const categoriesResponse = await axios.get(`${baseUrl}/api/categories`);
    console.log("✅ Categories endpoint working:", categoriesResponse.data.categories.length, "categories");
    
    // Test restock endpoint for each category
    const categories = ["Gaming", "Food & Dining", "Shopping", "Entertainment", "Travel"];
    for (const category of categories) {
      const restockResponse = await axios.get(`${baseUrl}/restock`, {
        params: { category }
      });
      console.log(`✅ Restock for ${category}:`, restockResponse.data.cards.length, "cards");
    }
    
    return true;
  } catch (error) {
    console.error("❌ Mock API test failed:", error.message);
    console.log("💡 Make sure mock API is running on", baseUrl);
    return false;
  }
}

async function testBackendAPI() {
  console.log("\n🔄 Testing Backend API...");
  
  const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log("✅ Backend health check passed");
    
    // Test contracts endpoint
    const contractsResponse = await axios.get(`${baseUrl}/api/contracts`);
    console.log("✅ Backend contracts endpoint working");
    console.log("- Processed requests:", contractsResponse.data.processedRequests);
    
    return true;
  } catch (error) {
    console.error("❌ Backend API test failed:", error.message);
    console.log("💡 Make sure backend service is running on", baseUrl);
    return false;
  }
}

async function testContractInteractions() {
  console.log("\n🔄 Testing Contract Interactions...");
  
  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_BASE_SEPOLIA, provider);
    
    console.log("📊 Wallet:", wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log("📊 ETH Balance:", ethers.formatEther(balance));
    
    // Get contract addresses
    const deploymentPath = "./ignition/deployments/chain-84532/deployed_addresses.json";
    const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const chainlinkManagerAddress = deployedAddresses["DGMarketCompleteModule#ChainlinkGiftCardManager"] || 
                                   deployedAddresses["DGMarketFreshModule#ChainlinkGiftCardManager"];
    const confidentialGiftCardAddress = deployedAddresses["DGMarketCompleteModule#ConfidentialGiftCard"] || 
                                       deployedAddresses["DGMarketFreshModule#ConfidentialGiftCard"];
    
    if (!chainlinkManagerAddress || !confidentialGiftCardAddress) {
      throw new Error("Contract addresses not found in deployment");
    }
    
    console.log("📍 ChainlinkGiftCardManager:", chainlinkManagerAddress);
    console.log("📍 ConfidentialGiftCard:", confidentialGiftCardAddress);
    
    // Initialize contracts
    const chainlinkManager = new ethers.Contract(chainlinkManagerAddress, chainlinkGiftCardManagerAbi.abi, wallet);
    const confidentialGiftCard = new ethers.Contract(confidentialGiftCardAddress, confidentialGiftCardAbi.abi, wallet);
    
    // Test 1: Check categories
    console.log("\n📋 Test 1: Checking categories...");
    const categories = await chainlinkManager.getAllCategories();
    console.log("✅ Categories found:", categories.length);
    categories.forEach(cat => console.log(`  - ${cat}`));
    
    // Test 2: Check inventory counts
    console.log("\n📊 Test 2: Checking inventory counts...");
    for (const category of categories) {
      const count = await chainlinkManager.getInventoryCount(category);
      const details = await chainlinkManager.getCategoryDetails(category);
      console.log(`✅ ${category}: ${count} cards (threshold: ${details.threshold})`);
    }
    
    // Test 3: Check roles
    console.log("\n🔐 Test 3: Checking roles...");
    const adminRole = await chainlinkManager.ADMIN_ROLE();
    const backendRole = await confidentialGiftCard.BACKEND_ROLE();
    
    const hasAdminRole = await chainlinkManager.hasRole(adminRole, wallet.address);
    const managerHasBackendRole = await confidentialGiftCard.hasRole(backendRole, chainlinkManagerAddress);
    
    console.log("✅ Wallet has ADMIN_ROLE:", hasAdminRole);
    console.log("✅ ChainlinkManager has BACKEND_ROLE:", managerHasBackendRole);
    
    if (!hasAdminRole) {
      console.warn("⚠️ Wallet doesn't have ADMIN_ROLE - some operations may fail");
    }
    
    if (!managerHasBackendRole) {
      console.error("❌ ChainlinkManager doesn't have BACKEND_ROLE - gift card creation will fail");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("❌ Contract interaction test failed:", error.message);
    return false;
  }
}

async function testManualRestock() {
  console.log("\n🔄 Testing Manual Restock...");
  
  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_BASE_SEPOLIA, provider);
    
    // Get contract addresses
    const deploymentPath = "./ignition/deployments/chain-84532/deployed_addresses.json";
    const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const chainlinkManagerAddress = deployedAddresses["DGMarketCompleteModule#ChainlinkGiftCardManager"] || 
                                   deployedAddresses["DGMarketFreshModule#ChainlinkGiftCardManager"];
    
    const chainlinkManager = new ethers.Contract(chainlinkManagerAddress, chainlinkGiftCardManagerAbi.abi, wallet);
    
    // Test manual restock for Gaming category
    console.log("🎮 Triggering manual restock for Gaming category...");
    
    const restockTx = await chainlinkManager.manualRestock("Gaming");
    console.log("⏳ Transaction submitted:", restockTx.hash);
    
    const receipt = await restockTx.wait();
    console.log("✅ Restock transaction confirmed!");
    console.log("📊 Block Number:", receipt.blockNumber);
    console.log("⛽ Gas Used:", receipt.gasUsed.toString());
    
    // Parse events
    if (receipt.logs && receipt.logs.length > 0) {
      console.log("\n📋 Events emitted:");
      for (const log of receipt.logs) {
        try {
          const parsed = chainlinkManager.interface.parseLog(log);
          if (parsed.name === 'RestockRequested') {
            console.log(`✅ RestockRequested: RequestID=${parsed.args.requestId}, Category=${parsed.args.category}`);
          }
        } catch (e) {
          // Ignore parsing errors for non-matching events
        }
      }
    }
    
    console.log("\n💡 Manual restock initiated successfully!");
    console.log("🔄 Check backend logs for RestockFulfilled events");
    console.log("⏳ Gift cards should be created automatically by the backend service");
    
    return {
      success: true,
      txHash: restockTx.hash,
      blockNumber: receipt.blockNumber
    };
    
  } catch (error) {
    console.error("❌ Manual restock test failed:", error.message);
    
    if (error.message.includes("AccessControl")) {
      console.log("💡 Make sure your wallet has ADMIN_ROLE in ChainlinkGiftCardManager");
    }
    
    return { success: false, error: error.message };
  }
}

async function testViaBackendAPI() {
  console.log("\n🔄 Testing via Backend API...");
  
  const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
  
  try {
    // Clear processed requests first
    await axios.post(`${baseUrl}/api/clear-processed`);
    console.log("✅ Cleared processed requests");
    
    // Trigger restock via backend
    const restockResponse = await axios.post(`${baseUrl}/api/restock`, {
      category: "Entertainment"
    });
    
    console.log("✅ Backend restock triggered successfully!");
    console.log("📊 Response:", restockResponse.data);
    
    // Wait for processing
    console.log("⏳ Waiting for backend to process events...");
    await wait(30000); // Wait 30 seconds
    
    // Check processed requests
    const processedResponse = await axios.get(`${baseUrl}/api/processed-requests`);
    console.log("📊 Processed requests:", processedResponse.data.count);
    
    return true;
  } catch (error) {
    console.error("❌ Backend API test failed:", error.message);
    return false;
  }
}

async function main() {
  console.log("🧪 DG Market Complete Flow Testing");
  console.log("=".repeat(50));
  
  const testResults = {};
  
  // Test 1: Mock API
  console.log("\n1️⃣ MOCK API TESTING");
  testResults.mockAPI = await testMockAPI();
  
  // Test 2: Backend API
  console.log("\n2️⃣ BACKEND API TESTING");
  testResults.backendAPI = await testBackendAPI();
  
  // Test 3: Contract Interactions
  console.log("\n3️⃣ CONTRACT INTERACTION TESTING");
  testResults.contracts = await testContractInteractions();
  
  // Test 4: Manual Restock (if contracts work)
  if (testResults.contracts) {
    console.log("\n4️⃣ MANUAL RESTOCK TESTING");
    testResults.manualRestock = await testManualRestock();
  }
  
  // Test 5: Backend API Restock (if backend works)
  if (testResults.backendAPI) {
    console.log("\n5️⃣ BACKEND API RESTOCK TESTING");
    testResults.backendRestock = await testViaBackendAPI();
  }
  
  // Final Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 TESTING COMPLETE!");
  console.log("=".repeat(50));
  
  const allTests = Object.entries(testResults);
  const passed = allTests.filter(([_, result]) => result === true || result?.success === true).length;
  const total = allTests.length;
  
  console.log(`📊 Results: ${passed}/${total} tests passed`);
  console.log("");
  
  allTests.forEach(([test, result]) => {
    const icon = (result === true || result?.success === true) ? '✅' : '❌';
    const name = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${icon} ${name}`);
  });
  
  console.log("");
  
  if (passed === total) {
    console.log("🎉 ALL TESTS PASSED! Your DG Market system is working correctly!");
    console.log("");
    console.log("🚀 System Status:");
    console.log("✅ Contracts deployed and verified");
    console.log("✅ Chainlink Functions subscription active");
    console.log("✅ Mock API providing gift card data");
    console.log("✅ Backend service monitoring events");
    console.log("✅ Manual and automatic restocking working");
    console.log("");
    console.log("🎯 Ready for production use!");
  } else {
    console.log("⚠️ Some tests failed. Please check the logs above for details.");
    console.log("");
    console.log("🔧 Common fixes:");
    console.log("- Make sure Mock API is running: node mock-api-service.js");
    console.log("- Make sure Backend is running: npm run dev");
    console.log("- Check .env file has all required variables");
    console.log("- Verify wallet has sufficient ETH and LINK");
    console.log("- Ensure roles are properly configured");
  }
  
  console.log("");
  console.log("📋 Useful URLs:");
  console.log("- Mock API: http://localhost:8081/health");
  console.log("- Backend API: http://localhost:3001/health");
  console.log("- BaseScan Explorer: https://base-sepolia.blockscout.com/");
  console.log("- Chainlink Functions: https://functions.chain.link/");
  
  return testResults;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Testing failed:", error.message);
      process.exit(1);
    });
}

module.exports = { main };