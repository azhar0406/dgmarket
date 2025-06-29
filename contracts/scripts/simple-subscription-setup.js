// scripts/simple-subscription-setup.js
// Simple working Chainlink subscription setup

const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

// Basic ABIs we need
const FUNCTIONS_ROUTER_ABI = [
  "function createSubscription() external returns (uint64 subscriptionId)",
  "function addConsumer(uint64 subscriptionId, address consumer) external", 
  "function getSubscription(uint64 subscriptionId) external view returns (tuple(uint96 balance, uint96 blockedBalance, address owner, address[] consumers))",
  "function getAllSubscriptions() external view returns (uint64[])",
  "function getSubscriptionsForOwner(address owner) external view returns (uint64[])"
];

const LINK_TOKEN_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

async function main() {
  console.log(" Simple Chainlink Subscription Setup");
  console.log("=".repeat(50));

  // Setup provider and wallet - compatible with both ethers v5 and v6
  let provider, wallet;
  
  try {
    // Try ethers v6 first
    provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY_BASE_SEPOLIA, provider);
  } catch (error) {
    // Fall back to ethers v5
    provider = new ethers.providers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY_BASE_SEPOLIA, provider);
  }

  console.log(" Account Info:");
  console.log("- Wallet Address:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("- ETH Balance:", ethers.utils ? ethers.utils.formatEther(balance) : ethers.formatEther(balance));

  // Contract addresses
  const FUNCTIONS_ROUTER = "0xf9B8fc078197181C841c296C876945aaa425B278";
  const LINK_TOKEN = "0xE4aB69C077896252FAFBD49EFD26B5D171A32410";

  // Initialize contracts
  const functionsRouter = new ethers.Contract(FUNCTIONS_ROUTER, FUNCTIONS_ROUTER_ABI, wallet);
  const linkToken = new ethers.Contract(LINK_TOKEN, LINK_TOKEN_ABI, wallet);

  // Check LINK balance
  const linkBalance = await linkToken.balanceOf(wallet.address);
  const formatEther = ethers.utils ? ethers.utils.formatEther : ethers.formatEther;
  const parseEther = ethers.utils ? ethers.utils.parseEther : ethers.parseEther;
  console.log("- LINK Balance:", formatEther(linkBalance));
  
  // Get deployed contract address
  const deploymentPath = "./ignition/deployments/chain-84532/deployed_addresses.json";
  if (!fs.existsSync(deploymentPath)) {
    console.error(" Deployed addresses not found. Deploy contracts first.");
    process.exit(1);
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const chainlinkManagerAddress = deployedAddresses["DGMarketCompleteModule#ChainlinkGiftCardManager"] || 
                                 deployedAddresses["DGMarketFreshModule#ChainlinkGiftCardManager"];

  if (!chainlinkManagerAddress) {
    console.error(" ChainlinkGiftCardManager address not found in deployment.");
    process.exit(1);
  }

  console.log(" ChainlinkGiftCardManager:", chainlinkManagerAddress);
  
  // First check for existing subscription ID in .env
  let subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID;
  if (subscriptionId && subscriptionId !== "0") {
    console.log("\n Found existing subscription ID in .env:", subscriptionId);
    try {
      const subscription = await functionsRouter.getSubscription(subscriptionId);
      console.log(" Verified subscription exists");
      console.log("- Owner:", subscription.owner);
      console.log("- Balance:", formatEther(subscription.balance), "LINK");
      
      // Check if consumer is already added
      if (subscription.consumers.includes(chainlinkManagerAddress)) {
        console.log(" ChainlinkGiftCardManager is already a consumer");
      } else {
        console.log("\n Adding ChainlinkGiftCardManager as consumer...");
        const tx = await functionsRouter.addConsumer(subscriptionId, chainlinkManagerAddress);
        await tx.wait();
        console.log(" Added ChainlinkGiftCardManager as consumer");
      }
      
      console.log("\n Setup complete! Using existing subscription ID:", subscriptionId);
      return;
    } catch (error) {
      console.log(" Could not verify subscription from .env, will check for other subscriptions");
    }
  }

  // Check if this wallet already has subscriptions
  console.log("\n Checking for existing subscriptions owned by this wallet...");
  try {
    // Get all subscriptions for this wallet
    const ownedSubscriptions = await functionsRouter.getSubscriptionsForOwner(wallet.address);
    
    if (ownedSubscriptions && ownedSubscriptions.length > 0) {
      console.log(" Found existing subscriptions:", ownedSubscriptions.map(s => s.toString()).join(', '));
      
      // Use the first subscription
      subscriptionId = ownedSubscriptions[0].toString();
      console.log("\n Using subscription ID:", subscriptionId);
      
      // Get subscription details
      const subscription = await functionsRouter.getSubscription(subscriptionId);
      console.log("- Owner:", subscription.owner);
      console.log("- Balance:", formatEther(subscription.balance), "LINK");
      
      // Check if consumer is already added
      if (subscription.consumers.includes(chainlinkManagerAddress)) {
        console.log(" ChainlinkGiftCardManager is already a consumer");
      } else {
        console.log("\n Adding ChainlinkGiftCardManager as consumer...");
        const tx = await functionsRouter.addConsumer(subscriptionId, chainlinkManagerAddress);
        await tx.wait();
        console.log(" Added ChainlinkGiftCardManager as consumer");
      }
      
      // Update .env file
      updateEnvFile(subscriptionId);
      
      console.log("\n Setup complete! Using existing subscription ID:", subscriptionId);
      return;
    } else {
      console.log(" No existing subscriptions found for this wallet.");
    }
  } catch (error) {
    console.log(" Error checking for existing subscriptions:", error.message);
  }

  console.log("\n Unable to create or find a subscription automatically.");
  console.log("Please visit the Chainlink Functions UI to manage your subscriptions:");
  console.log("https://functions.chain.link/base-sepolia");
  console.log("\nOnce you have a subscription ID, add it to your .env file as:");
  console.log("CHAINLINK_SUBSCRIPTION_ID=your_subscription_id");
  console.log("\nThen run this script again to add your consumer.");
}

function updateEnvFile(subscriptionId) {
  try {
    const envPath = './.env';
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (envContent.includes('CHAINLINK_SUBSCRIPTION_ID=')) {
      envContent = envContent.replace(/CHAINLINK_SUBSCRIPTION_ID=.*/, `CHAINLINK_SUBSCRIPTION_ID=${subscriptionId}`);
    } else {
      envContent += `\nCHAINLINK_SUBSCRIPTION_ID=${subscriptionId}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(" Updated .env file with subscription ID:", subscriptionId);
  } catch (error) {
    console.error(" Error updating .env file:", error.message);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(" Script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { main };