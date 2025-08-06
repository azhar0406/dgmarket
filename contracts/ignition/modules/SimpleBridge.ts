// ignition/modules/SimpleBridge.ts
// Hardhat Ignition module for deploying SimpleBridge to Base Mainnet

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SimpleBridgeModule = buildModule("SimpleBridgeModule", (m) => {
  // Deploy SimpleBridge contract (no constructor arguments needed)
  // Admin will be set to msg.sender (deployer) automatically
  const simpleBridge = m.contract("SimpleBridge");

  return { simpleBridge };
});

export default SimpleBridgeModule;