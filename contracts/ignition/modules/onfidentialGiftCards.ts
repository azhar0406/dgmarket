// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ConfidentialGiftCardModule = buildModule("ConfidentialGiftCardModule", (m) => {
  // Deploy ConfidentialGiftCard
  const confidentialGiftCard = m.contract("ConfidentialGiftCard");

  return { confidentialGiftCard };
});

export default ConfidentialGiftCardModule;