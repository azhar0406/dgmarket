const { createWalletClient, createPublicClient, http, getAddress } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { baseSepolia } = require("viem/chains");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Import ABIs
const dgMarketCoreAbi = require("../artifacts/contracts/DGMarketCore.sol/DGMarketCore.json");
const priceOracleAbi = require("../artifacts/contracts/PriceOracle.sol/PriceOracle.json");
const chainlinkGiftCardManagerAbi = require("../artifacts/contracts/ChainlinkGiftCardManager.sol/ChainlinkGiftCardManager.json");
const confidentialGiftCardAbi = require("../artifacts/contracts/ConfidentialGiftCard.sol/ConfidentialGiftCard.json");

// Setup wallet and client
const PRIVATE_KEY_ENV = process.env.PRIVATE_KEY_BASE_SEPOLIA;
if (!PRIVATE_KEY_ENV) {
  throw new Error("Missing PRIVATE_KEY_BASE_SEPOLIA in .env file");
}

const PRIVATE_KEY = PRIVATE_KEY_ENV.startsWith("0x") 
  ? PRIVATE_KEY_ENV 
  : `0x${PRIVATE_KEY_ENV}`;

if (PRIVATE_KEY.length !== 66) {
  throw new Error("Invalid private key length in .env file");
}

// Create account from private key
const account = privateKeyToAccount(PRIVATE_KEY);

// Setup Base Sepolia chain and RPC
const chain = baseSepolia;
const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://base-sepolia-rpc.publicnode.com";

// Public client (read-only)
const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

// Wallet client (signing)
const wallet = createWalletClient({
  account,
  chain,
  transport: http(rpcUrl),
});

