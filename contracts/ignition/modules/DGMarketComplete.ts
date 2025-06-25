// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DGMarketCompleteModule = buildModule("DGMarketCompleteModule", (m) => {
  console.log("🚀 Deploying DG Market Complete System...");

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

  // 4. Deploy AgentCoordinator with simplified constructor
  const agentCoordinator = m.contract("AgentCoordinator", [
    dgMarketCore,
    priceOracle
  ]);

  // 5. Configuration calls (these will be executed after deployment)
  
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
  
  // Add default categories with unique IDs
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

  // Get deployer account for agent setup
  const deployer = m.getAccount(0);

  // Register agents with unique IDs (using deployer as operator for demo)
  const registerMonitoring = m.call(agentCoordinator, "registerAgent", [0, deployer], {
    id: "RegisterMonitoringAgent"
  }); // MONITORING
  const registerRestocking = m.call(agentCoordinator, "registerAgent", [1, deployer], {
    id: "RegisterRestockingAgent"
  }); // RESTOCKING
  const registerTrading = m.call(agentCoordinator, "registerAgent", [2, deployer], {
    id: "RegisterTradingAgent"
  }); // TRADING
  const registerPriceDiscovery = m.call(agentCoordinator, "registerAgent", [3, deployer], {
    id: "RegisterPriceDiscoveryAgent"
  }); // PRICE_DISCOVERY

  // Activate agents with unique IDs and dependencies on registration
  m.call(agentCoordinator, "updateAgentStatus", [0, 1], {
    id: "ActivateMonitoringAgent",
    after: [registerMonitoring]
  }); // MONITORING -> ACTIVE
  m.call(agentCoordinator, "updateAgentStatus", [1, 1], {
    id: "ActivateRestockingAgent", 
    after: [registerRestocking]
  }); // RESTOCKING -> ACTIVE
  m.call(agentCoordinator, "updateAgentStatus", [2, 1], {
    id: "ActivateTradingAgent",
    after: [registerTrading]
  }); // TRADING -> ACTIVE
  m.call(agentCoordinator, "updateAgentStatus", [3, 1], {
    id: "ActivatePriceDiscoveryAgent",
    after: [registerPriceDiscovery]
  }); // PRICE_DISCOVERY -> ACTIVE

  // Return only contract futures - no plain objects allowed
  return { 
    confidentialGiftCard, 
    priceOracle, 
    dgMarketCore, 
    agentCoordinator
  };
});

export default DGMarketCompleteModule;