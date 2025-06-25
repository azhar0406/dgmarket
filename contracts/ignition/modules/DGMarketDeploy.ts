// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DGMarketDeployModule = buildModule("DGMarketDeployModule", (m) => {
  console.log("🚀 Deploying DG Market Core Contracts...");

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

  // Return only the deployed contracts - no configuration calls
  return { 
    confidentialGiftCard, 
    priceOracle, 
    dgMarketCore, 
    agentCoordinator
  };
});

export default DGMarketDeployModule;