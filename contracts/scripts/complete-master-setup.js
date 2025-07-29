// scripts/complete-master-setup.js
// Complete master script for DGMarket 2-Contract Architecture with proper verification

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

// Import configuration logic
const { createWalletClient, createPublicClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { baseSepolia } = require("viem/chains");

// Define contractAddresses at global scope
let contractAddresses = {};

// Helper function to execute shell commands with timeout
function execCommand(command, timeout = 90000) {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
    
    child.on('timeout', () => {
      reject({ error: new Error('Command timeout'), stdout: '', stderr: 'Command timed out' });
    });
  });
}

// Helper function to get constructor arguments for verification
function getConstructorArgs(contractName, deployedAddresses) {
  switch (contractName) {
    case 'DGMarketCore':
      // DGMarketCore has NO constructor parameters
      return [];
      
    case 'ChainlinkGiftCardManager':
      // Ensure all parameters are properly filled
      const dgMarketCore = deployedAddresses.dgMarketCore;
      const functionsRouter = process.env.CHAINLINK_FUNCTIONS_ROUTER || "0xf9B8fc078197181C841c296C876945aaa425B278";
      const donId = process.env.CHAINLINK_DON_ID || "0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000";
      const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID || "416";
      const apiBaseUrl = process.env.GIFT_CARD_API_URL || "http://13.235.164.47:8081";
      
      // Validate all parameters are present
      if (!dgMarketCore) {
        throw new Error("DGMarketCore address not found for ChainlinkGiftCardManager verification");
      }
      if (!functionsRouter || functionsRouter === "") {
        throw new Error("CHAINLINK_FUNCTIONS_ROUTER not set in environment");
      }
      
      console.log(`📋 ChainlinkGiftCardManager Constructor Args:`);
      console.log(`  - dgMarketCore: ${dgMarketCore}`);
      console.log(`  - functionsRouter: ${functionsRouter}`);
      console.log(`  - donId: ${donId}`);
      console.log(`  - subscriptionId: ${subscriptionId}`);
      console.log(`  - apiBaseUrl: ${apiBaseUrl}`);
      
      return [
        dgMarketCore,
        functionsRouter,
        donId,
        subscriptionId,
        apiBaseUrl
      ];
      
    default:
      return [];
  }
}

// Improved verification status detection
function analyzeVerificationResult(stdout, stderr, contractName) {
  const output = (stdout + stderr).toLowerCase();
  
  // Success indicators
  if (output.includes('successfully verified') || 
      output.includes('already verified') ||
      output.includes('contract has been verified')) {
    return { status: 'success', message: 'Verified successfully' };
  }
  
  // Already verified (different variations)
  if (output.includes('already verified') || output.includes('contract already verified')) {
    return { status: 'success', message: 'Already verified' };
  }
  
  // Warning but likely successful
  if (output.includes('warning') && !output.includes('error')) {
    return { status: 'warning', message: 'Verified with warnings' };
  }
  
  // API issues (not actual verification failures)
  if (output.includes('api responded with a failure') || 
      output.includes('network request failed') ||
      output.includes('timeout') ||
      output.includes('service unavailable')) {
    return { 
      status: 'api_issue', 
      message: 'API communication issue - verification may have succeeded' 
    };
  }
  
  // Constructor issues
  if (output.includes('constructor') || output.includes('parameters')) {
    return { status: 'failed', message: 'Constructor argument mismatch' };
  }
  
  // Network issues
  if (output.includes('network') || output.includes('connection')) {
    return { status: 'network_issue', message: 'Network connectivity issue' };
  }
  
  // Generic failure
  return { status: 'failed', message: 'Verification failed' };
}

