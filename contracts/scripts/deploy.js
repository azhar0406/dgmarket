const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting DG Market deployment on Base Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  // Base Sepolia testnet configuration
  const config = {
    // Chainlink Functions Router for Base Sepolia
    FUNCTIONS_ROUTER: "0xf9B8fc078197181C841c296C876945aaa425B278",
    DON_ID: "0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000",
    SUBSCRIPTION_ID: 1, // You'll need to create this
    
    // Mock/Test tokens (replace with actual addresses)
    USDC_ADDRESS: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
    USDT_ADDRESS: "0xfDE4C96c8593536E31F229EA8f37b2ADa2699bb2", // Example address
    
    // Chainlink price feeds for Base Sepolia
    USDC_USD_FEED: "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165",
    ETH_USD_FEED: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
    
    // Configuration
    MARKETPLACE_FEE: 250, // 2.5%
  };

  // 1. Deploy ConfidentialGiftCard
  console.log("\n1️⃣ Deploying ConfidentialGiftCard...");
  const ConfidentialGiftCard = await hre.ethers.getContractFactory("ConfidentialGiftCard");
  const giftCardContract = await ConfidentialGiftCard.deploy();
  await giftCardContract.waitForDeployment();
  const giftCardAddress = await giftCardContract.getAddress();
  console.log("✅ ConfidentialGiftCard deployed to:", giftCardAddress);

  // 2. Deploy PriceOracle
  console.log("\n2️⃣ Deploying PriceOracle...");
  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("✅ PriceOracle deployed to:", priceOracleAddress);

  // 3. Deploy DGMarketCore
  console.log("\n3️⃣ Deploying DGMarketCore...");
  const DGMarketCore = await hre.ethers.getContractFactory("DGMarketCore");
  const marketCore = await DGMarketCore.deploy(
    giftCardAddress,
    config.MARKETPLACE_FEE
  );
  await marketCore.waitForDeployment();
  const marketCoreAddress = await marketCore.getAddress();
  console.log("✅ DGMarketCore deployed to:", marketCoreAddress);

  // 4. Deploy AgentCoordinator
  console.log("\n4️⃣ Deploying AgentCoordinator...");
  const AgentCoordinator = await hre.ethers.getContractFactory("AgentCoordinator");
  const agentCoordinator = await AgentCoordinator.deploy(
    config.FUNCTIONS_ROUTER,
    marketCoreAddress,
    priceOracleAddress,
    config.DON_ID,
    config.SUBSCRIPTION_ID
  );
  await agentCoordinator.waitForDeployment();
  const agentCoordinatorAddress = await agentCoordinator.getAddress();
  console.log("✅ AgentCoordinator deployed to:", agentCoordinatorAddress);

  // 5. Configure PriceOracle
  console.log("\n5️⃣ Configuring PriceOracle...");
  
  if (config.USDC_USD_FEED) {
    await priceOracle.addPriceFeed(config.USDC_ADDRESS, config.USDC_USD_FEED, 3600);
    console.log("✅ Added USDC price feed");
  }
  
  if (config.ETH_USD_FEED) {
    await priceOracle.addPriceFeed(hre.ethers.ZeroAddress, config.ETH_USD_FEED, 3600);
    console.log("✅ Added ETH price feed");
  }

  // 6. Configure DGMarketCore
  console.log("\n6️⃣ Configuring DGMarketCore...");
  
  if (config.USDC_ADDRESS) {
    await marketCore.addSupportedToken(config.USDC_ADDRESS, config.USDC_USD_FEED);
    console.log("✅ Added USDC as supported token");
  }
  
  if (config.USDT_ADDRESS) {
    await marketCore.addSupportedToken(config.USDT_ADDRESS, hre.ethers.ZeroAddress);
    console.log("✅ Added USDT as supported token");
  }

  // Add default categories
  const categories = ["Food & Dining", "Shopping", "Entertainment", "Travel", "Gaming"];
  for (const category of categories) {
    await marketCore.addCategory(category);
  }
  console.log("✅ Added default categories");

  // 7. Register and activate agents
  console.log("\n7️⃣ Setting up agents...");
  
  // Register agents (using deployer as operator for demo)
  await agentCoordinator.registerAgent(0, deployer.address); // MONITORING
  await agentCoordinator.registerAgent(1, deployer.address); // RESTOCKING
  await agentCoordinator.registerAgent(2, deployer.address); // TRADING
  await agentCoordinator.registerAgent(3, deployer.address); // PRICE_DISCOVERY
  console.log("✅ All agents registered");

  // Activate agents
  await agentCoordinator.updateAgentStatus(0, 1); // MONITORING -> ACTIVE
  await agentCoordinator.updateAgentStatus(1, 1); // RESTOCKING -> ACTIVE
  await agentCoordinator.updateAgentStatus(2, 1); // TRADING -> ACTIVE
  await agentCoordinator.updateAgentStatus(3, 1); // PRICE_DISCOVERY -> ACTIVE
  console.log("✅ All agents activated");

  // Set agent parameters
  await agentCoordinator.setAgentParameter(0, "check_interval", hre.ethers.formatBytes32String("300"));
  await agentCoordinator.setAgentParameter(1, "low_stock_threshold", hre.ethers.formatBytes32String("5"));
  await agentCoordinator.setAgentParameter(2, "max_trade_amount", hre.ethers.formatBytes32String("1000"));
  console.log("✅ Agent parameters set");

  // 8. Deployment Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("Network: Base Sepolia");
  console.log("Deployer:", deployer.address);
  console.log("");
  console.log("📋 Contract Addresses:");
  console.log("┌─ ConfidentialGiftCard:", giftCardAddress);
  console.log("├─ PriceOracle:", priceOracleAddress);
  console.log("├─ DGMarketCore:", marketCoreAddress);
  console.log("└─ AgentCoordinator:", agentCoordinatorAddress);
  console.log("");
  console.log("⚙️ Configuration:");
  console.log("├─ Marketplace Fee:", config.MARKETPLACE_FEE / 100, "%");
  console.log("├─ Supported Tokens: USDC, USDT");
  console.log("├─ Price Feeds: USDC/USD, ETH/USD");
  console.log("└─ Categories:", categories.length, "default categories");
  console.log("");
  console.log("🚀 Next Steps:");
  console.log("1. Create Chainlink Functions subscription");
  console.log("2. Fund subscription with LINK tokens");
  console.log("3. Add AgentCoordinator as consumer");
  console.log("4. Test gift card creation and marketplace");
  console.log("5. Set up frontend application");
  console.log("");

  // Save deployment addresses to file
  const deploymentInfo = {
    network: "base-sepolia",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ConfidentialGiftCard: giftCardAddress,
      PriceOracle: priceOracleAddress,
      DGMarketCore: marketCoreAddress,
      AgentCoordinator: agentCoordinatorAddress
    },
    config: {
      USDC_ADDRESS: config.USDC_ADDRESS,
      USDT_ADDRESS: config.USDT_ADDRESS,
      MARKETPLACE_FEE: config.MARKETPLACE_FEE,
      categories: categories
    }
  };

  const fs = require('fs');
  fs.writeFileSync(
    './deployed-contracts.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("💾 Deployment info saved to deployed-contracts.json");

  // Verification info
  console.log("\n🔍 For contract verification, use:");
  console.log(`npx hardhat verify --network base-sepolia ${giftCardAddress}`);
  console.log(`npx hardhat verify --network base-sepolia ${priceOracleAddress}`);
  console.log(`npx hardhat verify --network base-sepolia ${marketCoreAddress} "${giftCardAddress}" ${config.MARKETPLACE_FEE}`);
  console.log(`npx hardhat verify --network base-sepolia ${agentCoordinatorAddress} "${config.FUNCTIONS_ROUTER}" "${marketCoreAddress}" "${priceOracleAddress}" "${config.DON_ID}" ${config.SUBSCRIPTION_ID}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });