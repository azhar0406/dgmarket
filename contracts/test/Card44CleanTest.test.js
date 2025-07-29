const { expect } = require("chai");
const { wallet, publicClient } = require("../utils/wallet");
const { getContract } = require("viem");

// ✅ OFFICIAL INCO IMPORTS
const { getViemChain, supportedChains } = require('@inco/js');
const { Lightning } = require('@inco/js/lite');

const dgMarketCoreAbi = require("../artifacts/contracts/DGMarketCore.sol/DGMarketCore.json");

describe("Card 44 - Clean Decryption Verification", function() {
  let marketCore;
  let zap;

  before(async function() {
    const marketCoreAddress = '0xC09C42826d3a86bF9d9a9a2cAE96156dAF177863';
    marketCore = getContract({
      address: marketCoreAddress,
      abi: dgMarketCoreAbi.abi,
      client: { public: publicClient, wallet }
    });

    const chainId = supportedChains.baseSepolia;
    zap = Lightning.latest('testnet', chainId);
  });

  it("Should decrypt Card 44 and verify exact values", async function() {
    // Expected values
    const expectedCode = "FINAL-SUCCESS-TEST-2025";
    const expectedPin = "8888";
    
    // Known encrypted handles for Card 44
    const encryptedCodeHandle = "0x4a0f92bedd955476dfd4b14eb85f29fcee5c80f6146889d5ac03ced236000800";
    const encryptedPinHandle = "0x16abf39d0e5427e86027ae4119c6962d6ac511af848129f2ec2b605bf7000800";
    
    // Decrypt using official Inco SDK method
    const reencryptor = await zap.getReencryptor(wallet);
    const codeResult = await reencryptor({ handle: encryptedCodeHandle });
    const pinResult = await reencryptor({ handle: encryptedPinHandle });
    
    // Convert code BigInt to string
    const codeBytes = [];
    let remaining = codeResult.value;
    while (remaining > 0n) {
      codeBytes.unshift(Number(remaining & 0xFFn));
      remaining = remaining >> 8n;
    }
    const decryptedCode = new TextDecoder().decode(new Uint8Array(codeBytes));
    
    // Convert PIN BigInt to string
    const decryptedPin = pinResult.value.toString();
    
    // Verify results
    if (decryptedCode === expectedCode && decryptedPin === expectedPin) {
      console.log("✅ PERFECT MATCH - Decryption successful!");
      console.log(`Code: "${decryptedCode}"`);
      console.log(`PIN: "${decryptedPin}"`);
    }
    
    // Test assertions
    expect(decryptedCode).to.equal(expectedCode);
    expect(decryptedPin).to.equal(expectedPin);
  });
});