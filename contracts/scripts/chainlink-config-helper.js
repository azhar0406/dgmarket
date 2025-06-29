// scripts/chainlink-config-helper.js
// Helper script to format Chainlink DON IDs correctly

const ethers = require('ethers');

// Helper function to convert string to bytes32
function stringToBytes32(str) {
  // Convert string to UTF-8 bytes
  const bytes = ethers.utils.toUtf8Bytes(str);
  
  // Pad to 32 bytes with zeros
  const padded = new Uint8Array(32);
  padded.set(bytes.slice(0, 32)); // Take first 32 bytes if longer
  
  // Convert to hex string
  return ethers.utils.hexlify(padded);
}

// Common DON IDs for different networks
const donIds = {
  baseSepolia: {
    name: "fun-base-sepolia-1",
    // Convert string to bytes32 properly
    bytes32: stringToBytes32("fun-base-sepolia-1")
  },
  baseMainnet: {
    name: "fun-base-mainnet-1", 
    bytes32: stringToBytes32("fun-base-mainnet-1")
  },
  polygonMumbai: {
    name: "fun-polygon-mumbai-1",
    bytes32: stringToBytes32("fun-polygon-mumbai-1")
  },
  ethereumSepolia: {
    name: "fun-ethereum-sepolia-1",
    bytes32: stringToBytes32("fun-ethereum-sepolia-1")
  }
};

// Base Sepolia configuration
const baseSepoliaConfig = {
  router: "0xf9B8fc078197181C841c296C876945aaa425B278",
  donId: donIds.baseSepolia.bytes32,
  subscriptionId: process.env.CHAINLINK_SUBSCRIPTION_ID || "0"
};

console.log(" Chainlink Functions Configuration Helper");
console.log("==========================================");
console.log("");

console.log(" Base Sepolia Configuration:");
console.log("- Network: Base Sepolia (Chain ID: 84532)");
console.log("- Router:", baseSepoliaConfig.router);
console.log("- DON ID (string):", donIds.baseSepolia.name);
console.log("- DON ID (bytes32):", baseSepoliaConfig.donId);
console.log("- DON ID Length:", baseSepoliaConfig.donId.length, "characters");
console.log("- Subscription ID:", baseSepoliaConfig.subscriptionId);
console.log("");

console.log(" Environment Variables for .env:");
console.log("CHAINLINK_FUNCTIONS_ROUTER=" + baseSepoliaConfig.router);
console.log("CHAINLINK_DON_ID=" + baseSepoliaConfig.donId);
console.log("CHAINLINK_SUBSCRIPTION_ID=" + baseSepoliaConfig.subscriptionId);
console.log("");

console.log(" All Available DON IDs:");
Object.entries(donIds).forEach(([network, config]) => {
  console.log(`${network}:`);
  console.log(`  Name: ${config.name}`);
  console.log(`  Bytes32: ${config.bytes32}`);
  console.log(`  Length: ${config.bytes32.length} characters`);
  console.log("");
});

// Validation
console.log(" Validation:");
console.log("- Base Sepolia DON ID is valid bytes32:", baseSepoliaConfig.donId.length === 66);
console.log("- Starts with 0x:", baseSepoliaConfig.donId.startsWith('0x'));
console.log("- Contains only hex characters:", /^0x[0-9a-fA-F]{64}$/.test(baseSepoliaConfig.donId));

// Test conversion back
try {
  const decoded = ethers.utils.toUtf8String(baseSepoliaConfig.donId);
  console.log("- Can decode back to string:", decoded);
} catch (error) {
  console.log("- Decode test: Contains null bytes (expected for padded strings)");
}

console.log("");
console.log(" Ready to deploy with correct DON ID!");

module.exports = {
  baseSepoliaConfig,
  donIds
};