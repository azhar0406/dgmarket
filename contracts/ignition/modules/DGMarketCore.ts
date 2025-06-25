// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DGMarketCoreModule = buildModule("DGMarketCoreModule", (m) => {
  // Deploy ConfidentialGiftCard first
  const confidentialGiftCard = m.contract("ConfidentialGiftCard");

  // Deploy DGMarketCore with ConfidentialGiftCard address and marketplace fee
  const marketplaceFeePercent = 250; // 2.5%
  const dgMarketCore = m.contract("DGMarketCore", [
    confidentialGiftCard,
    marketplaceFeePercent
  ]);

  return { confidentialGiftCard, dgMarketCore };
});

export default DGMarketCoreModule;