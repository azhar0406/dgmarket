// scripts/update-subscription-id.js
// Update ChainlinkGiftCardManager with new subscription ID

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import ABI
const chainlinkGiftCardManagerAbi = require("../artifacts/contracts/ChainlinkGiftCardManager.sol/ChainlinkGiftCardManager.json");

async function main() {
  console.log("🔄 Updating ChainlinkGiftCardManager subscription ID...");
  console.log("=".repeat(50));

  // Setup provider and wallet - compatible with both ethers v5 and v6
  let provider, wallet;
  
  try {
    // Try ethers v6 first
    provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY_BASE_SEPOLIA, provider);
  } catch (error) {
    // Fall back to ethers v5
    provider = new ethers.providers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY_BASE_SEPOLIA, provider);
  }

  // Add formatEther and parseEther compatibility
  const formatEther = ethers.utils ? ethers.utils.formatEther : ethers.formatEther;
  const parseEther = ethers.utils ? ethers.utils.parseEther : ethers.parseEther;

  // Get subscription ID from environment
  const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID;
  if (!subscriptionId || subscriptionId === "0") {
    console.error("❌ CHAINLINK_SUBSCRIPTION_ID not found in .env file");
    console.log("💡 Run: node scripts/simple-subscription-setup.js first");
    process.exit(1);
  }

  console.log("📊 Configuration:");
  console.log("- Wallet Address:", wallet.address);
  console.log("- Subscription ID:", subscriptionId);

  // Get deployed contract address
  const deploymentPath = "./ignition/deployments/chain-84532/deployed_addresses.json";
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployed addresses not found. Deploy contracts first.");
    process.exit(1);
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const chainlinkManagerAddress = deployedAddresses["DGMarketCompleteModule#ChainlinkGiftCardManager"] || deployedAddresses["DGMarketFreshModule#ChainlinkGiftCardManager"];

  if (!chainlinkManagerAddress) {
    console.error("❌ ChainlinkGiftCardManager address not found in deployment.");
    process.exit(1);
  }

  console.log("📍 ChainlinkGiftCardManager:", chainlinkManagerAddress);

  try {
    // Initialize contract
    const chainlinkManager = new ethers.Contract(
      chainlinkManagerAddress, 
      chainlinkGiftCardManagerAbi.abi, 
      wallet
    );

    // Update subscription ID
    console.log("\n🔄 Updating subscription ID in contract...");
    const updateTx = await chainlinkManager.updateChainlinkConfig(
      process.env.CHAINLINK_DON_ID || "0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000000",
      subscriptionId,
      300000 // gas limit
    );

    console.log("⏳ Transaction submitted:", updateTx.hash);
    const receipt = await updateTx.wait();
    console.log("✅ Subscription ID updated successfully!");
    console.log("📊 Block Number:", receipt.blockNumber);
    console.log("⛽ Gas Used:", receipt.gasUsed.toString());

    // Verify the update
    console.log("\n🔍 Verifying update...");
    
    // Note: We can't directly read private variables, but we can check events
    if (receipt.logs && receipt.logs.length > 0) {
      try {
        const updateEvent = receipt.logs.find(log => {
          try {
            const parsed = chainlinkManager.interface.parseLog(log);
            return parsed.name === 'ChainlinkFunctionUpdated';
          } catch {
            return false;
          }
        });
        
        if (updateEvent) {
          const parsed = chainlinkManager.interface.parseLog(updateEvent);
          console.log("✅ Configuration updated successfully:");
          console.log("- DON ID:", parsed.args.donId);
          console.log("- Subscription ID:", parsed.args.subscriptionId.toString());
          console.log("- Gas Limit:", parsed.args.gasLimit.toString());
        }
      } catch (error) {
        console.log("⚠️ Could not parse update event, but transaction succeeded");
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 SUBSCRIPTION ID UPDATE COMPLETE!");
    console.log("=".repeat(50));
    console.log("✅ ChainlinkGiftCardManager is now configured with:");
    console.log("- Subscription ID:", subscriptionId);
    console.log("- Contract Address:", chainlinkManagerAddress);
    console.log("- Transaction Hash:", updateTx.hash);
    console.log("");
    console.log("🔄 Next Steps:");
    console.log("1. Verify contracts on Etherscan");
    console.log("2. Test the complete flow");
    console.log("");
    console.log("💡 Run next: node scripts/verify-contracts.js");

    return {
      success: true,
      subscriptionId,
      contractAddress: chainlinkManagerAddress,
      txHash: updateTx.hash
    };

  } catch (error) {
    console.error("❌ Error updating subscription ID:", error.message);
    
    // Check if it's a permissions error
    if (error.message.includes("AccessControl")) {
      console.log("💡 Make sure your wallet has ADMIN_ROLE in the contract");
    }
    
    console.error("Full error:", error);
    process.exit(1);
  }
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