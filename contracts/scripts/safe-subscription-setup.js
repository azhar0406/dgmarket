// scripts/safe-subscription-setup.js
// Safe Chainlink subscription setup that reuses existing subscriptions

const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

// Store subscription info locally to reuse
const SUBSCRIPTION_CACHE_FILE = './chainlink-subscription.json';

const FUNCTIONS_ROUTER_ABI = [
  {
    "inputs": [],
    "name": "createSubscription",
    "outputs": [{"internalType": "uint64", "name": "subscriptionId", "type": "uint64"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint64", "name": "subscriptionId", "type": "uint64"},
      {"internalType": "address", "name": "consumer", "type": "address"}
    ],
    "name": "addConsumer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint64", "name": "subscriptionId", "type": "uint64"}
    ],
    "name": "getSubscription",
    "outputs": [
      {
        "components": [
          {"internalType": "uint96", "name": "balance", "type": "uint96"},
          {"internalType": "uint96", "name": "blockedBalance", "type": "uint96"},
          {"internalType": "address", "name": "owner", "type": "address"},
          {"internalType": "address[]", "name": "consumers", "type": "address[]"}
        ],
        "internalType": "struct IFunctionsSubscriptions.Subscription",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const LINK_TOKEN_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "account", "type": "address"}
    ],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const FUNCTIONS_ROUTER_ADDRESS = "0xf9B8fc078197181C841c296C876945aaa425B278";
const LINK_TOKEN_ADDRESS = "0xE4aB69C077896252FAFBD49EFD26B5D171A32410";

function loadSubscriptionCache() {
  if (fs.existsSync(SUBSCRIPTION_CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SUBSCRIPTION_CACHE_FILE, 'utf8'));
    } catch (error) {
      console.log("⚠️ Could not read subscription cache, will create new");
      return null;
    }
  }
  return null;
}

function saveSubscriptionCache(data) {
  fs.writeFileSync(SUBSCRIPTION_CACHE_FILE, JSON.stringify(data, null, 2));
}

async function checkExistingSubscription(functionsRouter, subscriptionId) {
  try {
    const subscription = await functionsRouter.getSubscription(subscriptionId);
    return {
      exists: true,
      balance: subscription.balance,
      owner: subscription.owner,
      consumers: subscription.consumers
    };
  } catch (error) {
    return { exists: false };
  }
}

