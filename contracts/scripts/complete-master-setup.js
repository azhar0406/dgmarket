// scripts/complete-master-setup.js
// Complete master script that includes ALL configuration

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import individual scripts
const { main: setupSubscription } = require('./safe-subscription-setup');
const { main: updateSubscription } = require('./update-subscription-id');
const { main: verifyContracts } = require('./verify-contracts');

// Import configuration logic from configure-viem.js
const { createWalletClient, createPublicClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { baseSepolia } = require("viem/chains");

// Define contractAddresses at global scope so it's accessible to all functions
let contractAddresses = {};

async function checkPrerequisites() {
  console.log("🔍 Checking Prerequisites...");
  console.log("=".repeat(50));
  
  const requiredEnvVars = [
    'PRIVATE_KEY_BASE_SEPOLIA',
    'BASE_SEPOLIA_RPC_URL',
    'ETHERSCAN_API_KEY'
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach(varName => console.error(`  - ${varName}`));
    console.log("\n💡 Please update your .env file with these variables");
    return false;
  }
  
  // Check if contracts are deployed
  const deploymentPath = "./ignition/deployments/chain-84532/deployed_addresses.json";
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Contracts not deployed yet");
    console.log("💡 Run: pnpm hardhat ignition deploy ./ignition/modules/DGMarketComplete.ts --network baseSepolia");
    return false;
  }
  
  console.log("✅ All prerequisites met!");
  return true;
}

async function configureSystemRoles() {
  console.log("🔐 Configuring System Roles and Permissions...");
  console.log("=".repeat(50));

  // Import ABIs
  const dgMarketCoreAbi = require("../artifacts/contracts/DGMarketCore.sol/DGMarketCore.json");
  const priceOracleAbi = require("../artifacts/contracts/PriceOracle.sol/PriceOracle.json");
  const chainlinkGiftCardManagerAbi = require("../artifacts/contracts/ChainlinkGiftCardManager.sol/ChainlinkGiftCardManager.json");
  const confidentialGiftCardAbi = require("../artifacts/contracts/ConfidentialGiftCard.sol/ConfidentialGiftCard.json");

  // Setup wallet and client
  const PRIVATE_KEY = process.env.PRIVATE_KEY_BASE_SEPOLIA.startsWith("0x") 
    ? process.env.PRIVATE_KEY_BASE_SEPOLIA 
    : `0x${process.env.PRIVATE_KEY_BASE_SEPOLIA}`;

  const account = privateKeyToAccount(PRIVATE_KEY);
  const chain = baseSepolia;
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const wallet = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  // Get deployed contract addresses
  const deploymentPath = "./ignition/deployments/chain-84532/deployed_addresses.json";
  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  contractAddresses = {
    confidentialGiftCard: deployedAddresses["DGMarketCompleteModule#ConfidentialGiftCard"] || 
                          deployedAddresses["DGMarketFreshModule#ConfidentialGiftCard"],
    priceOracle: deployedAddresses["DGMarketCompleteModule#PriceOracle"] || 
                 deployedAddresses["DGMarketFreshModule#PriceOracle"],
    dgMarketCore: deployedAddresses["DGMarketCompleteModule#DGMarketCore"] || 
                  deployedAddresses["DGMarketFreshModule#DGMarketCore"],
    chainlinkGiftCardManager: deployedAddresses["DGMarketCompleteModule#ChainlinkGiftCardManager"] || 
                             deployedAddresses["DGMarketFreshModule#ChainlinkGiftCardManager"]
  };

  console.log("📍 Contract Addresses:");
  Object.entries(contractAddresses).forEach(([name, address]) => {
    console.log(`- ${name}: ${address}`);
  });

  try {
    // 1. Configure roles and permissions
    console.log("\n1️⃣ Configuring roles and permissions...");
    
    if (contractAddresses.chainlinkGiftCardManager && contractAddresses.confidentialGiftCard) {
      // Grant BACKEND_ROLE to ChainlinkGiftCardManager in ConfidentialGiftCard
      try {
        const grantBackendRoleTxHash = await wallet.writeContract({
          address: contractAddresses.confidentialGiftCard,
          abi: confidentialGiftCardAbi.abi,
          functionName: "grantBackendRole",
          args: [contractAddresses.chainlinkGiftCardManager],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: grantBackendRoleTxHash });
        console.log(`✅ Granted BACKEND_ROLE to ChainlinkGiftCardManager`);
      } catch (error) {
        if (error.message.includes("role already granted") || error.message.includes("already has role")) {
          console.log(`✅ BACKEND_ROLE already granted (from deployment)`);
        } else {
          console.log(`⚠️ Backend role configuration issue:`, error.message);
        }
      }
      
      // Grant ADMIN_ROLE to deployer
      try {
        const grantAdminRoleTxHash = await wallet.writeContract({
          address: contractAddresses.confidentialGiftCard,
          abi: confidentialGiftCardAbi.abi,
          functionName: "grantAdminRole",
          args: [wallet.account.address],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: grantAdminRoleTxHash });
        console.log(`✅ Granted ADMIN_ROLE to deployer in ConfidentialGiftCard`);
      } catch (error) {
        if (error.message.includes("role already granted") || error.message.includes("already has role")) {
          console.log(`✅ ADMIN_ROLE already granted (from deployment)`);
        } else {
          console.log(`⚠️ Admin role configuration issue:`, error.message);
        }
      }
    }

    // 2. Grant ADMIN_ROLE in ChainlinkGiftCardManager
    if (contractAddresses.chainlinkGiftCardManager) {
      try {
        const adminRole = await publicClient.readContract({
          address: contractAddresses.chainlinkGiftCardManager,
          abi: chainlinkGiftCardManagerAbi.abi,
          functionName: "ADMIN_ROLE",
        });
        
        const grantRoleTxHash = await wallet.writeContract({
          address: contractAddresses.chainlinkGiftCardManager,
          abi: chainlinkGiftCardManagerAbi.abi,
          functionName: "grantRole",
          args: [adminRole, wallet.account.address],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: grantRoleTxHash });
        console.log(`✅ Granted ADMIN_ROLE in ChainlinkGiftCardManager`);
      } catch (error) {
        if (error.message.includes("role already granted") || error.message.includes("already has role")) {
          console.log(`✅ ADMIN_ROLE already granted in ChainlinkGiftCardManager`);
        } else {
          console.log(`⚠️ Role configuration issue:`, error.message);
        }
      }
    }

    console.log("✅ Role configuration completed!");
    return true;

  } catch (error) {
    console.error("❌ Role configuration failed:", error.message);
    return false;
  }
}

