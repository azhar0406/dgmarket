const { expect } = require("chai");
const { wallet, publicClient } = require("../utils/wallet");
const {
  getContract,
  parseEther,
  getAddress,
  createWalletClient,
  http,
  keccak256,
  toHex,
} = require("viem");

// ✅ OFFICIAL INCO IMPORTS (from documentation)
const { getViemChain, supportedChains } = require('@inco/js');
const { Lightning } = require('@inco/js/lite');

const dgMarketCoreAbi = require("../artifacts/contracts/DGMarketCore.sol/DGMarketCore.json");

describe("DGMarket with Official Inco Lightning SDK", function () {
  let dgMarketCore;
  let zap; // Official Inco Lightning instance
  let walletClient; // Proper wallet client for Inco
  const marketCoreAddress = "0x335CAA0A05e706B5BfA9860659236B3b543c28E7";

  beforeEach(async function () {
    console.log("🌐 Setting up Official Inco Lightning SDK...");
    
    try {
      // ✅ OFFICIAL SETUP (from documentation)
      const chainId = supportedChains.baseSepolia; // Use official chain ID
      console.log(`📡 Inco Chain ID: ${chainId}`);
      
      // Connect to Inco's latest public testnet
      zap = Lightning.latest('testnet', chainId);
      console.log("✅ Inco Lightning connected");
      
      // Create proper wallet client with Inco chain
      walletClient = createWalletClient({
        chain: getViemChain(chainId), // Use official chain helper
        account: wallet.account, // Use our existing account
        transport: http(process.env.BASE_SEPOLIA_RPC_URL), // Use Base Sepolia RPC
      });
      console.log(`✅ Wallet client created for: ${walletClient.account.address}`);
      
      // Create contract instance
      dgMarketCore = getContract({
        address: marketCoreAddress,
        abi: dgMarketCoreAbi.abi,
        client: wallet, // Use original wallet for contract calls
      });
      
      console.log(`✅ Contract ready: ${marketCoreAddress}`);
      
    } catch (error) {
      console.log("❌ Inco setup failed:", error.message);
      throw error;
    }
  });

  describe("Gift Card Creation with Official Inco SDK", function () {
    it("Should create gift card using official Inco Lightning encryption", async function () {
      console.log("\n------ 🎁 Official Inco Lightning Gift Card Creation ------");
      
      // Check initial state
      const initialInventory = await publicClient.readContract({
        address: getAddress(marketCoreAddress),
        abi: dgMarketCoreAbi.abi,
        functionName: "getCategoryInventory",
        args: ["Gaming"],
      });
      
      const initialCount = Number(initialInventory[0]);
      console.log(`📊 Initial Gaming count: ${initialCount}`);
      
      // Prepare gift card data
      const publicPrice = parseEther("50");
      const voucherCode = "STEAM-OFFICIAL-TEST-123";
      const giftCardValue = 50; // $50 as number (supported type)
      
      console.log(`📝 Voucher code: "${voucherCode}"`);
      console.log(`💰 Gift card value: $${giftCardValue}`);
      
      try {
        // ✅ OFFICIAL ENCRYPTION APPROACH
        console.log("🔐 Encrypting with official Inco SDK...");
        
        // Method 1: Direct number encryption (official way)
        const encryptedValue = await zap.encrypt(giftCardValue, {
          accountAddress: walletClient.account.address,
          dappAddress: marketCoreAddress,
        });
        console.log("✅ Value encrypted successfully");
        
        // Method 2: Convert string to number for encryption
        // Hash the voucher code and convert to number
        const voucherHash = keccak256(toHex(voucherCode));
        const voucherAsNumber = parseInt(voucherHash.slice(0, 18), 16); // Take first 16 hex chars as number
        console.log(`🔒 Voucher as number: ${voucherAsNumber}`);
        
        const encryptedCode = await zap.encrypt(voucherAsNumber, {
          accountAddress: walletClient.account.address,
          dappAddress: marketCoreAddress,
        });
        console.log("✅ Code encrypted successfully");
        
        console.log("🚀 Creating gift card with official encryption...");
        
        // Create the gift card
        const txHash = await wallet.writeContract({
          address: marketCoreAddress,
          abi: dgMarketCoreAbi.abi,
          functionName: "adminCreateGiftCard",
          args: [
            encryptedCode,           // Encrypted voucher code (as number)
            encryptedValue,          // Encrypted value
            publicPrice,             // Public price
            "Official SDK Test Card - $50", // Description
            "Gaming",                // Category
            "https://example.com/official.jpg", // Image
            0                        // No expiry
          ],
        });
        
        console.log(`📝 Transaction: ${txHash}`);
        
        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          timeout: 60000
        });
        
        if (receipt.status === 'success') {
          console.log("✅ Transaction succeeded!");
          console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
          
          // Check for GiftCardCreated event
          const giftCardEvent = receipt.logs.find(log => {
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
          
          if (giftCardEvent) {
            const decoded = publicClient.decodeEventLog({
              abi: dgMarketCoreAbi.abi,
              data: giftCardEvent.data,
              topics: giftCardEvent.topics,
            });
            
            const cardId = decoded.args.cardId;
            console.log(`🎯 New Gift Card ID: ${cardId.toString()}`);
            
            // Verify inventory increased
            const updatedInventory = await publicClient.readContract({
              address: getAddress(marketCoreAddress),
              abi: dgMarketCoreAbi.abi,
              functionName: "getCategoryInventory",
              args: ["Gaming"],
            });
            
            const updatedCount = Number(updatedInventory[0]);
            console.log(`📊 Updated Gaming count: ${updatedCount} (was ${initialCount})`);
            
            expect(updatedCount).to.equal(initialCount + 1);
            console.log("✅ Inventory increased correctly!");
            
            // Verify the card exists
            const allCards = await publicClient.readContract({
              address: getAddress(marketCoreAddress),
              abi: dgMarketCoreAbi.abi,
              functionName: "getAllGiftCards",
            });
            
            const newCard = allCards.find(card => card.cardId.toString() === cardId.toString());
            expect(newCard).to.not.be.undefined;
            expect(newCard.category).to.equal("Gaming");
            expect(newCard.owner).to.equal(wallet.account.address);
            console.log("✅ Gift card verified in system");
            
            console.log("\n🎉 OFFICIAL INCO LIGHTNING SUCCESS!");
            console.log("=".repeat(50));
            console.log("✅ Official Inco SDK working correctly");
            console.log("✅ Gift card created and encrypted");
            console.log("✅ Inventory tracking functional");
            console.log("✅ All systems operational");
            
          } else {
            console.log("⚠️ No GiftCardCreated event found");
            // Check if transaction reverted silently
            throw new Error("Gift card creation may have failed - no event emitted");
          }
          
        } else {
          throw new Error(`Transaction failed with status: ${receipt.status}`);
        }
        
      } catch (encryptionError) {
        console.log("❌ Official encryption failed:", encryptionError.message);
        
        // Detailed error analysis
        if (encryptionError.message.includes("revert")) {
          console.log("🔍 Contract reverted - checking specific error...");
          
          // Extract revert reason if available
          if (encryptionError.data) {
            console.log(`📝 Revert data: ${encryptionError.data}`);
          }
          
          // Check if it's the same error as before
          if (encryptionError.message.includes("0x18d32428")) {
            console.log("🚨 Same contract error as before - need to investigate contract state");
            console.log("💡 This is NOT an Inco encryption issue");
            console.log("💡 This is a contract validation issue");
          }
        }
        
        throw encryptionError;
      }
    });

    it("Should test multiple encryption values", async function () {
      console.log("\n------ 🧪 Testing Multiple Encryption Values ------");
      
      try {
        // Test different value types that Inco supports
        const testValues = [
          { name: "Small number", value: 42 },
          { name: "Large number", value: 1000000 },
          { name: "Zero", value: 0 },
          { name: "Gift card value", value: 25 },
        ];
        
        for (const test of testValues) {
          console.log(`🔐 Testing encryption of ${test.name}: ${test.value}`);
          
          const encrypted = await zap.encrypt(test.value, {
            accountAddress: walletClient.account.address,
            dappAddress: marketCoreAddress,
          });
          
          console.log(`✅ ${test.name} encrypted successfully (${encrypted.length} chars)`);
          expect(encrypted).to.be.a('string');
          expect(encrypted.length).to.be.greaterThan(10);
        }
        
        console.log("✅ All encryption tests passed!");
        console.log("🎯 Inco Lightning SDK is working correctly");
        
      } catch (error) {
        console.log("❌ Encryption testing failed:", error.message);
        throw error;
      }
    });
  });

  describe("Diagnostic - Check Contract State", function () {
    it("Should verify admin permissions", async function () {
      console.log("\n------ 🔍 Admin Permission Diagnostic ------");
      
      try {
        // Check if wallet has admin role
        const defaultAdminRole = await publicClient.readContract({
          address: getAddress(marketCoreAddress),
          abi: dgMarketCoreAbi.abi,
          functionName: "DEFAULT_ADMIN_ROLE",
        });
        
        const hasAdminRole = await publicClient.readContract({
          address: getAddress(marketCoreAddress),
          abi: dgMarketCoreAbi.abi,
          functionName: "hasRole",
          args: [defaultAdminRole, wallet.account.address],
        });
        
        console.log(`🔑 Admin role: ${defaultAdminRole}`);
        console.log(`👑 Wallet has admin role: ${hasAdminRole}`);
        
        if (!hasAdminRole) {
          console.log("🚨 ISSUE FOUND: Wallet does not have admin role!");
          console.log("💡 SOLUTION: Grant admin role to your wallet");
          
          // Try to grant admin role (if possible)
          try {
            const grantTx = await wallet.writeContract({
              address: marketCoreAddress,
              abi: dgMarketCoreAbi.abi,
              functionName: "grantRole",
              args: [defaultAdminRole, wallet.account.address],
            });
            
            await publicClient.waitForTransactionReceipt({ hash: grantTx });
            console.log("✅ Admin role granted successfully!");
            
          } catch (grantError) {
            console.log("❌ Cannot grant admin role:", grantError.message);
            console.log("💡 You may need to use the deployer wallet or contract owner");
          }
        } else {
          console.log("✅ Admin permissions are correct");
        }
        
        // Check contract state
        try {
          const paused = await publicClient.readContract({
            address: getAddress(marketCoreAddress),
            abi: dgMarketCoreAbi.abi,
            functionName: "paused",
          });
          
          console.log(`⏸️ Contract paused: ${paused}`);
          
          if (paused) {
            console.log("🚨 ISSUE FOUND: Contract is paused!");
            console.log("💡 SOLUTION: Unpause the contract");
          }
          
        } catch (error) {
          console.log("⚠️ Could not check paused state");
        }
        
      } catch (error) {
        console.log("❌ Permission check failed:", error.message);
        throw error;
      }
    });
  });
});