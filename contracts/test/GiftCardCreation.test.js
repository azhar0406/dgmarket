const { expect } = require("chai");
const { namedWallets, wallet, publicClient } = require("../utils/wallet");
const {
  getContract,
  parseEther,
  formatEther,
  getAddress,
} = require("viem");
const { Lightning } = require('@inco/js/lite');

// Import ABIs
const dgMarketCoreAbi = require("../artifacts/contracts/DGMarketCore.sol/DGMarketCore.json");

describe("DGMarket Gift Card Creation Test", function () {
  let dgMarketCore;
  let marketCoreAddress;
  let incoConfig;

  // Use existing deployed contract
  const EXISTING_CORE_ADDRESS = "0x335CAA0A05e706B5BfA9860659236B3b543c28E7";

  beforeEach(async function () {
    const chainId = publicClient.chain.id;
    console.log("🌐 Running on chain:", chainId);
    
    // Initialize Inco Lightning for Base Sepolia
    console.log("🔧 Initializing Inco Lightning for Base Sepolia...");
    incoConfig = Lightning.latest('testnet', 84532); // Base Sepolia
    
    console.log("🔄 Using existing deployed contract...");
    marketCoreAddress = EXISTING_CORE_ADDRESS;
    
    // Create contract instance
    dgMarketCore = getContract({
      address: marketCoreAddress,
      abi: dgMarketCoreAbi.abi,
      client: wallet,
    });

    console.log(`✅ DGMarketCore contract ready: ${marketCoreAddress}`);
  });

  describe("Gift Card Creation with Inco Lightning", function () {
    it("Should create gift card with proper Inco Lightning encryption", async function () {
      console.log("\n------ 🎁 Testing Gift Card Creation with Inco Lightning ------");
      
      // Step 1: Check initial category inventory
      console.log("📊 Checking initial Gaming inventory...");
      const initialInventory = await publicClient.readContract({
        address: getAddress(marketCoreAddress),
        abi: dgMarketCoreAbi.abi,
        functionName: "getCategoryInventory",
        args: ["Gaming"],
      });
      
      const initialCount = Number(initialInventory[0]);
      const threshold = Number(initialInventory[1]);
      const isActive = initialInventory[2];
      
      console.log(`🎯 Initial Gaming inventory: count=${initialCount}, threshold=${threshold}, active=${isActive}`);
      expect(isActive).to.be.true; // Category should be active from your manual setup
      
      // Step 2: Prepare gift card data
      const giftCardValue = parseEther("50"); // $50 worth
      const publicPrice = parseEther("50");   // Public price $50
      const voucherCode = "STEAM-GIFT-12345"; // The actual voucher code
      
      console.log("🔐 Encrypting gift card data with Inco Lightning...");
      
      try {
        // Step 3: Encrypt the voucher code and value using Inco Lightning
        const encryptedCode = await incoConfig.encrypt(voucherCode, {
          accountAddress: wallet.account.address,
          dappAddress: marketCoreAddress
        });
        
        const encryptedValue = await incoConfig.encrypt(giftCardValue.toString(), {
          accountAddress: wallet.account.address,
          dappAddress: marketCoreAddress
        });
        
        console.log("✅ Gift card data encrypted successfully");
        console.log(`📋 Encrypted code length: ${encryptedCode.length} bytes`);
        console.log(`📋 Encrypted value length: ${encryptedValue.length} bytes`);
        
        // Step 4: Create the gift card
        console.log("🚀 Creating gift card with encrypted data...");
        
        const txHash = await wallet.writeContract({
          address: marketCoreAddress,
          abi: dgMarketCoreAbi.abi,
          functionName: "adminCreateGiftCard",
          args: [
            encryptedCode,           // bytes encryptedCodeInput
            encryptedValue,          // bytes encryptedValueInput  
            publicPrice,             // uint256 publicPrice
            "Steam Gift Card - $50", // string description
            "Gaming",                // string category
            "https://example.com/steam.jpg", // string imageUrl
            0                        // uint256 expiryDate (0 = no expiry)
          ],
        });
        
        console.log(`📝 Transaction hash: ${txHash}`);
        
        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          timeout: 60000 // 60 second timeout
        });
        
        console.log("✅ Gift card creation transaction confirmed");
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        
        // Step 5: Verify the gift card was created
        console.log("🔍 Verifying gift card creation...");
        
        // Check for GiftCardCreated event
        const giftCardCreatedEvent = receipt.logs.find(log => {
          try {
            const decoded = publicClient.decodeEventLog({
              abi: dgMarketCoreAbi.abi,
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === "GiftCardCreated";
          } catch {
            return false;
          }
        });
        
        if (giftCardCreatedEvent) {
          const decoded = publicClient.decodeEventLog({
            abi: dgMarketCoreAbi.abi,
            data: giftCardCreatedEvent.data,
            topics: giftCardCreatedEvent.topics,
          });
          
          const cardId = decoded.args.cardId;
          console.log(`🎯 New Gift Card ID: ${cardId.toString()}`);
          
          // Verify the card exists in getAllGiftCards
          const allCards = await publicClient.readContract({
            address: getAddress(marketCoreAddress),
            abi: dgMarketCoreAbi.abi,
            functionName: "getAllGiftCards",
          });
          
          const newCard = allCards.find(card => card.cardId.toString() === cardId.toString());
          expect(newCard).to.not.be.undefined;
          expect(newCard.publicPrice).to.equal(publicPrice);
          expect(newCard.category).to.equal("Gaming");
          expect(newCard.description).to.equal("Steam Gift Card - $50");
          expect(newCard.owner).to.equal(wallet.account.address);
          expect(newCard.isActive).to.be.true;
          expect(newCard.isRevealed).to.be.false;
          
          console.log("✅ Gift card data verified in getAllGiftCards()");
          
        } else {
          console.log("⚠️ GiftCardCreated event not found in transaction logs");
          // Still check if cards increased
        }
        
        // Step 6: Verify category inventory increased
        console.log("📊 Checking updated Gaming inventory...");
        const updatedInventory = await publicClient.readContract({
          address: getAddress(marketCoreAddress),
          abi: dgMarketCoreAbi.abi,
          functionName: "getCategoryInventory",
          args: ["Gaming"],
        });
        
        const updatedCount = Number(updatedInventory[0]);
        console.log(`🎯 Updated Gaming inventory: count=${updatedCount}, expected=${initialCount + 1}`);
        
        expect(updatedCount).to.equal(initialCount + 1);
        console.log("✅ Gaming inventory count increased correctly");
        
        // Step 7: Verify in user's owned cards
        console.log("👤 Checking user's owned cards...");
        const myCards = await publicClient.readContract({
          address: getAddress(marketCoreAddress),
          abi: dgMarketCoreAbi.abi,
          functionName: "getMyGiftCards",
        });
        
        const userCardCount = myCards.length;
        console.log(`🎯 User now owns ${userCardCount} gift cards`);
        expect(userCardCount).to.be.greaterThan(0);
        
        // Find our newly created card
        const ourCard = myCards.find(card => 
          card.category === "Gaming" && 
          card.description === "Steam Gift Card - $50"
        );
        expect(ourCard).to.not.be.undefined;
        console.log("✅ New gift card found in user's owned cards");
        
        console.log("\n🎉 GIFT CARD CREATION TEST COMPLETED SUCCESSFULLY!");
        console.log("=".repeat(60));
        console.log("✅ Inco Lightning encryption working");
        console.log("✅ adminCreateGiftCard function working");  
        console.log("✅ Category inventory updating correctly");
        console.log("✅ Gift card ownership tracking working");
        console.log("✅ All view functions returning correct data");
        
      } catch (encryptionError) {
        console.log("❌ Inco Lightning encryption failed:", encryptionError.message);
        
        // If encryption fails, try with dummy data to test the contract function
        console.log("🔄 Falling back to dummy encrypted data for contract testing...");
        
        try {
          const dummyEncryptedCode = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
          const dummyEncryptedValue = "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321";
          
          const txHash = await wallet.writeContract({
            address: marketCoreAddress,
            abi: dgMarketCoreAbi.abi,
            functionName: "adminCreateGiftCard",
            args: [
              dummyEncryptedCode,
              dummyEncryptedValue,
              publicPrice,
              "Test Gift Card - $50",
              "Gaming",
              "https://example.com/test.jpg",
              0
            ],
          });
          
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
          console.log("✅ Contract function works with dummy data");
          console.log("⚠️ Issue is specifically with Inco Lightning encryption");
          
        } catch (contractError) {
          console.log("❌ Contract function also failed:", contractError.message);
          throw contractError;
        }
        
        throw encryptionError;
      }
    });

    it("Should verify categories are properly configured", async function () {
      console.log("\n------ 📊 Verifying Category Configuration ------");
      
      const categories = ["Gaming", "Shopping"];
      
      for (const category of categories) {
        const inventory = await publicClient.readContract({
          address: getAddress(marketCoreAddress),
          abi: dgMarketCoreAbi.abi,
          functionName: "getCategoryInventory",
          args: [category],
        });
        
        const count = Number(inventory[0]);
        const threshold = Number(inventory[1]);
        const isActive = inventory[2];
        
        console.log(`📋 ${category}: count=${count}, threshold=${threshold}, active=${isActive}`);
        
        expect(isActive).to.be.true;
        expect(threshold).to.be.greaterThan(0);
      }
      
      console.log("✅ All configured categories are active with proper thresholds");
    });

    it("Should verify role configuration", async function () {
      console.log("\n------ 🔐 Verifying Role Configuration ------");
      
      try {
        // Get AUTOMATION_ROLE hash
        const automationRoleHash = await publicClient.readContract({
          address: getAddress(marketCoreAddress),
          abi: dgMarketCoreAbi.abi,
          functionName: "AUTOMATION_ROLE",
        });
        
        console.log(`🔑 AUTOMATION_ROLE hash: ${automationRoleHash}`);
        
        // Check if ChainlinkManager has AUTOMATION_ROLE
        const chainlinkManagerAddress = "0xbCB860Da2A0120a1e39A0FeD835D6A9cAC16235a";
        const hasRole = await publicClient.readContract({
          address: getAddress(marketCoreAddress),
          abi: dgMarketCoreAbi.abi,
          functionName: "hasRole",
          args: [automationRoleHash, chainlinkManagerAddress],
        });
        
        console.log(`🎯 ChainlinkManager has AUTOMATION_ROLE: ${hasRole}`);
        expect(hasRole).to.be.true;
        
        console.log("✅ Role configuration verified successfully");
        
      } catch (error) {
        console.log("⚠️ Role verification failed:", error.message);
        throw error;
      }
    });
  });
});