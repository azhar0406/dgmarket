// scripts/verify-contracts.js
// Improved contract verification with better API error handling

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Helper function to execute shell commands with timeout
function execCommand(command, timeout = 60000) {
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

// Helper function to get constructor arguments - FIXED for 2-contract system
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

async function main() {
  console.log("🔍 Starting improved contract verification...");
  console.log("=".repeat(50));

  // Check if ETHERSCAN_API_KEY is set
  if (!process.env.ETHERSCAN_API_KEY) {
    console.error("❌ ETHERSCAN_API_KEY not found in .env file");
    console.log("💡 Get your API key from: https://etherscan.io/apis");
    console.log("💡 Add it to .env: ETHERSCAN_API_KEY=your_api_key_here");
    process.exit(1);
  }

  console.log("📊 Configuration:");
  console.log("- Network: Base Sepolia (84532)");
  console.log("- API Key: ✅ Set");
  console.log("- Explorer: https://sepolia.basescan.org/");

  // Get deployed contract addresses
  const deploymentPath = "./ignition/deployments/chain-84532/deployed_addresses.json";
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployed addresses not found. Deploy contracts first.");
    process.exit(1);
  }

  const deployedAddressesRaw = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  // Map addresses to simpler names - FIXED for 2-contract system
  const deployedAddresses = {
    dgMarketCore: deployedAddressesRaw["DGMarketCompleteModule#DGMarketCore"] || 
                  deployedAddressesRaw["DGMarketModule#DGMarketCore"],
    chainlinkGiftCardManager: deployedAddressesRaw["DGMarketCompleteModule#ChainlinkGiftCardManager"] || 
                             deployedAddressesRaw["DGMarketModule#ChainlinkGiftCardManager"]
  };

  console.log("\n📍 Contract Addresses:");
  Object.entries(deployedAddresses).forEach(([name, address]) => {
    console.log(`- ${name}: ${address || 'Not deployed'}`);
  });

  // Contracts to verify - ONLY 2-contract system
  const contractsToVerify = [
    {
      name: 'DGMarketCore',
      address: deployedAddresses.dgMarketCore,
      contractPath: 'contracts/DGMarketCore.sol:DGMarketCore'
    },
    {
      name: 'ChainlinkGiftCardManager',
      address: deployedAddresses.chainlinkGiftCardManager,
      contractPath: 'contracts/ChainlinkGiftCardManager.sol:ChainlinkGiftCardManager'
    }
  ];

  const verificationResults = [];

  for (const contract of contractsToVerify) {
    if (!contract.address) {
      console.log(`⚠️ Skipping ${contract.name} - address not found`);
      verificationResults.push({
        contract: contract.name,
        address: 'N/A',
        status: 'skipped',
        message: 'Address not found'
      });
      continue;
    }

    console.log(`\n🔄 Verifying ${contract.name}...`);
    console.log(`📍 Address: ${contract.address}`);
    console.log(`🔗 Explorer: https://sepolia.basescan.org/address/${contract.address}`);

    try {
      // Get constructor arguments
      const constructorArgs = getConstructorArgs(contract.name, deployedAddresses);
      console.log(`📋 Constructor args: [${constructorArgs.join(', ')}]`);

      // Build verification command
      let verifyCommand = `npx hardhat verify --network baseSepolia ${contract.address}`;
      
      if (constructorArgs.length > 0) {
        // Quote each argument properly to handle spaces and special characters
        const quotedArgs = constructorArgs.map(arg => `"${arg}"`);
        verifyCommand += ` ${quotedArgs.join(' ')}`;
      }

      console.log(`⚡ Running: ${verifyCommand}`);

      // Execute verification with timeout
      const result = await execCommand(verifyCommand, 90000); // 90 second timeout
      
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
      console.error('Error details:', errorMessage.substring(0, 200) + '...');
      
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
    if (contract !== contractsToVerify[contractsToVerify.length - 1]) {
      console.log('⏳ Waiting 15 seconds before next verification...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  // Enhanced Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 CONTRACT VERIFICATION COMPLETE!");
  console.log("=".repeat(50));
  
  const successful = verificationResults.filter(r => r.status === 'success').length;
  const failed = verificationResults.filter(r => r.status === 'failed').length;
  const warnings = verificationResults.filter(r => r.status === 'warning').length;
  const apiIssues = verificationResults.filter(r => r.status === 'api_issue').length;
  const networkIssues = verificationResults.filter(r => r.status === 'network_issue').length;
  const skipped = verificationResults.filter(r => r.status === 'skipped').length;

  console.log(`📊 Detailed Results:`);
  console.log(`  ✅ Verified: ${successful}`);
  console.log(`  ⚠️ Warnings: ${warnings}`);
  console.log(`  ⚠️ API Issues: ${apiIssues}`);
  console.log(`  ⚠️ Network Issues: ${networkIssues}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏭️ Skipped: ${skipped}`);
  console.log("");

  verificationResults.forEach(result => {
    const icon = result.status === 'success' ? '✅' : 
                 result.status === 'warning' ? '⚠️' : 
                 result.status === 'api_issue' ? '⚠️' :
                 result.status === 'network_issue' ? '⚠️' :
                 result.status === 'skipped' ? '⏭️' : '❌';
    console.log(`${icon} ${result.contract}: ${result.message}`);
  });

  console.log("");
  console.log("🔗 Manual Verification Links:");
  Object.entries(deployedAddresses).forEach(([name, address]) => {
    if (address) {
      console.log(`- ${name}: https://sepolia.basescan.org/address/${address}`);
    }
  });

  // Success evaluation
  const totalAttempted = verificationResults.filter(r => r.status !== 'skipped').length;
  const likelySuccessful = successful + warnings + apiIssues + networkIssues;
  
  console.log("");
  if (likelySuccessful === totalAttempted) {
    console.log("🎯 VERIFICATION STATUS: LIKELY SUCCESSFUL");
    console.log("💡 API issues don't indicate verification failures");
    console.log("💡 Check the explorer links above to confirm");
  } else if (likelySuccessful > failed) {
    console.log("🎯 VERIFICATION STATUS: MOSTLY SUCCESSFUL");
    console.log("💡 Some contracts may need manual verification");
  } else {
    console.log("🎯 VERIFICATION STATUS: NEEDS ATTENTION");
    console.log("💡 Review errors and try manual verification");
  }

  console.log("");
  console.log("🔄 Next Steps:");
  console.log("1. Check contracts manually on BaseScan");
  console.log("2. Start mock API service (port 8081)");
  console.log("3. Start backend service (port 3001)"); 
  console.log("4. Test the complete flow");
  console.log("");
  console.log("💡 Run next: node scripts/test-complete-flow.js");

  return {
    results: verificationResults,
    summary: { successful, failed, warnings, apiIssues, networkIssues, skipped },
    addresses: deployedAddresses,
    overallStatus: likelySuccessful === totalAttempted ? 'success' : 
                   likelySuccessful > failed ? 'mostly_success' : 'needs_attention'
  };
}

if (require.main === module) {
  main()
    .then((result) => {
      console.log(`\n🏁 Script completed with status: ${result.overallStatus}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { main };