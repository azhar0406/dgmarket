// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DGMarketCompleteModule = buildModule("DGMarketCompleteModule", (m) => {
  console.log("🚀 Deploying DG Market Complete System with Enhanced Security...");

  // 1. Deploy ConfidentialGiftCard
  const confidentialGiftCard = m.contract("ConfidentialGiftCard");

  // 2. Deploy PriceOracle
  const priceOracle = m.contract("PriceOracle");

  // 3. Deploy DGMarketCore with dependencies
  const marketplaceFeePercent = 250; // 2.5%
  const dgMarketCore = m.contract("DGMarketCore", [
    confidentialGiftCard,
    marketplaceFeePercent
  ]);

  // 4. Deploy ChainlinkGiftCardManager with dependencies
  // Get Chainlink Functions configuration for Base Sepolia
  const chainlinkFunctionsRouter = process.env.CHAINLINK_FUNCTIONS_ROUTER || "0xf9B8fc078197181C841c296C876945aaa425B278"; // Base Sepolia Functions Router
  
  // Fixed DON ID - properly formatted bytes32 (64 characters)
  const chainlinkDonId = process.env.CHAINLINK_DON_ID || "0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000"; // fun-base-sepolia-1 (32 bytes)
  
  const chainlinkSubscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID || "0"; // Replace with your actual subscription ID
  
  console.log("Chainlink Configuration:");
  console.log("- Router:", chainlinkFunctionsRouter);
  console.log("- DON ID:", chainlinkDonId);
  console.log("- Subscription ID:", chainlinkSubscriptionId);
  
  // Deploy ChainlinkGiftCardManager
  const chainlinkGiftCardManager = m.contract("ChainlinkGiftCardManager", [
    dgMarketCore,
    confidentialGiftCard,
    chainlinkFunctionsRouter,
    chainlinkDonId,
    chainlinkSubscriptionId
  ]);

  // 5. Configure roles and permissions
  
  // Grant BACKEND_ROLE to ChainlinkGiftCardManager in ConfidentialGiftCard
  // This allows ChainlinkGiftCardManager to create gift cards from Chainlink Functions
  m.call(confidentialGiftCard, "grantBackendRole", [chainlinkGiftCardManager], {
    id: "GrantBackendRoleToChainlinkManager"
  });

  // 6. Configuration calls (these will be executed after deployment)
  
  // Configure supported tokens for Base Sepolia
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
  const usdcPriceFeed = "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165"; // USDC/USD price feed
  
  // Add USDC as supported token
  m.call(dgMarketCore, "addSupportedToken", [usdcAddress, usdcPriceFeed], {
    id: "AddUSDCToken"
  });
  
  // Add price feed to oracle
  m.call(priceOracle, "addPriceFeed", [usdcAddress, usdcPriceFeed, 3600], {
    id: "AddUSDCPriceFeed"
  }); // 1 hour heartbeat
  
  // Add default categories to DGMarketCore with unique IDs
  m.call(dgMarketCore, "addCategory", ["Food & Dining"], {
    id: "AddCategoryFoodDining"
  });
  m.call(dgMarketCore, "addCategory", ["Shopping"], {
    id: "AddCategoryShopping"
  });
  m.call(dgMarketCore, "addCategory", ["Entertainment"], {
    id: "AddCategoryEntertainment"
  });
  m.call(dgMarketCore, "addCategory", ["Travel"], {
    id: "AddCategoryTravel"
  });
  m.call(dgMarketCore, "addCategory", ["Gaming"], {
    id: "AddCategoryGaming"
  });

  // Add categories to ChainlinkGiftCardManager with thresholds
  m.call(chainlinkGiftCardManager, "addCategory", ["Food & Dining", 5], {
    id: "AddChainlinkCategoryFoodDining"
  });
  m.call(chainlinkGiftCardManager, "addCategory", ["Shopping", 5], {
    id: "AddChainlinkCategoryShopping"
  });
  m.call(chainlinkGiftCardManager, "addCategory", ["Entertainment", 5], {
    id: "AddChainlinkCategoryEntertainment"
  });
  m.call(chainlinkGiftCardManager, "addCategory", ["Travel", 3], {
    id: "AddChainlinkCategoryTravel"
  });
  m.call(chainlinkGiftCardManager, "addCategory", ["Gaming", 5], {
    id: "AddChainlinkCategoryGaming"
  });

  // Return only contract futures - no plain objects allowed
  return { 
    confidentialGiftCard, 
    priceOracle, 
    dgMarketCore,
    chainlinkGiftCardManager
  };
});

export default DGMarketCompleteModule;