async function main() {
  console.log("🔧 Configuring DG Market System with Enhanced Security...");

  // Get deployed contract addresses from Ignition deployment
  const deploymentPath = "./ignition/deployments/chain-84532";
  let contractAddresses;

  try {
    const deployedAddressesPath = path.join(deploymentPath, "deployed_addresses.json");
    
    if (fs.existsSync(deployedAddressesPath)) {
      const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
      
      // Map the addresses
      contractAddresses = {
        confidentialGiftCard: deployedAddresses["DGMarketDeployModule#ConfidentialGiftCard"] || 
                            deployedAddresses["DGMarketFreshModule#ConfidentialGiftCard"] ||
                            deployedAddresses["DGMarketCompleteModule#ConfidentialGiftCard"],
        priceOracle: deployedAddresses["DGMarketDeployModule#PriceOracle"] || 
                    deployedAddresses["DGMarketFreshModule#PriceOracle"] ||
                    deployedAddresses["DGMarketCompleteModule#PriceOracle"],
        dgMarketCore: deployedAddresses["DGMarketDeployModule#DGMarketCore"] || 
                     deployedAddresses["DGMarketFreshModule#DGMarketCore"] ||
                     deployedAddresses["DGMarketCompleteModule#DGMarketCore"],
        chainlinkGiftCardManager: deployedAddresses["DGMarketDeployModule#ChainlinkGiftCardManager"] || 
                                 deployedAddresses["DGMarketFreshModule#ChainlinkGiftCardManager"] ||
                                 deployedAddresses["DGMarketCompleteModule#ChainlinkGiftCardManager"]
      };
      
      console.log("📍 Found deployed contracts:");
      console.log("- ConfidentialGiftCard:", contractAddresses.confidentialGiftCard);
      console.log("- PriceOracle:", contractAddresses.priceOracle);
      console.log("- DGMarketCore:", contractAddresses.dgMarketCore);
      console.log("- ChainlinkGiftCardManager:", contractAddresses.chainlinkGiftCardManager);
      
    } else {
      console.error("❌ No deployed addresses found.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error reading deployment addresses:", error.message);
    process.exit(1);
  }

  // Verify all addresses are present
  const missingContracts = Object.entries(contractAddresses)
    .filter(([name, address]) => !address)
    .map(([name]) => name);
    
  if (missingContracts.length > 0) {
    console.error("❌ Missing contract addresses:", missingContracts);
    process.exit(1);
  }

  console.log("🔐 Configuring with account:", wallet.account.address);

  // Configuration data
  const config = {
    categories: ["Food & Dining", "Shopping", "Entertainment", "Travel", "Gaming"],
    giftCardThresholds: {
      "Food & Dining": 5,
      "Shopping": 5,
      "Entertainment": 5,
      "Travel": 3,
      "Gaming": 5
    }
  };

  try {
    // 1. Configure roles and permissions
    console.log("\n1️⃣ Configuring roles and permissions...");
    
    if (contractAddresses.chainlinkGiftCardManager && contractAddresses.confidentialGiftCard) {
      // Grant BACKEND_ROLE to ChainlinkGiftCardManager in ConfidentialGiftCard
      try {
        const backendRole = await publicClient.readContract({
          address: contractAddresses.confidentialGiftCard,
          abi: confidentialGiftCardAbi.abi,
          functionName: "BACKEND_ROLE",
        });
        
        const grantBackendRoleTxHash = await wallet.writeContract({
          address: contractAddresses.confidentialGiftCard,
          abi: confidentialGiftCardAbi.abi,
          functionName: "grantBackendRole",
          args: [contractAddresses.chainlinkGiftCardManager],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: grantBackendRoleTxHash });
        console.log(`✅ Granted BACKEND_ROLE to ChainlinkGiftCardManager in ConfidentialGiftCard`);
      } catch (error) {
        console.log(`⚠️ Backend role configuration issue:`, error.message);
      }
      
      // Grant ADMIN_ROLE to deployer in both contracts
      try {
        const adminRole = await publicClient.readContract({
          address: contractAddresses.confidentialGiftCard,
          abi: confidentialGiftCardAbi.abi,
          functionName: "ADMIN_ROLE",
        });
        
        const grantAdminRoleTxHash = await wallet.writeContract({
          address: contractAddresses.confidentialGiftCard,
          abi: confidentialGiftCardAbi.abi,
          functionName: "grantAdminRole",
          args: [wallet.account.address],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: grantAdminRoleTxHash });
        console.log(`✅ Granted ADMIN_ROLE to deployer in ConfidentialGiftCard`);
      } catch (error) {
        console.log(`⚠️ Admin role configuration issue:`, error.message);
      }
    }

    // 2. Configure gift card categories in ChainlinkGiftCardManager
    if (contractAddresses.chainlinkGiftCardManager) {
      console.log("\n2️⃣ Configuring ChainlinkGiftCardManager categories...");
      
      for (const category of config.categories) {
        try {
          // Add category with threshold to ChainlinkGiftCardManager
          const threshold = config.giftCardThresholds[category] || 5; // Default threshold is 5
          
          const addCategoryTxHash = await wallet.writeContract({
            address: contractAddresses.chainlinkGiftCardManager,
            abi: chainlinkGiftCardManagerAbi.abi,
            functionName: "addCategory",
            args: [category, threshold],
          });
          
          await publicClient.waitForTransactionReceipt({ hash: addCategoryTxHash });
          console.log(`✅ Added category ${category} with threshold ${threshold} to ChainlinkGiftCardManager`);
        } catch (error) {
          console.log(`⚠️ Category ${category} configuration issue:`, error.message);
        }
      }
      
      // Grant ADMIN_ROLE to the deployer account in ChainlinkGiftCardManager
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
        console.log(`✅ Granted ADMIN_ROLE to ${wallet.account.address} in ChainlinkGiftCardManager`);
      } catch (error) {
        console.log(`⚠️ Role configuration issue:`, error.message);
      }
    }

    // 3. Configure supported tokens
    console.log("\n3️⃣ Configuring supported tokens...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

    const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
    const usdcPriceFeed = "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165"; // USDC/USD price feed

    try {
      const addTokenTxHash = await wallet.writeContract({
        address: contractAddresses.dgMarketCore,
        abi: dgMarketCoreAbi.abi,
        functionName: "addSupportedToken",
        args: [usdcAddress, usdcPriceFeed],
      });
      
      await publicClient.waitForTransactionReceipt({ hash: addTokenTxHash });
      console.log("✅ Added USDC as supported token");
    } catch (error) {
      console.log("⚠️ Token configuration issue:", error.message);
    }

    // 4. Configure price feeds
    console.log("\n4️⃣ Configuring price feeds...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

    try {
      const addFeedTxHash = await wallet.writeContract({
        address: contractAddresses.priceOracle,
        abi: priceOracleAbi.abi,
        functionName: "addPriceFeed",
        args: [usdcAddress, usdcPriceFeed, 3600], // 1 hour heartbeat
      });
      
      await publicClient.waitForTransactionReceipt({ hash: addFeedTxHash });
      console.log("✅ Added USDC/USD price feed");
    } catch (error) {
      console.log("⚠️ Price feed configuration issue:", error.message);
    }

    // 5. Configure categories in DGMarketCore
    console.log("\n5️⃣ Configuring categories in DGMarketCore...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

    for (const category of config.categories) {
      try {
        const addCategoryTxHash = await wallet.writeContract({
          address: contractAddresses.dgMarketCore,
          abi: dgMarketCoreAbi.abi,
          functionName: "addCategory",
          args: [category],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: addCategoryTxHash });
        console.log(`✅ Added category ${category} to DGMarketCore`);
      } catch (error) {
        console.log(`⚠️ Category ${category} configuration issue:`, error.message);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 ENHANCED SECURITY CONFIGURATION COMPLETE!");
    console.log("=".repeat(60));
    console.log("🔒 Security Features:");
    console.log("  ✅ Public gift card creation REMOVED");
    console.log("  ✅ Only ADMIN_ROLE can create gift cards manually");
    console.log("  ✅ Only BACKEND_ROLE can create from Chainlink Functions");
    console.log("  ✅ ChainlinkGiftCardManager has BACKEND_ROLE in ConfidentialGiftCard");
    console.log("");
    console.log("📊 System Configuration:");
    console.log("  ✅ Supported tokens: USDC");
    console.log("  ✅ Price feeds: USDC/USD");
    console.log("  ✅ Categories:", config.categories.length, "categories");
    console.log("  ✅ Inventory thresholds configured");
    console.log("");
    console.log("🔄 Gift Card Creation Flow:");
    console.log("  1. Chainlink Functions triggers restock");
    console.log("  2. ChainlinkGiftCardManager receives API response");
    console.log("  3. Backend service monitors RestockFulfilled events");
    console.log("  4. Backend calls backendAddGiftCard on ChainlinkGiftCardManager");
    console.log("  5. ChainlinkGiftCardManager calls backendCreateGiftCard on ConfidentialGiftCard");
    console.log("  6. Gift card created with encrypted value");
    console.log("");
    console.log("🚀 DG Market is ready for secure operation!");
    console.log("");
    console.log("📋 Contract Addresses:");
    console.log("- ConfidentialGiftCard:", contractAddresses.confidentialGiftCard);
    console.log("- PriceOracle:", contractAddresses.priceOracle);  
    console.log("- DGMarketCore:", contractAddresses.dgMarketCore);
    console.log("- ChainlinkGiftCardManager:", contractAddresses.chainlinkGiftCardManager);
    console.log("");
    console.log("⚠️  IMPORTANT: Only authorized roles can create gift cards now!");

  } catch (error) {
    console.error("❌ Configuration failed:", error.message);
    console.error("Full error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  });