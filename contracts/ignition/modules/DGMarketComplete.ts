// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DGMarketCompleteModule = buildModule("DGMarketCompleteModule", (m) => {
  console.log("🚀 Deploying DG Market Complete System (2-Contract Architecture)...");

  // =============================================================================
  // DEPLOYMENT CONFIGURATION
  // =============================================================================
  
  // Get Chainlink Functions configuration for Base Sepolia
  const chainlinkFunctionsRouter = process.env.CHAINLINK_FUNCTIONS_ROUTER || "0xf9B8fc078197181C841c296C876945aaa425B278"; // Base Sepolia Functions Router
  
  // Fixed DON ID - properly formatted bytes32 (64 characters)
  const chainlinkDonId = process.env.CHAINLINK_DON_ID || "0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000"; // fun-base-sepolia-1 (32 bytes)
  
  const chainlinkSubscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID || "0"; // Will be updated by setup script
  
  // Base Sepolia token addresses
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
  const usdtAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"; // Base Sepolia USDT
  
  // API configuration
  const okxApiBaseUrl = process.env.GIFT_CARD_API_URL || "http://localhost:8081";
  
  console.log("📋 Deployment Configuration:");
  console.log("- Chainlink Router:", chainlinkFunctionsRouter);
  console.log("- DON ID:", chainlinkDonId);
  console.log("- Subscription ID:", chainlinkSubscriptionId);
  console.log("- USDC Address:", usdcAddress);
  console.log("- USDT Address:", usdtAddress);
  console.log("- API Base URL:", okxApiBaseUrl);

  // =============================================================================
  // CONTRACT DEPLOYMENT (2-Contract Architecture)
  // =============================================================================

  // 1. Deploy DGMarketCore (All-in-One Contract)
  console.log("📦 Deploying DGMarketCore (All-in-One: FHE + Marketplace + Inventory)...");
  const dgMarketCore = m.contract("DGMarketCore");

  // 2. Deploy ChainlinkGiftCardManager (Automation Only)
  console.log("🔗 Deploying ChainlinkGiftCardManager (Automation Only)...");
  const chainlinkGiftCardManager = m.contract("ChainlinkGiftCardManager", [
    dgMarketCore,
    chainlinkFunctionsRouter,
    chainlinkDonId,
    chainlinkSubscriptionId,
    okxApiBaseUrl
  ]);

  // =============================================================================
  // ROLE CONFIGURATION
  // =============================================================================

  console.log("🔐 Configuring roles and permissions...");

  // Grant AUTOMATION_ROLE to ChainlinkGiftCardManager in DGMarketCore
  // This allows ChainlinkGiftCardManager to create gift cards via automationCreateGiftCard()
  m.call(dgMarketCore, "grantAutomationRole", [chainlinkGiftCardManager], {
    id: "GrantAutomationRoleToChainlinkManager"
  });

  // =============================================================================
  // TOKEN CONFIGURATION - FIXED: SKIP (ALREADY ADDED IN CONSTRUCTOR)
  // =============================================================================

  console.log("💰 Supported tokens configuration...");
  console.log("ℹ️  USDC and USDT are already configured in DGMarketCore constructor");
  console.log("- USDC Address:", usdcAddress);
  console.log("- USDT Address:", usdtAddress);

  // ✅ FIXED: Skip adding tokens since they're already added in constructor
  // USDC and USDT are automatically added when DGMarketCore is deployed
  // No need to call addSupportedToken() again

  // =============================================================================
  // CATEGORY CONFIGURATION - FIXED: ONLY DGMarketCore
  // =============================================================================

  console.log("📂 Configuring gift card categories...");

  // ✅ FIXED: Add categories ONLY to DGMarketCore (ChainlinkManager doesn't have addCategory function)
  const categories = [
    "Food & Dining",
    "Shopping", 
    "Entertainment",
    "Travel",
    "Gaming"
  ];

  categories.forEach((category, index) => {
    m.call(dgMarketCore, "addCategory", [category, 5], { // threshold = 5
      id: `AddCoreCategory${index}_${category.replace(/[^a-zA-Z0-9]/g, '')}`
    });
  });

  // ❌ REMOVED: ChainlinkGiftCardManager doesn't have addCategory function
  // Categories are managed entirely by DGMarketCore
  // ChainlinkGiftCardManager triggers restocking based on DGMarketCore's inventory events

  // =============================================================================
  // INITIAL CONFIGURATION
  // =============================================================================

  console.log("⚙️ Setting initial configuration...");

  // Set marketplace fee to 2.5% (250 basis points)
  m.call(dgMarketCore, "updateMarketplaceFee", [250], {
    id: "SetMarketplaceFee"
  });

  // =============================================================================
  // RETURN DEPLOYED CONTRACTS
  // =============================================================================

  console.log("✅ DG Market deployment complete!");
  console.log("📋 Deployed Contracts:");
  console.log("- DGMarketCore: All-in-one core contract (includes category management)");
  console.log("- ChainlinkGiftCardManager: Automation-only contract (monitors DGMarketCore events)");
  console.log("");
  console.log("💰 Token Configuration:");
  console.log("- USDC & USDT: ✅ Automatically configured in constructor");
  console.log("- Supported tokens ready for marketplace transactions");
  console.log("");
  console.log("📂 Category Configuration:");
  console.log("- ✅ 5 categories added: Food & Dining, Shopping, Entertainment, Travel, Gaming");
  console.log("- ✅ All categories have threshold of 5 for auto-restocking");
  console.log("");
  console.log("🎯 Architecture Notes:");
  console.log("- Categories managed by DGMarketCore only");
  console.log("- ChainlinkGiftCardManager monitors inventory via events");
  console.log("- Automatic restocking triggered by inventory thresholds");
  console.log("");
  console.log("🎯 Next Steps:");
  console.log("1. Run: node scripts/complete-master-setup.js");
  console.log("2. Update EXISTING_CORE_ADDRESS in test/AdminGiftCard.test.js");
  console.log("3. Test: pnpm hardhat test test/AdminGiftCard.test.js --network baseSepolia");
  console.log("4. Start mock API service on port 8081");
  console.log("5. Start backend service on port 3001");

  // Return only contract futures - no plain objects allowed
  return { 
    dgMarketCore,
    chainlinkGiftCardManager
  };
});

export default DGMarketCompleteModule;