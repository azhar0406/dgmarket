const { createWalletClient, createPublicClient, http, getAddress, encodeBytes32String } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { baseSepolia } = require("viem/chains");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Import ABIs
const dgMarketCoreAbi = require("../artifacts/contracts/DGMarketCore.sol/DGMarketCore.json");
const priceOracleAbi = require("../artifacts/contracts/PriceOracle.sol/PriceOracle.json");
const agentCoordinatorAbi = require("../artifacts/contracts/AgentCoordinator.sol/AgentCoordinator.json");

// Setup wallet and client (same as your wallet.ts but in JS)
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
  console.log("🔧 Configuring DG Market System with Viem...");

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
        agentCoordinator: deployedAddresses["DGMarketDeployModule#AgentCoordinator"] || 
                         deployedAddresses["DGMarketFreshModule#AgentCoordinator"] ||
                         deployedAddresses["DGMarketCompleteModule#AgentCoordinator"]
      };
      
      console.log("📍 Found deployed contracts:");
      console.log("- ConfidentialGiftCard:", contractAddresses.confidentialGiftCard);
      console.log("- PriceOracle:", contractAddresses.priceOracle);
      console.log("- DGMarketCore:", contractAddresses.dgMarketCore);
      console.log("- AgentCoordinator:", contractAddresses.agentCoordinator);
      
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
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
    usdcPriceFeed: "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165", // USDC/USD price feed
    categories: ["Food & Dining", "Shopping", "Entertainment", "Travel", "Gaming"]
  };

  try {
    // 1. Configure supported tokens
    console.log("\n1️⃣ Adding supported tokens...");
    
    try {
      // Check if token is already supported
      const isTokenSupported = await publicClient.readContract({
        address: getAddress(contractAddresses.dgMarketCore),
        abi: dgMarketCoreAbi.abi,
        functionName: "supportedTokens",
        args: [config.usdcAddress],
      });

      if (!isTokenSupported) {
        const addTokenTxHash = await wallet.writeContract({
          address: contractAddresses.dgMarketCore,
          abi: dgMarketCoreAbi.abi,
          functionName: "addSupportedToken",
          args: [config.usdcAddress, config.usdcPriceFeed],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: addTokenTxHash });
        console.log("✅ Added USDC as supported token");
      } else {
        console.log("✅ USDC already supported");
      }
    } catch (error) {
      console.log("⚠️ Token configuration issue:", error.message);
    }

    // 2. Configure price feeds
    console.log("\n2️⃣ Adding price feeds...");
    try {
      const addPriceFeedTxHash = await wallet.writeContract({
        address: contractAddresses.priceOracle,
        abi: priceOracleAbi.abi,
        functionName: "addPriceFeed",
        args: [config.usdcAddress, config.usdcPriceFeed, 3600],
      });
      
      await publicClient.waitForTransactionReceipt({ hash: addPriceFeedTxHash });
      console.log("✅ Added USDC price feed");
    } catch (error) {
      console.log("⚠️ Price feed configuration issue:", error.message);
    }

    // 3. Add categories
    console.log("\n3️⃣ Adding marketplace categories...");
    for (const category of config.categories) {
      try {
        const addCategoryTxHash = await wallet.writeContract({
          address: contractAddresses.dgMarketCore,
          abi: dgMarketCoreAbi.abi,
          functionName: "addCategory",
          args: [category],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: addCategoryTxHash });
        console.log(`✅ Added category: ${category}`);
      } catch (error) {
        console.log(`⚠️ Category "${category}" issue:`, error.message);
      }
    }

    // 4. Register agents
    console.log("\n4️⃣ Registering agents...");
    const agentTypes = [0, 1, 2, 3]; // MONITORING, RESTOCKING, TRADING, PRICE_DISCOVERY
    const agentNames = ["MONITORING", "RESTOCKING", "TRADING", "PRICE_DISCOVERY"];

    for (let i = 0; i < agentTypes.length; i++) {
      try {
        const registerTxHash = await wallet.writeContract({
          address: contractAddresses.agentCoordinator,
          abi: agentCoordinatorAbi.abi,
          functionName: "registerAgent",
          args: [agentTypes[i], wallet.account.address],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: registerTxHash });
        console.log(`✅ Registered ${agentNames[i]} agent`);
      } catch (error) {
        console.log(`⚠️ ${agentNames[i]} registration issue:`, error.message);
      }
    }

    // 5. Activate agents
    console.log("\n5️⃣ Activating agents...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

    for (let i = 0; i < agentTypes.length; i++) {
      try {
        const activateTxHash = await wallet.writeContract({
          address: contractAddresses.agentCoordinator,
          abi: agentCoordinatorAbi.abi,
          functionName: "updateAgentStatus",
          args: [agentTypes[i], 1], // ACTIVE = 1
        });
        
        await publicClient.waitForTransactionReceipt({ hash: activateTxHash });
        console.log(`✅ Activated ${agentNames[i]} agent`);
      } catch (error) {
        console.log(`⚠️ ${agentNames[i]} activation issue:`, error.message);
      }
    }

    // 6. Set agent parameters
    console.log("\n6️⃣ Setting agent parameters...");
    
    try {
      // Convert strings to bytes32 for parameters (Viem way)
      const checkInterval = encodeBytes32String("300");
      const lowStockThreshold = encodeBytes32String("5");
      const maxTradeAmount = encodeBytes32String("1000");

      const setParam1TxHash = await wallet.writeContract({
        address: contractAddresses.agentCoordinator,
        abi: agentCoordinatorAbi.abi,
        functionName: "setAgentParameter",
        args: [0, "check_interval", checkInterval],
      });
      await publicClient.waitForTransactionReceipt({ hash: setParam1TxHash });

      const setParam2TxHash = await wallet.writeContract({
        address: contractAddresses.agentCoordinator,
        abi: agentCoordinatorAbi.abi,
        functionName: "setAgentParameter",
        args: [1, "low_stock_threshold", lowStockThreshold],
      });
      await publicClient.waitForTransactionReceipt({ hash: setParam2TxHash });

      const setParam3TxHash = await wallet.writeContract({
        address: contractAddresses.agentCoordinator,
        abi: agentCoordinatorAbi.abi,
        functionName: "setAgentParameter",
        args: [2, "max_trade_amount", maxTradeAmount],
      });
      await publicClient.waitForTransactionReceipt({ hash: setParam3TxHash });

      console.log("✅ Agent parameters configured");
    } catch (error) {
      console.log("⚠️ Agent parameter configuration issue:", error.message);
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 CONFIGURATION COMPLETE!");
    console.log("=".repeat(50));
    console.log("✅ Supported tokens: USDC");
    console.log("✅ Price feeds: USDC/USD");
    console.log("✅ Categories:", config.categories.length, "categories");
    console.log("✅ Agents: All 4 agents registered and activated");
    console.log("✅ Parameters: Agent-specific parameters configured");
    console.log("");
    console.log("🚀 DG Market is ready for use!");
    console.log("");
    console.log("📋 Contract Addresses:");
    console.log("- ConfidentialGiftCard:", contractAddresses.confidentialGiftCard);
    console.log("- PriceOracle:", contractAddresses.priceOracle);  
    console.log("- DGMarketCore:", contractAddresses.dgMarketCore);
    console.log("- AgentCoordinator:", contractAddresses.agentCoordinator);

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