async function main(options = {}) {
  const { 
    fundAmount = "1.0", // Default 1 LINK for testing
    forceNew = false,   // Force create new subscription
    testMode = true     // Use minimal funding in test mode
  } = options;

  console.log("🔒 Safe Chainlink Functions Subscription Setup");
  console.log("=".repeat(50));
  console.log(`💰 Funding amount: ${fundAmount} LINK`);
  console.log(`🧪 Test mode: ${testMode ? 'ON (minimal funding)' : 'OFF'}`);
  console.log("");

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

  console.log("📊 Account Info:");
  console.log("- Wallet Address:", wallet.address);
  
  // Add formatEther and parseEther compatibility
  const formatEther = ethers.utils ? ethers.utils.formatEther : ethers.formatEther;
  const parseEther = ethers.utils ? ethers.utils.parseEther : ethers.parseEther;

  const balance = await provider.getBalance(wallet.address);
  const linkToken = new ethers.Contract(LINK_TOKEN_ADDRESS, LINK_TOKEN_ABI, wallet);
  const linkBalance = await linkToken.balanceOf(wallet.address);
  
  console.log("- ETH Balance:", formatEther(balance));
  console.log("- LINK Balance:", formatEther(linkBalance));

  const functionsRouter = new ethers.Contract(FUNCTIONS_ROUTER_ADDRESS, FUNCTIONS_ROUTER_ABI, wallet);

  // Get current ChainlinkGiftCardManager address
  const deploymentPath = "./ignition/deployments/chain-84532/deployed_addresses.json";
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Contracts not deployed yet");
    process.exit(1);
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const chainlinkManagerAddress = deployedAddresses["DGMarketCompleteModule#ChainlinkGiftCardManager"] || 
                                 deployedAddresses["DGMarketFreshModule#ChainlinkGiftCardManager"];

  console.log("📍 ChainlinkGiftCardManager:", chainlinkManagerAddress);

  let subscriptionId;
  let subscriptionData;

  // Step 1: Check for existing subscription
  if (!forceNew) {
    console.log("\n🔍 Checking for existing subscription...");
    const cachedSubscription = loadSubscriptionCache();
    
    if (cachedSubscription && cachedSubscription.subscriptionId) {
      console.log("📋 Found cached subscription ID:", cachedSubscription.subscriptionId);
      
      const existing = await checkExistingSubscription(functionsRouter, cachedSubscription.subscriptionId);
      
      if (existing.exists) {
        console.log("✅ Existing subscription is valid!");
        console.log("- Owner:", existing.owner);
        console.log("- Balance:", formatEther(existing.balance), "LINK");
        console.log("- Consumers:", existing.consumers.length);
        
        subscriptionId = cachedSubscription.subscriptionId;
        subscriptionData = existing;
        
        // Check if our contract is already a consumer
        const isConsumer = existing.consumers.includes(chainlinkManagerAddress);
        if (!isConsumer) {
          console.log("🔄 Adding new contract as consumer...");
          const addConsumerTx = await functionsRouter.addConsumer(subscriptionId, chainlinkManagerAddress);
          await addConsumerTx.wait();
          console.log("✅ Added as consumer");
        } else {
          console.log("✅ Contract is already a consumer");
        }
      } else {
        console.log("⚠️ Cached subscription no longer exists, creating new one");
      }
    }
  }

  // Step 2: Create new subscription if needed
  if (!subscriptionId) {
    console.log("\n🔄 Creating new subscription...");
    
    const createTx = await functionsRouter.createSubscription();
    const createReceipt = await createTx.wait();
    
    // Extract subscription ID from logs
    for (const log of createReceipt.logs) {
      try {
        const parsed = functionsRouter.interface.parseLog(log);
        if (parsed.name === 'SubscriptionCreated') {
          subscriptionId = parsed.args.subscriptionId.toString();
          break;
        }
      } catch (e) {
        const topics = log.topics;
        if (topics.length >= 2) {
          subscriptionId = parseInt(topics[1], 16).toString();
        }
      }
    }

    if (!subscriptionId) {
      throw new Error("Could not extract subscription ID");
    }

    console.log("✅ New subscription created! ID:", subscriptionId);

    // Fund the subscription
    console.log(`\n💰 Funding subscription with ${fundAmount} LINK...`);
    const fundAmountWei = parseEther(fundAmount);
    const transferTx = await linkToken.transfer(FUNCTIONS_ROUTER_ADDRESS, fundAmountWei);
    await transferTx.wait();
    console.log(`✅ Funded with ${fundAmount} LINK`);

    // Add consumer
    console.log("\n🔄 Adding consumer...");
    const addConsumerTx = await functionsRouter.addConsumer(subscriptionId, chainlinkManagerAddress);
    await addConsumerTx.wait();
    console.log("✅ Added consumer");

    // Cache the subscription info
    const cacheData = {
      subscriptionId,
      owner: wallet.address,
      createdAt: new Date().toISOString(),
      fundAmount,
      chainlinkManagerAddress,
      txHashes: {
        create: createTx.hash,
        fund: transferTx.hash,
        addConsumer: addConsumerTx.hash
      }
    };
    
    saveSubscriptionCache(cacheData);
    console.log("💾 Subscription info cached for reuse");
  }

  // Step 3: Update environment
  console.log("\n🔄 Updating .env file...");
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
  console.log("✅ Environment updated");

  // Final verification
  console.log("\n🔍 Final verification...");
  const finalCheck = await functionsRouter.getSubscription(subscriptionId);
  
  console.log("\n" + "=".repeat(50));
  console.log("🎉 SAFE SUBSCRIPTION SETUP COMPLETE!");
  console.log("=".repeat(50));
  console.log("📋 Subscription Details:");
  console.log("- Subscription ID:", subscriptionId);
  console.log("- Balance:", formatEther(finalCheck.balance), "LINK");
  console.log("- Owner:", finalCheck.owner);
  console.log("- Consumers:", finalCheck.consumers.length);
  console.log("- Cached for reuse: ✅");
  console.log("");
  console.log("💡 Benefits:");
  console.log("- Reuses existing subscription on redeployment");
  console.log("- Minimal LINK usage for testing");
  console.log("- Cached locally for quick setup");
  console.log("");
  console.log("🔄 Next time: This subscription will be reused automatically!");

  return {
    subscriptionId,
    balance: formatEther(finalCheck.balance),
    consumers: finalCheck.consumers.length,
    reused: !!subscriptionData
  };
}

// Command line options
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  if (args.includes('--force-new')) {
    options.forceNew = true;
  }
  
  if (args.includes('--production')) {
    options.testMode = false;
    options.fundAmount = "5.0";
  }
  
  const fundAmountArg = args.find(arg => arg.startsWith('--fund='));
  if (fundAmountArg) {
    options.fundAmount = fundAmountArg.split('=')[1];
  }
  
  main(options)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { main };