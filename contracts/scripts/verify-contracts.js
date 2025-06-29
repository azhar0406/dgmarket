// scripts/verify-contracts.js
// Automated contract verification on Etherscan

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Helper function to execute shell commands
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Helper function to get constructor arguments
function getConstructorArgs(contractName, deployedAddresses) {
  switch (contractName) {
    case 'ConfidentialGiftCard':
      return []; // No constructor arguments
      
    case 'PriceOracle':
      return []; // No constructor arguments
      
    case 'DGMarketCore':
      return [
        deployedAddresses.confidentialGiftCard,
        "250" // marketplaceFeePercent
      ];
      
    case 'ChainlinkGiftCardManager':
      return [
        deployedAddresses.dgMarketCore,
        deployedAddresses.confidentialGiftCard,
        process.env.CHAINLINK_FUNCTIONS_ROUTER || "0xf9B8fc078197181C841c296C876945aaa425B278",
        process.env.CHAINLINK_DON_ID || "0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000",
        process.env.CHAINLINK_SUBSCRIPTION_ID || "0"
      ];
      
    default:
      return [];
  }
}

async function main() {
  console.log("🔍 Starting automated contract verification...");
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

  // Get deployed contract addresses
  const deploymentPath = "./ignition/deployments/chain-84532/deployed_addresses.json";
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployed addresses not found. Deploy contracts first.");
    process.exit(1);
  }

  const deployedAddressesRaw = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  // Map addresses to simpler names
  const deployedAddresses = {
    confidentialGiftCard: deployedAddressesRaw["DGMarketCompleteModule#ConfidentialGiftCard"] || 
                          deployedAddressesRaw["DGMarketFreshModule#ConfidentialGiftCard"],
    priceOracle: deployedAddressesRaw["DGMarketCompleteModule#PriceOracle"] || 
                 deployedAddressesRaw["DGMarketFreshModule#PriceOracle"],
    dgMarketCore: deployedAddressesRaw["DGMarketCompleteModule#DGMarketCore"] || 
                  deployedAddressesRaw["DGMarketFreshModule#DGMarketCore"],
    chainlinkGiftCardManager: deployedAddressesRaw["DGMarketCompleteModule#ChainlinkGiftCardManager"] || 
                             deployedAddressesRaw["DGMarketFreshModule#ChainlinkGiftCardManager"]
  };

  console.log("\n📍 Contract Addresses:");
  Object.entries(deployedAddresses).forEach(([name, address]) => {
    console.log(`- ${name}: ${address}`);
  });

  // Contracts to verify in dependency order
  const contractsToVerify = [
    {
      name: 'ConfidentialGiftCard',
      address: deployedAddresses.confidentialGiftCard,
      contractPath: 'contracts/ConfidentialGiftCard.sol:ConfidentialGiftCard'
    },
    {
      name: 'PriceOracle', 
      address: deployedAddresses.priceOracle,
      contractPath: 'contracts/PriceOracle.sol:PriceOracle'
    },
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
      continue;
    }

    console.log(`\n🔄 Verifying ${contract.name}...`);
    console.log(`📍 Address: ${contract.address}`);

    try {
      // Get constructor arguments
      const constructorArgs = getConstructorArgs(contract.name, deployedAddresses);
      console.log(`📋 Constructor args: [${constructorArgs.join(', ')}]`);

      // Build verification command
      let verifyCommand = `npx hardhat verify --network baseSepolia ${contract.address}`;
      
      if (constructorArgs.length > 0) {
        verifyCommand += ` "${constructorArgs.join('" "')}"`;
      }

      console.log(`⚡ Running: ${verifyCommand}`);

      // Execute verification
      const result = await execCommand(verifyCommand);
      
      if (result.stdout.includes('Successfully verified') || 
          result.stdout.includes('Already Verified')) {
        console.log(`✅ ${contract.name} verified successfully!`);
        verificationResults.push({
          contract: contract.name,
          address: contract.address,
          status: 'success',
          message: 'Verified'
        });
      } else {
        console.log(`⚠️ ${contract.name} verification completed with warnings`);
        console.log('Output:', result.stdout);
        verificationResults.push({
          contract: contract.name,
          address: contract.address,
          status: 'warning',
          message: 'Completed with warnings'
        });
      }

    } catch (error) {
      console.error(`❌ Error verifying ${contract.name}:`);
      console.error('Error:', error.error?.message || error.stderr || error.stdout);
      
      // Check for common errors
      if (error.stderr?.includes('Already Verified') || error.stdout?.includes('Already Verified')) {
        console.log(`✅ ${contract.name} was already verified!`);
        verificationResults.push({
          contract: contract.name,
          address: contract.address,
          status: 'success',
          message: 'Already verified'
        });
      } else {
        verificationResults.push({
          contract: contract.name,
          address: contract.address,
          status: 'failed',
          message: error.error?.message || error.stderr || 'Verification failed'
        });
      }
    }

    // Wait between verifications to avoid rate limiting
    if (contract !== contractsToVerify[contractsToVerify.length - 1]) {
      console.log('⏳ Waiting 10 seconds before next verification...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 CONTRACT VERIFICATION COMPLETE!");
  console.log("=".repeat(50));
  
  const successful = verificationResults.filter(r => r.status === 'success').length;
  const failed = verificationResults.filter(r => r.status === 'failed').length;
  const warnings = verificationResults.filter(r => r.status === 'warning').length;

  console.log(`📊 Results: ${successful} ✅ | ${warnings} ⚠️ | ${failed} ❌`);
  console.log("");

  verificationResults.forEach(result => {
    const icon = result.status === 'success' ? '✅' : 
                 result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.contract}: ${result.message}`);
  });

  console.log("");
  console.log("🔗 View contracts on BaseScan:");
  Object.entries(deployedAddresses).forEach(([name, address]) => {
    if (address) {
      console.log(`- ${name}: https://base-sepolia.blockscout.com/address/${address}`);
    }
  });

  console.log("");
  console.log("🔄 Next Steps:");
  console.log("1. Set up mock API service");
  console.log("2. Set up backend service"); 
  console.log("3. Test the complete flow");
  console.log("");
  console.log("💡 Run next: node scripts/test-complete-flow.js");

  return {
    results: verificationResults,
    summary: { successful, failed, warnings },
    addresses: deployedAddresses
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { main };