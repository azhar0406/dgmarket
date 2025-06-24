const { expect } = require("chai");
const { ethers } = require("hardhat");
const { Lightning } = require('@inco/js/lite');

describe("DG Market Tests", function () {
  let giftCardContract;
  let marketCore;
  let priceOracle;
  let owner, alice, bob;
  let incoConfig;
  let reEncryptorForOwner, reEncryptorForAlice, reEncryptorForBob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    
    const chainId = await owner.provider.getNetwork().then(n => n.chainId);
    console.log("Running on chain:", chainId);
    
    // Initialize Inco Lightning
    if (chainId === 31337n) {
      incoConfig = Lightning.localNode();
    } else {
      incoConfig = Lightning.latest('testnet', Number(chainId));
    }

    reEncryptorForOwner = await incoConfig.getReencryptor(owner);
    reEncryptorForAlice = await incoConfig.getReencryptor(alice);
    reEncryptorForBob = await incoConfig.getReencryptor(bob);

    // Deploy contracts
    console.log("🚀 Deploying contracts...");
    
    // Deploy ConfidentialGiftCard
    const ConfidentialGiftCard = await ethers.getContractFactory("ConfidentialGiftCard");
    giftCardContract = await ConfidentialGiftCard.deploy();
    await giftCardContract.waitForDeployment();
    
    // Deploy PriceOracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy();
    await priceOracle.waitForDeployment();
    
    // Deploy DGMarketCore
    const DGMarketCore = await ethers.getContractFactory("DGMarketCore");
    marketCore = await DGMarketCore.deploy(
      await giftCardContract.getAddress(),
      250 // 2.5% fee
    );
    await marketCore.waitForDeployment();

    console.log("✅ Contracts deployed successfully");
    
    // Fund test accounts
    const accounts = [alice, bob];
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const balance = await ethers.provider.getBalance(account.address);
      const balanceEth = Number(ethers.formatEther(balance));

      if (balanceEth < 0.001) {
        const neededEth = 0.001 - balanceEth;
        console.log(`💰 Funding account ${i + 1} with ${neededEth.toFixed(6)} ETH...`);
        
        const tx = await owner.sendTransaction({
          to: account.address,
          value: ethers.parseEther(neededEth.toFixed(6))
        });
        await tx.wait();
        console.log(`✅ Account ${i + 1} funded: ${account.address}`);
      }
    }
  });

  describe("Gift Card Creation", function () {
    it("Should create a gift card with encrypted value", async function () {
      console.log("\n------ 🎁 Creating Gift Card ------");
      
      const giftCardValue = ethers.parseEther("100"); // $100 worth
      
      // Encrypt the gift card value
      const encryptedValue = await incoConfig.encrypt(giftCardValue, {
        accountAddress: owner.address,
        dappAddress: await giftCardContract.getAddress()
      });
      
      // Create gift card
      const tx = await giftCardContract.createGiftCard(
        encryptedValue,
        "Amazon Gift Card - $100",
        "https://example.com/amazon.jpg",
        0 // No expiry
      );
      
      const receipt = await tx.wait();
      console.log("✅ Gift card created successfully");
      
      // Get the created card ID from events
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === "GiftCardCreated"
      );
      expect(event).to.not.be.undefined;
      
      const cardId = event.args[0];
      console.log("🎯 Gift Card ID:", cardId.toString());
      
      // Verify ownership
      const owner_address = await giftCardContract.getGiftCardOwner(cardId);
      expect(owner_address).to.equal(owner.address);
      
      // Get encrypted value handle and decrypt
      const encryptedHandle = await giftCardContract.giftCardValueOf(cardId);
      
      // Wait for covalidator
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const decryptedValue = await reEncryptorForOwner({
        handle: encryptedHandle.toString()
      });
      
      console.log("🎯 Decrypted Gift Card Value:", ethers.formatEther(decryptedValue.value));
      expect(decryptedValue.value).to.equal(giftCardValue);
    });
  });

  describe("Gift Card Redemption", function () {
    let cardId;
    
    beforeEach(async function () {
      // Create a gift card first
      const giftCardValue = ethers.parseEther("50");
      const encryptedValue = await incoConfig.encrypt(giftCardValue, {
        accountAddress: owner.address,
        dappAddress: await giftCardContract.getAddress()
      });
      
      const tx = await giftCardContract.createGiftCard(
        encryptedValue,
        "Steam Gift Card - $50",
        "https://example.com/steam.jpg",
        0
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === "GiftCardCreated"
      );
      cardId = event.args[0];
    });

    it("Should redeem gift card and add to balance", async function () {
      console.log("\n------ 💰 Redeeming Gift Card ------");
      
      // Get initial balance
      const initialBalanceHandle = await giftCardContract.balanceOf(owner.address);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const initialBalance = await reEncryptorForOwner({
        handle: initialBalanceHandle.toString()
      });
      
      console.log("Initial balance:", ethers.formatEther(initialBalance.value));
      
      // Redeem gift card
      const tx = await giftCardContract.redeemGiftCard(cardId);
      await tx.wait();
      console.log("✅ Gift card redeemed");
      
      // Check updated balance
      const newBalanceHandle = await giftCardContract.balanceOf(owner.address);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newBalance = await reEncryptorForOwner({
        handle: newBalanceHandle.toString()
      });
      
      console.log("New balance:", ethers.formatEther(newBalance.value));
      
      // Balance should have increased by gift card value
      const expectedBalance = initialBalance.value + ethers.parseEther("50");
      expect(newBalance.value).to.equal(expectedBalance);
    });
  });

  describe("Marketplace Operations", function () {
    it("Should add supported tokens and categories", async function () {
      console.log("\n------ 🏪 Setting up Marketplace ------");
      
      // Add a mock USDC token
      const mockUSDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
      
      await marketCore.addSupportedToken(mockUSDC, ethers.ZeroAddress);
      console.log("✅ Added USDC as supported token");
      
      // Check if token is supported
      const isSupported = await marketCore.supportedTokens(mockUSDC);
      expect(isSupported).to.be.true;
      
      // Add categories
      await marketCore.addCategory("Food & Dining");
      await marketCore.addCategory("Gaming");
      console.log("✅ Added categories");
      
      // Get categories
      const categories = await marketCore.getCategories();
      expect(categories).to.include("Food & Dining");
      expect(categories).to.include("Gaming");
    });
  });

  describe("Admin Functions", function () {
    it("Should request balance decryption (admin only)", async function () {
      console.log("\n------ 🔑 Testing Admin Decryption ------");
      
      // First create and redeem a gift card to have some balance
      const giftCardValue = ethers.parseEther("25");
      const encryptedValue = await incoConfig.encrypt(giftCardValue, {
        accountAddress: alice.address,
        dappAddress: await giftCardContract.getAddress()
      });
      
      // Connect as Alice to create gift card
      const tx1 = await giftCardContract.connect(alice).createGiftCard(
        encryptedValue,
        "Test Card",
        "",
        0
      );
      const receipt1 = await tx1.wait();
      const event1 = receipt1.logs.find(log => 
        log.fragment && log.fragment.name === "GiftCardCreated"
      );
      const cardId = event1.args[0];
      
      // Alice redeems the gift card
      await giftCardContract.connect(alice).redeemGiftCard(cardId);
      
      // Owner requests decryption of Alice's balance
      const tx2 = await giftCardContract.requestUserBalanceDecryption(alice.address);
      const receipt2 = await tx2.wait();
      console.log("✅ Decryption request sent");
      
      // Wait for the decryption callback event
      const eventPromise = new Promise((resolve, reject) => {
        const filter = giftCardContract.filters.UserBalanceDecrypted(alice.address);
        
        giftCardContract.once(filter, (user, decryptedAmount, event) => {
          console.log("📢 UserBalanceDecrypted event:", {
            user,
            decryptedAmount: ethers.formatEther(decryptedAmount)
          });
          resolve(decryptedAmount);
        });
        
        setTimeout(() => {
          reject(new Error("⏳ Event not detected within timeout"));
        }, 10000);
      });
      
      const decryptedAmount = await eventPromise;
      expect(decryptedAmount).to.equal(giftCardValue);
    });
  });
});