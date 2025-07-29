// This setup uses Hardhat Ignition to manage smart contract deployments.
// Fixed deployment script with correct role management

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
  
  const chainlinkSubscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID || "416"; // Updated subscription ID
  
  // Base Sepolia token addresses
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
  const usdtAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"; // Base Sepolia USDT
  
  // API configuration
  const okxApiBaseUrl = process.env.GIFT_CARD_API_URL || "http://13.235.164.47:8081";
  
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

  // 1. Deploy DGMarketCore (Enhanced with Dynamic Categories)
  console.log("📦 Deploying Enhanced DGMarketCore (FHE + Marketplace + Dynamic Categories)...");
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
  // ROLE CONFIGURATION - FIXED WITH HARDCODED HASH
  // =============================================================================

  console.log("🔐 Configuring roles and permissions...");

  // ✅ FIXED: Use hardcoded AUTOMATION_ROLE hash (most compatible)
  // AUTOMATION_ROLE = keccak256("AUTOMATION_ROLE")
  const automationRoleHash = "0xfbd454f36a7e1a388bd6fc3ab10d434aa4578f811acbbcf33afb1c697486313c";
  
  console.log("🔑 AUTOMATION_ROLE hash:", automationRoleHash);

  // Grant AUTOMATION_ROLE to ChainlinkGiftCardManager in DGMarketCore
  // This allows ChainlinkGiftCardManager to create gift cards via automationCreateGiftCard()
  m.call(dgMarketCore, "grantRole", [automationRoleHash, chainlinkGiftCardManager], {
    id: "GrantAutomationRoleToChainlinkManager"
  });

  // =============================================================================
  // TOKEN CONFIGURATION
  // =============================================================================

  console.log("💰 Supported tokens configuration...");
  console.log("ℹ️  USDC and USDT are already configured in DGMarketCore constructor");
  console.log("- USDC Address:", usdcAddress);
  console.log("- USDT Address:", usdtAddress);

  // ✅ CONFIRMED: Skip adding tokens since they're already added in constructor
  // USDC and USDT are automatically added when DGMarketCore is deployed

  // =============================================================================
  // CATEGORY CONFIGURATION - Enhanced for Dynamic Categories
  // =============================================================================

  console.log("📂 Configuring gift card categories...");

  // ✅ Categories are already initialized in constructor for enhanced contract
  // The enhanced contract automatically creates these categories:
  // - Food & Dining
  // - Shopping
  // - Entertainment 
  // - Travel
  // - Gaming

  console.log("ℹ️  Categories are automatically initialized in enhanced contract constructor");
  console.log("✅ Default categories: Food & Dining, Shopping, Entertainment, Travel, Gaming");
  console.log("✅ All categories have threshold of 5 for auto-restocking");

  // Optional: Add additional categories if needed
  // Uncomment and modify if you want to add more categories beyond the default 5
  /*
  const additionalCategories = [
    // "Health & Beauty",
    // "Sports & Fitness",
    // "Technology"
  ];

  additionalCategories.forEach((category, index) => {
    m.call(dgMarketCore, "addCategory", [category, 5], { // threshold = 5
      id: `AddAdditionalCategory${index}_${category.replace(/[^a-zA-Z0-9]/g, '')}`
    });
  });
  */

  // =============================================================================
  // INITIAL CONFIGURATION
  // =============================================================================

  console.log("⚙️ Setting initial configuration...");

  // Set marketplace fee to 2.5% (250 basis points)
  m.call(dgMarketCore, "updateMarketplaceFee", [250], {
    id: "SetMarketplaceFee"
  });

  // ✅ REMOVED: ChainlinkManager functions not available in current contract
  // These functions will be added in future contract updates if needed:
  // - setChainlinkManager(address)
  // - setAutoRestockEnabled(bool)
  
  console.log("ℹ️  Chainlink integration functions skipped (not available in current contract)");
  console.log("ℹ️  ChainlinkManager will function independently for now");

  // =============================================================================
  // RETURN DEPLOYED CONTRACTS
  // =============================================================================

  console.log("✅ Enhanced DG Market deployment complete!");
  console.log("📋 Deployed Contracts:");
  console.log("- DGMarketCore: Enhanced all-in-one contract with dynamic categories");
  console.log("- ChainlinkGiftCardManager: Automation-only contract");
  console.log("");
  console.log("🔐 Role Configuration:");
  console.log("- ✅ AUTOMATION_ROLE granted to ChainlinkGiftCardManager");
  console.log("- ✅ Admin roles configured for contract owner");
  console.log("");
  console.log("💰 Token Configuration:");
  console.log("- ✅ USDC & USDT automatically configured");
  console.log("- ✅ Ready for marketplace transactions");
  console.log("");
  console.log("📂 Enhanced Category System:");
  console.log("- ✅ 5 default categories initialized");
  console.log("- ✅ Dynamic category loading functions available");
  console.log("- ✅ Category IDs and statistics tracking");
  console.log("- ✅ Real-time inventory management");
  console.log("");
  console.log("🤖 Automation Configuration:");
  console.log("- ⚠️ ChainlinkManager functions skipped (not in current contract)");
  console.log("- ✅ AUTOMATION_ROLE granted for gift card creation");
  console.log("- ✅ ChainlinkManager can create cards independently");
  console.log("");
  console.log("🎯 New Dynamic Features:");
  console.log("- getAllCategories() - Get all category names");
  console.log("- getAllCategoriesWithData() - Get categories with IDs and stats");
  console.log("- getCategoryById(id) - Get specific category data");
  console.log("- getCategoryCount() - Get total category count");
  console.log("");
  console.log("🎯 Next Steps:");
  console.log("1. Update frontend CONTRACT_ADDRESS with new deployment");
  console.log("2. Use enhanced hooks for dynamic category loading");
  console.log("3. Run gift card creation script with IPFS images");
  console.log("4. Test dynamic marketplace functionality");
  console.log("5. Verify category filtering and live counts");

  // Return deployed contracts
  return { 
    dgMarketCore,
    chainlinkGiftCardManager
  };
});

export default DGMarketCompleteModule;