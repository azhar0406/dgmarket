// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AgentCoordinatorModule = buildModule("AgentCoordinatorModule", (m) => {
  // Deploy dependencies first
  const confidentialGiftCard = m.contract("ConfidentialGiftCard");
  const priceOracle = m.contract("PriceOracle");
  
  const marketplaceFeePercent = 250; // 2.5%
  const dgMarketCore = m.contract("DGMarketCore", [
    confidentialGiftCard,
    marketplaceFeePercent
  ]);

  // Deploy AgentCoordinator with simplified constructor (no Chainlink Functions)
  const agentCoordinator = m.contract("AgentCoordinator", [
    dgMarketCore,
    priceOracle
  ]);

  return { 
    confidentialGiftCard, 
    priceOracle, 
    dgMarketCore, 
    agentCoordinator 
  };
});

export default AgentCoordinatorModule;