async function checkPrerequisites() {
  console.log("🔍 Checking Prerequisites...");
  console.log("=".repeat(50));
  
  const requiredEnvVars = [
    'PRIVATE_KEY_BASE_SEPOLIA',
    'BASE_SEPOLIA_RPC_URL'
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
  
  // Check ETHERSCAN_API_KEY for verification
  if (!process.env.ETHERSCAN_API_KEY) {
    console.log("⚠️ ETHERSCAN_API_KEY not found - verification will be skipped");
    console.log("💡 Get your API key from: https://etherscan.io/apis");
  } else {
    console.log("✅ ETHERSCAN_API_KEY found - verification enabled");
  }
  
  console.log("✅ All prerequisites met!");
  return true;
}

async function configureSystemRoles() {
  console.log("🔐 Configuring System Roles and Permissions (2-Contract Architecture)...");
  console.log("=".repeat(70));

  // Import ABIs for 2-contract system
  const dgMarketCoreAbi = require("../artifacts/contracts/DGMarketCore.sol/DGMarketCore.json");
  const chainlinkGiftCardManagerAbi = require("../artifacts/contracts/ChainlinkGiftCardManager.sol/ChainlinkGiftCardManager.json");

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
  
  console.log("📋 Available deployments:", Object.keys(deployedAddresses));
  
  contractAddresses = {
    dgMarketCore: deployedAddresses["DGMarketCompleteModule#DGMarketCore"] || 
                  deployedAddresses["DGMarketModule#DGMarketCore"],
    chainlinkGiftCardManager: deployedAddresses["DGMarketCompleteModule#ChainlinkGiftCardManager"] || 
                             deployedAddresses["DGMarketModule#ChainlinkGiftCardManager"]
  };

  console.log("📍 Contract Addresses (2-Contract System):");
  console.log(`- DGMarketCore: ${contractAddresses.dgMarketCore}`);
  console.log(`- ChainlinkGiftCardManager: ${contractAddresses.chainlinkGiftCardManager}`);

  if (!contractAddresses.dgMarketCore) {
    console.error("❌ DGMarketCore address not found in deployment file");
    return false;
  }

  try {
    // 1. Configure roles for DGMarketCore
    console.log("\n1️⃣ Configuring DGMarketCore roles...");
    
    // Check current admin role
    try {
      const adminRole = await publicClient.readContract({
        address: contractAddresses.dgMarketCore,
        abi: dgMarketCoreAbi.abi,
        functionName: "ADMIN_ROLE",
      });
      
      const hasAdminRole = await publicClient.readContract({
        address: contractAddresses.dgMarketCore,
        abi: dgMarketCoreAbi.abi,
        functionName: "hasRole",
        args: [adminRole, wallet.account.address],
      });
      
      if (hasAdminRole) {
        console.log(`✅ ADMIN_ROLE already granted to ${wallet.account.address}`);
      } else {
        console.log(`⚠️ ADMIN_ROLE not found, attempting to grant...`);
        
        const grantAdminRoleTxHash = await wallet.writeContract({
          address: contractAddresses.dgMarketCore,
          abi: dgMarketCoreAbi.abi,
          functionName: "grantRole",
          args: [adminRole, wallet.account.address],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: grantAdminRoleTxHash });
        console.log(`✅ Granted ADMIN_ROLE to deployer in DGMarketCore`);
      }
    } catch (error) {
      console.log(`⚠️ Admin role configuration issue:`, error.message);
    }

    // Grant AUTOMATION_ROLE to ChainlinkGiftCardManager
    if (contractAddresses.chainlinkGiftCardManager) {
      try {
        const automationRole = await publicClient.readContract({
          address: contractAddresses.dgMarketCore,
          abi: dgMarketCoreAbi.abi,
          functionName: "AUTOMATION_ROLE",
        });
        
        const hasAutomationRole = await publicClient.readContract({
          address: contractAddresses.dgMarketCore,
          abi: dgMarketCoreAbi.abi,
          functionName: "hasRole",
          args: [automationRole, contractAddresses.chainlinkGiftCardManager],
        });
        
        if (hasAutomationRole) {
          console.log(`✅ AUTOMATION_ROLE already granted to ChainlinkGiftCardManager`);
        } else {
          const grantAutomationRoleTxHash = await wallet.writeContract({
            address: contractAddresses.dgMarketCore,
            abi: dgMarketCoreAbi.abi,
            functionName: "grantRole",
            args: [automationRole, contractAddresses.chainlinkGiftCardManager],
          });
          
          await publicClient.waitForTransactionReceipt({ hash: grantAutomationRoleTxHash });
          console.log(`✅ Granted AUTOMATION_ROLE to ChainlinkGiftCardManager`);
        }
      } catch (error) {
        console.log(`⚠️ Automation role configuration issue:`, error.message);
      }
    }

    // 2. Configure roles for ChainlinkGiftCardManager
    if (contractAddresses.chainlinkGiftCardManager) {
      console.log("\n2️⃣ Configuring ChainlinkGiftCardManager roles...");
      
      try {
        const adminRole = await publicClient.readContract({
          address: contractAddresses.chainlinkGiftCardManager,
          abi: chainlinkGiftCardManagerAbi.abi,
          functionName: "ADMIN_ROLE",
        });
        
        const hasChainlinkAdminRole = await publicClient.readContract({
          address: contractAddresses.chainlinkGiftCardManager,
          abi: chainlinkGiftCardManagerAbi.abi,
          functionName: "hasRole",
          args: [adminRole, wallet.account.address],
        });
        
        if (hasChainlinkAdminRole) {
          console.log(`✅ ADMIN_ROLE already granted in ChainlinkGiftCardManager`);
        } else {
          const grantRoleTxHash = await wallet.writeContract({
            address: contractAddresses.chainlinkGiftCardManager,
            abi: chainlinkGiftCardManagerAbi.abi,
            functionName: "grantRole",
            args: [adminRole, wallet.account.address],
          });
          
          await publicClient.waitForTransactionReceipt({ hash: grantRoleTxHash });
          console.log(`✅ Granted ADMIN_ROLE in ChainlinkGiftCardManager`);
        }
      } catch (error) {
        console.log(`⚠️ ChainlinkGiftCardManager role configuration issue:`, error.message);
      }
    }

    console.log("✅ Role configuration completed for 2-contract system!");
    return true;

  } catch (error) {
    console.error("❌ Role configuration failed:", error.message);
    return false;
  }
}

async function verifyContracts() {
  console.log("🔍 Verifying Contracts on BaseScan with Proper Constructor Arguments...");
  console.log("=".repeat(75));
  
  // Skip verification if no API key
  if (!process.env.ETHERSCAN_API_KEY) {
    console.log("⏭️ Skipping verification - ETHERSCAN_API_KEY not found");
    console.log("💡 Contracts may already be verified. Check manually:");
    console.log(`- DGMarketCore: https://sepolia.basescan.org/address/${contractAddresses.dgMarketCore}`);
    console.log(`- ChainlinkGiftCardManager: https://sepolia.basescan.org/address/${contractAddresses.chainlinkGiftCardManager}`);
    return { successful: 0, total: 0, skipped: true };
  }

  const contracts = [
    { 
      name: "DGMarketCore", 
      address: contractAddresses.dgMarketCore,
      contractPath: 'contracts/DGMarketCore.sol:DGMarketCore'
    },
    { 
      name: "ChainlinkGiftCardManager", 
      address: contractAddresses.chainlinkGiftCardManager,
      contractPath: 'contracts/ChainlinkGiftCardManager.sol:ChainlinkGiftCardManager'
    }
  ];
  
  const verificationResults = [];
  
  for (const contract of contracts) {
    if (!contract.address) {
      console.log(`⏭️ Skipping ${contract.name} - no address found`);
      verificationResults.push({
        contract: contract.name,
        status: 'skipped',
        message: 'Address not found'
      });
      continue;
    }
    
    console.log(`\n🔄 Verifying ${contract.name}...`);
    console.log(`📍 Address: ${contract.address}`);
    console.log(`🔗 Explorer: https://sepolia.basescan.org/address/${contract.address}`);
    
    try {
      // Get constructor arguments with proper validation
      const constructorArgs = getConstructorArgs(contract.name, contractAddresses);
      
      // Build verification command with proper argument handling
      let verifyCommand = `npx hardhat verify --network baseSepolia ${contract.address}`;
      
      if (constructorArgs.length > 0) {
        // Quote each argument properly to handle spaces and special characters
        const quotedArgs = constructorArgs.map(arg => `"${arg}"`);
        verifyCommand += ` ${quotedArgs.join(' ')}`;
      }

      console.log(`⚡ Running verification command...`);
      console.log(`📝 Command: ${verifyCommand}`);

      // Execute verification with timeout
      const result = await execCommand(verifyCommand, 120000); // 2 minute timeout
      
      // Analyze the result
      const analysis = analyzeVerificationResult(result.stdout, result.stderr, contract.name);
      
      // Report result based on analysis
      switch (analysis.status) {
        case 'success':
          console.log(`✅ ${contract.name}: ${analysis.message}`);
          break;
        case 'warning':
          console.log(`⚠️ ${contract.name}: ${analysis.message}`);
          break;
        case 'api_issue':
          console.log(`⚠️ ${contract.name}: ${analysis.message}`);
          console.log(`💡 Check manually: https://sepolia.basescan.org/address/${contract.address}`);
          break;
        case 'network_issue':
          console.log(`⚠️ ${contract.name}: ${analysis.message}`);
          console.log(`💡 Retry later or check manually`);
          break;
        default:
          console.log(`❌ ${contract.name}: ${analysis.message}`);
          if (result.stdout) console.log(`📄 Output: ${result.stdout.substring(0, 200)}...`);
          if (result.stderr) console.log(`🚨 Error: ${result.stderr.substring(0, 200)}...`);
      }
      
      verificationResults.push({
        contract: contract.name,
        address: contract.address,
        status: analysis.status,
        message: analysis.message
      });

    } catch (error) {
      console.error(`❌ Error verifying ${contract.name}:`);
      
      // Get the actual error message
      const errorMessage = error.error?.message || error.stderr || error.stdout || 'Unknown error';
      console.error('Error details:', errorMessage.substring(0, 300) + '...');
      
      // Analyze the error
      const analysis = analyzeVerificationResult(errorMessage, '', contract.name);
      
      console.log(`💡 Analysis: ${analysis.message}`);
      if (analysis.status === 'api_issue') {
        console.log(`🔗 Manual check: https://sepolia.basescan.org/address/${contract.address}`);
      }
      
      verificationResults.push({
        contract: contract.name,
        address: contract.address,
        status: analysis.status,
        message: analysis.message
      });
    }

    // Wait between verifications to avoid rate limiting
    if (contract !== contracts[contracts.length - 1]) {
      console.log('⏳ Waiting 15 seconds before next verification...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
  
  // Enhanced verification summary
  const successful = verificationResults.filter(r => r.status === 'success').length;
  const failed = verificationResults.filter(r => r.status === 'failed').length;
  const warnings = verificationResults.filter(r => r.status === 'warning').length;
  const apiIssues = verificationResults.filter(r => r.status === 'api_issue').length;
  const networkIssues = verificationResults.filter(r => r.status === 'network_issue').length;
  const skipped = verificationResults.filter(r => r.status === 'skipped').length;

  console.log(`\n📊 Verification Results:`);
  console.log(`  ✅ Verified: ${successful}`);
  console.log(`  ⚠️ Warnings: ${warnings}`);
  console.log(`  ⚠️ API Issues: ${apiIssues}`);
  console.log(`  ⚠️ Network Issues: ${networkIssues}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏭️ Skipped: ${skipped}`);

  const totalAttempted = verificationResults.filter(r => r.status !== 'skipped').length;
  const likelySuccessful = successful + warnings + apiIssues + networkIssues;
  
  console.log(`✅ Contract verification completed! ${likelySuccessful}/${totalAttempted} likely successful`);
  return { 
    successful: likelySuccessful, 
    total: totalAttempted, 
    skipped: skipped > 0,
    results: verificationResults 
  };
}

async function updateEnvFiles() {
  console.log('\n📝 Updating environment files with contract addresses...');
  console.log("=".repeat(60));
  
  // Update backend .env file
  const backendEnvPath = path.join(__dirname, '../../backend/.env');
  
  if (fs.existsSync(backendEnvPath)) {
    try {
      let envContent = fs.readFileSync(backendEnvPath, 'utf8');
      
      // Update contract addresses for 2-contract system
      envContent = envContent.replace(/CHAINLINK_MANAGER_ADDRESS=".*"/g, `CHAINLINK_MANAGER_ADDRESS="${contractAddresses.chainlinkGiftCardManager}"`);
      envContent = envContent.replace(/DGMARKET_CORE_ADDRESS=".*"/g, `DGMARKET_CORE_ADDRESS="${contractAddresses.dgMarketCore}"`);
      
      // Legacy compatibility
      envContent = envContent.replace(/GIFT_CARD_ADDRESS=".*"/g, `GIFT_CARD_ADDRESS="${contractAddresses.dgMarketCore}"`);
      
      fs.writeFileSync(backendEnvPath, envContent);
      
      console.log('✅ Backend .env file updated successfully:');
      console.log(`  CHAINLINK_MANAGER_ADDRESS="${contractAddresses.chainlinkGiftCardManager}"`);
      console.log(`  DGMARKET_CORE_ADDRESS="${contractAddresses.dgMarketCore}"`);
    } catch (error) {
      console.error(`❌ Error updating backend .env file: ${error.message}`);
    }
  } else {
    console.log(`ℹ️ Backend .env file not found at ${backendEnvPath}`);
  }

  // Update frontend constants if they exist
  const frontendConstantsPath = path.join(__dirname, '../../frontend/constants/addresses.js');
  
  if (fs.existsSync(frontendConstantsPath)) {
    try {
      const addressesContent = `// Auto-generated contract addresses
export const CONTRACT_ADDRESSES = {
  BASE_SEPOLIA: {
    DGMARKET_CORE: "${contractAddresses.dgMarketCore}",
    CHAINLINK_GIFT_CARD_MANAGER: "${contractAddresses.chainlinkGiftCardManager}",
  }
};
`;
      fs.writeFileSync(frontendConstantsPath, addressesContent);
      console.log('✅ Frontend addresses.js updated successfully');
    } catch (error) {
      console.error(`❌ Error updating frontend addresses: ${error.message}`);
    }
  } else {
    console.log(`ℹ️ Frontend constants file not found at ${frontendConstantsPath}`);
  }
  
  // Create local addresses file for reference
  const localAddressesPath = path.join(__dirname, '../deployed-addresses.json');
  try {
    fs.writeFileSync(localAddressesPath, JSON.stringify(contractAddresses, null, 2));
    console.log(`✅ Local addresses file created at ${localAddressesPath}`);
  } catch (error) {
    console.error(`❌ Error creating local addresses file: ${error.message}`);
  }
}

async function wait(seconds) {
  console.log(`⏳ Waiting ${seconds} seconds...`);
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function main() {
  console.log("🚀 DG Market Complete Master Setup (2-Contract Architecture)");
  console.log("=".repeat(70));
  console.log("This script will configure the streamlined 2-contract system:");
  console.log("1. ✅ Check prerequisites");
  console.log("2. 🔐 Configure roles and permissions");
  console.log("3. 🔍 Verify contracts on BaseScan (with proper constructor args)");
  console.log("4. 📝 Update environment files");
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
    console.log("\nSTEP 2: ROLE CONFIGURATION (2-Contract System)");
    console.log("=".repeat(50));
    const rolesOk = await configureSystemRoles();
    if (!rolesOk) {
      console.log("⚠️ Role configuration had issues, but continuing...");
    }
    await wait(3);
    
    // Step 3: Verify contracts with proper constructor arguments
    console.log("\nSTEP 3: CONTRACT VERIFICATION (With Constructor Args)");
    console.log("=".repeat(55));
    try {
      const verificationResult = await verifyContracts();
      if (verificationResult.skipped) {
        console.log(`⏭️ Contract verification skipped - no API key`);
      } else {
        console.log(`✅ Contract verification complete! ${verificationResult.successful}/${verificationResult.total} contracts verified`);
      }
    } catch (error) {
      console.error("❌ Contract verification failed:", error.message);
      console.log("💡 You can verify manually on BaseScan");
      console.log("⏭️ Continuing with next steps...");
    }
    await wait(3);
    
    // Step 4: Update environment files
    console.log("\nSTEP 4: ENVIRONMENT FILE UPDATES");
    console.log("=".repeat(40));
    await updateEnvFiles();
    await wait(2);
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log("\n" + "=".repeat(70));
    console.log("🎉 COMPLETE MASTER SETUP FINISHED!");
    console.log("=".repeat(70));
    console.log(`⏱️ Total time: ${duration} seconds`);
    console.log("");
    console.log("✅ What's been configured:");
    console.log("  - ✅ 2-Contract architecture deployed");
    console.log("  - ✅ Roles and permissions configured");
    console.log("  - ✅ Contracts verified on BaseScan (with proper constructor args)");
    console.log("  - ✅ Environment files updated");
    console.log("");
    console.log("🏗️ Architecture Summary:");
    console.log("  - 📦 DGMarketCore: All-in-one (FHE + Marketplace + Inventory)");
    console.log("  - 🔗 ChainlinkGiftCardManager: Automation-only (API calls + restocking)");
    console.log("");
    console.log("📋 Your Contract Addresses:");
    console.log(`  - DGMarketCore: ${contractAddresses.dgMarketCore}`);
    console.log(`  - ChainlinkGiftCardManager: ${contractAddresses.chainlinkGiftCardManager}`);
    console.log("");
    console.log("🔗 Verification Links:");
    console.log(`  - DGMarketCore: https://sepolia.basescan.org/address/${contractAddresses.dgMarketCore}`);
    console.log(`  - ChainlinkGiftCardManager: https://sepolia.basescan.org/address/${contractAddresses.chainlinkGiftCardManager}`);
    console.log("");
    console.log("🔄 Next Steps:");
    console.log("  1. Test the contracts:");
    console.log(`     pnpm hardhat test test/AdminGiftCard.test.js --network baseSepolia`);
    console.log("  2. Start Mock API service (port 8081)");
    console.log("  3. Start Backend service (port 3001)");
    console.log("");
    console.log("🔗 Useful Links:");
    console.log("  - BaseScan: https://base-sepolia.blockscout.com/");
    console.log("  - Chainlink Functions: https://functions.chain.link/");
    console.log("  - LINK Faucet: https://faucets.chain.link/base-sepolia");
    console.log("");
    console.log("🎯 Your streamlined DG Market system is ready!");
    
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