import { expect } from "chai";
import { namedWallets, wallet, publicClient } from "../utils/wallet";
import {
  Address,
  getContract,
  parseEther,
  formatEther,
  getAddress,
  parseAbiItem,
} from "viem";
import { HexString } from "@inco/js/dist/binary";
// @ts-ignore
import { Lightning } from '@inco/js/lite';

// Import ABIs - adjust paths based on your build output
import confidentialGiftCardAbi from "../artifacts/contracts/ConfidentialGiftCard.sol/ConfidentialGiftCard.json";
import dgMarketCoreAbi from "../artifacts/contracts/DGMarketCore.sol/DGMarketCore.json";
import priceOracleAbi from "../artifacts/contracts/PriceOracle.sol/PriceOracle.json";

describe("DG Market Tests", function () {
  let confidentialGiftCard: any;
  let dgMarketCore: any;
  let priceOracle: any;
  let giftCardAddress: Address;
  let marketCoreAddress: Address;
  let priceOracleAddress: Address;
  let incoConfig: any;
  let reEncryptorForMainWallet: any;
  let reEncryptorForAlice: any;
  let reEncryptorForBob: any;

  beforeEach(async function () {
    const chainId = publicClient.chain.id; // e.g. 84532 or 31337
    console.log("Running on chain:", chainId);
    
    // Initialize Inco Lightning
    if (chainId === 31337) {
      incoConfig = Lightning.localNode(); // Connect to local node
    } else {
      incoConfig = Lightning.latest('testnet', 84532); // Base Sepolia
    }

    // Create re-encryptors for different wallets
    reEncryptorForMainWallet = await incoConfig.getReencryptor(wallet);
    reEncryptorForAlice = await incoConfig.getReencryptor(namedWallets.alice);
    reEncryptorForBob = await incoConfig.getReencryptor(namedWallets.bob);

    console.log("🚀 Deploying contracts...");

    // Deploy ConfidentialGiftCard
    const giftCardTxHash = await wallet.deployContract({
      abi: confidentialGiftCardAbi.abi,
      bytecode: confidentialGiftCardAbi.bytecode as HexString,
      args: [],
    });

    const giftCardReceipt = await publicClient.waitForTransactionReceipt({
      hash: giftCardTxHash,
    });
    giftCardAddress = giftCardReceipt.contractAddress as Address;
    console.log(`✅ ConfidentialGiftCard deployed at: ${giftCardAddress}`);

    // Deploy PriceOracle
    const priceOracleTxHash = await wallet.deployContract({
      abi: priceOracleAbi.abi,
      bytecode: priceOracleAbi.bytecode as HexString,
      args: [],
    });

    const priceOracleReceipt = await publicClient.waitForTransactionReceipt({
      hash: priceOracleTxHash,
    });
    priceOracleAddress = priceOracleReceipt.contractAddress as Address;
    console.log(`✅ PriceOracle deployed at: ${priceOracleAddress}`);

    // Deploy DGMarketCore
    const marketplaceFee = 250; // 2.5%
    const marketCoreTxHash = await wallet.deployContract({
      abi: dgMarketCoreAbi.abi,
      bytecode: dgMarketCoreAbi.bytecode as HexString,
      args: [giftCardAddress, marketplaceFee],
    });

    const marketCoreReceipt = await publicClient.waitForTransactionReceipt({
      hash: marketCoreTxHash,
    });
    marketCoreAddress = marketCoreReceipt.contractAddress as Address;
    console.log(`✅ DGMarketCore deployed at: ${marketCoreAddress}`);

    // Create contract instances
    confidentialGiftCard = getContract({
      address: giftCardAddress as HexString,
      abi: confidentialGiftCardAbi.abi,
      client: wallet,
    });

    dgMarketCore = getContract({
      address: marketCoreAddress as HexString,
      abi: dgMarketCoreAbi.abi,
      client: wallet,
    });

    priceOracle = getContract({
      address: priceOracleAddress as HexString,
      abi: priceOracleAbi.abi,
      client: wallet,
    });

    // Fund named wallets if needed
    for (const [name, userWallet] of Object.entries(namedWallets)) {
      const balance = await publicClient.getBalance({
        address: userWallet.account.address,
      });
      const balanceEth = Number(formatEther(balance));

      if (balanceEth < 0.001) {
        const neededEth = 0.001 - balanceEth;
        console.log(`💰 Funding ${name} with ${neededEth.toFixed(6)} ETH...`);
        const tx = await wallet.sendTransaction({
          to: userWallet.account.address,
          value: parseEther(neededEth.toFixed(6)),
        });

        await publicClient.waitForTransactionReceipt({ hash: tx });
        console.log(`✅ ${name} funded: ${userWallet.account.address}`);
      }
    }

    console.log("✅ Setup complete!");
  });

  describe("Gift Card Creation", function () {
    it("Should create a gift card with encrypted value", async function () {
      console.log("\n------ 🎁 Creating Gift Card ------");
      
      const giftCardValue = parseEther("100"); // $100 worth
      
      // Encrypt the gift card value
      const encryptedValue = await incoConfig.encrypt(giftCardValue, {
        accountAddress: wallet.account.address,
        dappAddress: giftCardAddress
      });
      console.log("✅ Gift card value encrypted");
      
      // Create gift card
      const txHash = await wallet.writeContract({
        address: giftCardAddress,
        abi: confidentialGiftCardAbi.abi,
        functionName: "createGiftCard",
        args: [
          encryptedValue,
          "Amazon Gift Card - $100",
          "https://example.com/amazon.jpg",
          0 // No expiry
        ],
      });
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log("✅ Gift card created successfully");
      
      // Get the created card ID from events
      const giftCardCreatedEvent = receipt.logs.find(log => {
        try {
          const decoded = publicClient.decodeEventLog({
            abi: confidentialGiftCardAbi.abi,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === "GiftCardCreated";
        } catch {
          return false;
        }
      });
      
      expect(giftCardCreatedEvent).to.not.be.undefined;
      
      // Extract cardId from the event
      const decoded = publicClient.decodeEventLog({
        abi: confidentialGiftCardAbi.abi,
        data: giftCardCreatedEvent!.data,
        topics: giftCardCreatedEvent!.topics,
      });
      
      const cardId = (decoded.args as any).cardId;
      console.log("🎯 Gift Card ID:", cardId.toString());
      
      // Verify ownership
      const ownerAddress = await publicClient.readContract({
        address: getAddress(giftCardAddress),
        abi: confidentialGiftCardAbi.abi,
        functionName: "getGiftCardOwner",
        args: [cardId],
      });
      expect(ownerAddress).to.equal(wallet.account.address);
      
      // Get encrypted value handle and decrypt
      const encryptedHandle = await publicClient.readContract({
        address: getAddress(giftCardAddress),
        abi: confidentialGiftCardAbi.abi,
        functionName: "giftCardValueOf",
        args: [cardId],
      }) as HexString;
      
      // Wait for covalidator
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const decryptedValue = await reEncryptorForMainWallet({
        handle: encryptedHandle.toString()
      });
      
      console.log("🎯 Decrypted Gift Card Value:", formatEther(decryptedValue.value));
      expect(decryptedValue.value).to.equal(giftCardValue);
    });
  });

  describe("Gift Card Balance Operations", function () {
    let cardId: bigint;
    
    beforeEach(async function () {
      // Create a gift card first
      const giftCardValue = parseEther("50");
      const encryptedValue = await incoConfig.encrypt(giftCardValue, {
        accountAddress: wallet.account.address,
        dappAddress: giftCardAddress
      });
      
      const txHash = await wallet.writeContract({
        address: giftCardAddress,
        abi: confidentialGiftCardAbi.abi,
        functionName: "createGiftCard",
        args: [
          encryptedValue,
          "Steam Gift Card - $50",
          "https://example.com/steam.jpg",
          0
        ],
      });
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      // Extract cardId from event
      const giftCardCreatedEvent = receipt.logs.find(log => {
        try {
          const decoded = publicClient.decodeEventLog({
            abi: confidentialGiftCardAbi.abi,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === "GiftCardCreated";
        } catch {
          return false;
        }
      });
      
      const decoded = publicClient.decodeEventLog({
        abi: confidentialGiftCardAbi.abi,
        data: giftCardCreatedEvent!.data,
        topics: giftCardCreatedEvent!.topics,
      });
      
      cardId = (decoded.args as any).cardId;
    });

    it("Should redeem gift card and add to balance", async function () {
      console.log("\n------ 💰 Redeeming Gift Card ------");
      
      // Get initial balance handle
      const initialBalanceHandle = await publicClient.readContract({
        address: getAddress(giftCardAddress),
        abi: confidentialGiftCardAbi.abi,
        functionName: "balanceOf",
        args: [wallet.account.address],
      }) as HexString;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const initialBalance = await reEncryptorForMainWallet({
        handle: initialBalanceHandle.toString()
      });
      
      console.log("Initial balance:", formatEther(initialBalance.value));
      
      // Redeem gift card
      const txHash = await wallet.writeContract({
        address: giftCardAddress,
        abi: confidentialGiftCardAbi.abi,
        functionName: "redeemGiftCard",
        args: [cardId],
      });
      
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log("✅ Gift card redeemed");
      
      // Check updated balance
      const newBalanceHandle = await publicClient.readContract({
        address: getAddress(giftCardAddress),
        abi: confidentialGiftCardAbi.abi,
        functionName: "balanceOf",
        args: [wallet.account.address],
      }) as HexString;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newBalance = await reEncryptorForMainWallet({
        handle: newBalanceHandle.toString()
      });
      
      console.log("New balance:", formatEther(newBalance.value));
      
      // Balance should have increased by gift card value
      const expectedBalance = initialBalance.value + parseEther("50");
      expect(newBalance.value).to.equal(expectedBalance);
    });
  });

  describe("Marketplace Operations", function () {
    it("Should add supported tokens and categories", async function () {
      console.log("\n------ 🏪 Setting up Marketplace ------");
      
      // Add a mock USDC token
      const mockUSDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
      const mockPriceFeed = "0x0000000000000000000000000000000000000000"; // Zero address for no price feed
      
      const txHash = await wallet.writeContract({
        address: marketCoreAddress,
        abi: dgMarketCoreAbi.abi,
        functionName: "addSupportedToken",
        args: [mockUSDC, mockPriceFeed],
      });
      
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log("✅ Added USDC as supported token");
      
      // Check if token is supported
      const isSupported = await publicClient.readContract({
        address: getAddress(marketCoreAddress),
        abi: dgMarketCoreAbi.abi,
        functionName: "supportedTokens",
        args: [mockUSDC],
      });
      expect(isSupported).to.be.true;
      
      // Add categories
      const categoryTx1 = await wallet.writeContract({
        address: marketCoreAddress,
        abi: dgMarketCoreAbi.abi,
        functionName: "addCategory",
        args: ["Food & Dining"],
      });
      await publicClient.waitForTransactionReceipt({ hash: categoryTx1 });
      
      const categoryTx2 = await wallet.writeContract({
        address: marketCoreAddress,
        abi: dgMarketCoreAbi.abi,
        functionName: "addCategory",
        args: ["Gaming"],
      });
      await publicClient.waitForTransactionReceipt({ hash: categoryTx2 });
      console.log("✅ Added categories");
      
      // Get categories
      const categories = await publicClient.readContract({
        address: getAddress(marketCoreAddress),
        abi: dgMarketCoreAbi.abi,
        functionName: "getCategories",
        args: [],
      }) as string[];
      
      expect(categories).to.include("Food & Dining");
      expect(categories).to.include("Gaming");
    });
  });

  describe("Admin Decryption", function () {
    it("Should request balance decryption (admin only)", async function () {
      console.log("\n------ 🔑 Testing Admin Decryption ------");
      
      // First create and redeem a gift card for Alice to have some balance
      const giftCardValue = parseEther("25");
      const encryptedValue = await incoConfig.encrypt(giftCardValue, {
        accountAddress: namedWallets.alice.account.address,
        dappAddress: giftCardAddress
      });
      
      // Create gift card as Alice
      const aliceGiftCard = getContract({
        address: giftCardAddress as HexString,
        abi: confidentialGiftCardAbi.abi,
        client: namedWallets.alice,
      });
      
      const createTxHash = await namedWallets.alice.writeContract({
        address: giftCardAddress,
        abi: confidentialGiftCardAbi.abi,
        functionName: "createGiftCard",
        args: [
          encryptedValue,
          "Test Card",
          "",
          0
        ],
      });
      
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTxHash });
      
      // Extract cardId from event
      const giftCardCreatedEvent = createReceipt.logs.find(log => {
        try {
          const decoded = publicClient.decodeEventLog({
            abi: confidentialGiftCardAbi.abi,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === "GiftCardCreated";
        } catch {
          return false;
        }
      });
      
      const decoded = publicClient.decodeEventLog({
        abi: confidentialGiftCardAbi.abi,
        data: giftCardCreatedEvent!.data,
        topics: giftCardCreatedEvent!.topics,
      });
      
      const cardId = (decoded.args as any).cardId;
      
      // Alice redeems the gift card
      const redeemTxHash = await namedWallets.alice.writeContract({
        address: giftCardAddress,
        abi: confidentialGiftCardAbi.abi,
        functionName: "redeemGiftCard",
        args: [cardId],
      });
      await publicClient.waitForTransactionReceipt({ hash: redeemTxHash });
      
      // Owner requests decryption of Alice's balance
      const decryptTxHash = await wallet.writeContract({
        address: giftCardAddress,
        abi: confidentialGiftCardAbi.abi,
        functionName: "requestUserBalanceDecryption",
        args: [namedWallets.alice.account.address],
      });
      
      await publicClient.waitForTransactionReceipt({ hash: decryptTxHash });
      console.log("✅ Decryption request sent");
      
      // Wait for the decryption callback event
      const eventPromise = new Promise((resolve, reject) => {
        const unwatch = publicClient.watchEvent({
          address: getAddress(giftCardAddress),
          event: parseAbiItem(
            "event UserBalanceDecrypted(address indexed user, uint256 decryptedAmount)"
          ),
          onLogs: (logs) => {
            console.log("📢 UserBalanceDecrypted event detected:", logs);

            if (logs.length > 0) {
              // Extract decrypted balance from the event
              const log = logs[0];
              const decoded = publicClient.decodeEventLog({
                abi: confidentialGiftCardAbi.abi,
                data: log.data,
                topics: log.topics,
              });
              
              const decryptedAmount = (decoded.args as any).decryptedAmount;
              console.log("🎯 Decrypted Amount:", formatEther(decryptedAmount));
              resolve(decryptedAmount);
            }
          },
          onError: (error) => {
            console.error("❌ Error watching event:", error.message);
            reject(error);
          },
        });
        
        setTimeout(() => {
          unwatch();
          reject(new Error("⏳ Event not detected within timeout"));
        }, 20000); // Timeout after 20 seconds
      });
      
      const decryptedAmount = await eventPromise;
      expect(decryptedAmount).to.equal(giftCardValue);
    });
  });
});