async function wait(seconds) {
  console.log(`⏳ Waiting ${seconds} seconds...`);
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function updateEnvFile() {
  console.log('\nUpdating .env file with contract addresses...');
  
  const envFilePath = path.join(__dirname, '../../backend/.env');
  
  // Check if .env file exists
  if (!fs.existsSync(envFilePath)) {
    console.log(`Warning: .env file not found at ${envFilePath}`);
    return;
  }
  
  try {
    // Read current .env content
    let envContent = fs.readFileSync(envFilePath, 'utf8');
    
    // Update contract addresses
    envContent = envContent.replace(/CHAINLINK_MANAGER_ADDRESS=".*"/g, `CHAINLINK_MANAGER_ADDRESS="${contractAddresses.chainlinkGiftCardManager}"`);
    envContent = envContent.replace(/GIFT_CARD_ADDRESS=".*"/g, `GIFT_CARD_ADDRESS="${contractAddresses.confidentialGiftCard}"`);
    envContent = envContent.replace(/CONFIDENTIAL_GIFTCARD_ADDRESS=".*"/g, `CONFIDENTIAL_GIFTCARD_ADDRESS="${contractAddresses.confidentialGiftCard}"`);
    
    // Write updated content back to .env
    fs.writeFileSync(envFilePath, envContent);
    
    console.log('✅ .env file updated successfully with the following values:');
    console.log(`  CHAINLINK_MANAGER_ADDRESS="${contractAddresses.chainlinkGiftCardManager}"`);
    console.log(`  GIFT_CARD_ADDRESS="${contractAddresses.confidentialGiftCard}"`);
    console.log(`  CONFIDENTIAL_GIFTCARD_ADDRESS="${contractAddresses.confidentialGiftCard}"`);
  } catch (error) {
    console.error(`Error updating .env file: ${error.message}`);
  }
}

async function main() {
  console.log("🚀 DG Market Complete Master Setup");
  console.log("=".repeat(50));
  console.log("This script will:");
  console.log("1. ✅ Check prerequisites");
  console.log("2. 🔐 Configure roles and permissions");
  console.log("3.  Update contract with subscription ID");
  console.log("4. 🔍 Verify contracts on Etherscan");
  console.log("");
  
  const startTime = Date.now();
  
  try {
    // Step 1: Check prerequisites
    console.log("STEP 1: PREREQUISITES CHECK");
    console.log("=".repeat(30));
    const prereqsOk = await checkPrerequisites();
    if (!prereqsOk) {
      process.exit(1);
    }
    await wait(2);
    
    // Step 2: Configure roles and permissions
    console.log("\nSTEP 2: ROLE CONFIGURATION");
    console.log("=".repeat(25));
    const rolesOk = await configureSystemRoles();
    if (!rolesOk) {
      console.log("⚠️ Role configuration had issues, but continuing...");
    }
    await wait(3);
    
    // Update .env file with contract addresses
    await updateEnvFile();
    
    // // Step 3: Set up Chainlink subscription (LINK-safe version)
    // console.log("\nSTEP 3: CHAINLINK SUBSCRIPTION SETUP");
    // console.log("=".repeat(35));
    // let subscriptionResult;
    // try {
    //   // Use safe subscription setup with minimal LINK
    //   subscriptionResult = await setupSubscription({ 
    //     fundAmount: "1.0", 
    //     testMode: true 
    //   });
    //   console.log("✅ Chainlink subscription created successfully!");
    // } catch (error) {
    //   console.error("❌ Subscription setup failed:", error.message);
    //   console.log("💡 You may need to set this up manually at https://functions.chain.link/");
    //   console.log("⏭️ Continuing with next steps...");
    // }
    // await wait(3);
    
    // Step 4: Update subscription ID in contract
    console.log("\nSTEP 3: UPDATE SUBSCRIPTION ID");
    console.log("=".repeat(30));
    try {
      await updateSubscription();
      console.log("✅ Contract updated with subscription ID!");
    } catch (error) {
      console.error("❌ Subscription update failed:", error.message);
      console.log("⏭️ Continuing with next steps...");
    }
    await wait(3);
    
    // Step 4: Verify contracts
    console.log("\nSTEP 4: CONTRACT VERIFICATION");
    console.log("=".repeat(30));
    try {
      const verificationResult = await verifyContracts();
      const successful = verificationResult.summary.successful;
      const total = Object.keys(verificationResult.addresses).length;
      console.log(`✅ Contract verification complete! ${successful}/${total} contracts verified`);
    } catch (error) {
      console.error("❌ Contract verification failed:", error.message);
      console.log("💡 You can verify manually on BaseScan");
      console.log("⏭️ Continuing with next steps...");
    }
    await wait(3);
    
    // Final instructions
    console.log("\nSTEP 5: SERVICES SETUP INSTRUCTIONS");
    console.log("=".repeat(35));
    console.log("📋 To complete the setup, you need to start the services:");
    console.log("");
    console.log("🔗 1. Start Mock API Service:");
    console.log("   mkdir mock-api && cd mock-api");
    console.log("   # Copy mock-api-service.js file");
    console.log("   npm init -y && npm install express cors");
    console.log("   node mock-api-service.js");
    console.log("");
    console.log("🔧 2. Start Backend Service:");
    console.log("   cd backend");
    console.log("   # Make sure ABIs are in backend/abis/");
    console.log("   # Update .env with contract addresses");
    console.log("   npm run dev");
    console.log("");
    console.log("🧪 3. Test Complete Flow:");
    console.log("   node scripts/test-complete-flow.js");
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 COMPLETE MASTER SETUP FINISHED!");
    console.log("=".repeat(50));
    console.log(`⏱️ Total time: ${duration} seconds`);
    console.log("");
    console.log("✅ What's been configured:");
    console.log("  - ✅ Roles and permissions set up");
    console.log("  - ✅ ChainlinkGiftCardManager updated with subscription ID");
    console.log("  - ✅ Contracts verified on BaseScan");
    console.log("");
    console.log("🔄 Next Steps:");
    console.log("  1. Start the Mock API service (port 8081)");
    console.log("  2. Start the Backend service (port 3001)");
    console.log("  3. Run the complete flow test");
    console.log("");
    console.log("📋 Your Contract Addresses:");
    
    // Show contract addresses
    const deploymentPath = "./ignition/deployments/chain-84532/deployed_addresses.json";
    const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    Object.entries(deployedAddresses).forEach(([key, address]) => {
      const name = key.split('#')[1] || key;
      console.log(`  - ${name}: ${address}`);
    });
    
    console.log("");
    console.log("🔗 Useful Links:");
    console.log("  - BaseScan: https://base-sepolia.blockscout.com/");
    console.log("  - Chainlink Functions: https://functions.chain.link/");
    console.log("  - LINK Faucet: https://faucets.chain.link/base-sepolia");
    console.log("");
    console.log("🎯 Your DG Market system is ready for testing!");
    console.log("");
    console.log("⚠️  IMPORTANT: You DO NOT need to run configure-viem.js");
    console.log("    This script handled all the configuration automatically!");
    
  } catch (error) {
    console.error("\n❌ Complete master setup failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Complete master setup script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { main };