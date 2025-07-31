// incoEncryption.js - FIXED to match working test pattern exactly

// ✅ CORRECT IMPORTS - Same as working test
import { getViemChain, supportedChains } from '@inco/js';
import { Lightning } from '@inco/js/lite';

// =============================================================================
// GLOBAL ZAP INSTANCE - Initialize once like in working test
// =============================================================================
let zapInstance = null;

const initializeZap = () => {
  if (!zapInstance) {
    try {
      const chainId = supportedChains.baseSepolia;
      zapInstance = Lightning.latest('testnet', chainId);
      console.log('✅ Zap initialized successfully');
      console.log('Chain ID:', chainId);
    } catch (error) {
      console.error('❌ Failed to initialize Zap:', error);
      throw error;
    }
  }
  return zapInstance;
};

// =============================================================================
// GET INCO CONFIG - Simple getter for zap instance
// =============================================================================
export const getIncoConfig = () => {
  return initializeZap();
};

// =============================================================================
// DECRYPT VALUE - Following EXACT official docs pattern
// =============================================================================
export const decryptValue = async ({ walletClient, handle, valueType }) => {
  try {
    console.log(`🔓 Decrypting ${valueType} from handle: ${handle.substring(0, 20)}...`);
    
    // Get the zap instance
    const zap = initializeZap();
    console.log('📡 Got zap instance:', !!zap);
    
    // Create reencryptor - EXACT pattern from official docs
    console.log('👤 Creating reencryptor with walletClient:', {
      account: walletClient.account?.address,
      chain: walletClient.chain?.id
    });
    
    const reencryptor = await zap.getReencryptor(walletClient);
    console.log('✅ Reencryptor created successfully');
    
    // Decrypt using EXACT official pattern
    console.log('🔓 Calling reencryptor with handle...');
    const resultPlaintext = await reencryptor({ handle: handle });
    
    console.log('✅ Raw decryption result:', resultPlaintext);
    console.log('🔢 Decrypted value (BigInt):', resultPlaintext.value);
    
    // Convert based on value type - same as working test
    if (valueType === 'code') {
      const decryptedCode = convertBigIntToString(resultPlaintext.value);
      console.log(`✅ Decrypted ${valueType}:`, decryptedCode);
      return decryptedCode;
    } else if (valueType === 'pin') {
      const decryptedPin = convertBigIntToNumber(resultPlaintext.value);
      console.log(`✅ Decrypted ${valueType}:`, decryptedPin);
      return decryptedPin;
    }
    
    // Default: return as string
    const result = resultPlaintext.value.toString();
    console.log(`✅ Decrypted ${valueType} (default):`, result);
    return result;
    
  } catch (error) {
    console.error(`❌ Decryption error for ${valueType}:`, error);
    throw new Error(`Failed to decrypt ${valueType}: ${error.message}`);
  }
};

// =============================================================================
// CONVERT BIGINT TO STRING - Exact same as working test
// =============================================================================
export const convertBigIntToString = (bigIntValue) => {
  try {
    const codeBytes = [];
    let remaining = bigIntValue;
    
    while (remaining > 0n) {
      codeBytes.unshift(Number(remaining & 0xFFn));
      remaining = remaining >> 8n;
    }
    
    const decryptedString = new TextDecoder().decode(new Uint8Array(codeBytes));
    console.log('✅ BigInt to string conversion:', decryptedString);
    
    return decryptedString;
  } catch (error) {
    console.error('❌ BigInt to string conversion failed:', error);
    throw error;
  }
};

// =============================================================================
// CONVERT BIGINT TO NUMBER STRING - For PINs
// =============================================================================
export const convertBigIntToNumber = (bigIntValue) => {
  try {
    const numberString = bigIntValue.toString();
    console.log('✅ BigInt to number conversion:', numberString);
    
    return numberString;
  } catch (error) {
    console.error('❌ BigInt to number conversion failed:', error);
    throw error;
  }
};

// =============================================================================
// DIRECT DECRYPTION - Following working test pattern exactly
// =============================================================================
export const decryptHandleDirect = async (handle, walletClient) => {
  try {
    console.log('🔓 Direct decryption starting...');
    console.log('Handle:', handle);
    console.log('WalletClient account:', walletClient.account?.address);
    
    // Initialize zap exactly like working test
    const zap = initializeZap();
    
    // Get reencryptor exactly like working test and official docs
    const reencryptor = await zap.getReencryptor(walletClient);
    
    // Decrypt exactly like official docs pattern
    const result = await reencryptor({ handle: handle });
    
    console.log('✅ Direct decryption successful!');
    console.log('Raw result:', result);
    console.log('Value:', result.value);
    
    return result;
  } catch (error) {
    console.error('❌ Direct decryption failed:', error);
    throw error;
  }
};

// =============================================================================
// TEST WITH KNOWN CARD 44 DATA - For verification
// =============================================================================
export const testDecryptionWithCard44 = async (walletClient) => {
  try {
    console.log('🧪 Testing decryption with Card 44 known data...');
    
    // Known handles from working test
    const encryptedCodeHandle = "0x4a0f92bedd955476dfd4b14eb85f29fcee5c80f6146889d5ac03ced236000800";
    const encryptedPinHandle = "0x16abf39d0e5427e86027ae4119c6962d6ac511af848129f2ec2b605bf7000800";
    
    // Expected values
    const expectedCode = "FINAL-SUCCESS-TEST-2025";
    const expectedPin = "8888";
    
    // Test decryption
    const codeResult = await decryptValue({
      walletClient,
      handle: encryptedCodeHandle,
      valueType: 'code'
    });
    
    const pinResult = await decryptValue({
      walletClient,
      handle: encryptedPinHandle,
      valueType: 'pin'
    });
    
    // Verify results
    const codeMatch = codeResult === expectedCode;
    const pinMatch = pinResult === expectedPin;
    
    console.log('🧪 Test results:');
    console.log(`Code: "${codeResult}" (expected: "${expectedCode}") ${codeMatch ? '✅' : '❌'}`);
    console.log(`PIN: "${pinResult}" (expected: "${expectedPin}") ${pinMatch ? '✅' : '❌'}`);
    
    return {
      success: codeMatch && pinMatch,
      codeResult,
      pinResult,
      codeMatch,
      pinMatch
    };
    
  } catch (error) {
    console.error('❌ Card 44 test failed:', error);
    throw error;
  }
};

// =============================================================================
// COMPLETE GIFT CARD DECRYPTION
// =============================================================================
export const decryptGiftCard = async (codeHandle, pinHandle, walletClient) => {
  try {
    console.log('🎁 Starting complete gift card decryption...');
    console.log('Code handle:', codeHandle);
    console.log('PIN handle:', pinHandle);
    
    // Decrypt both handles using the working pattern
    const [decryptedCode, decryptedPin] = await Promise.all([
      decryptValue({
        walletClient,
        handle: codeHandle,
        valueType: 'code'
      }),
      decryptValue({
        walletClient,
        handle: pinHandle,
        valueType: 'pin'
      })
    ]);
    
    const giftCard = {
      code: decryptedCode,
      pin: decryptedPin
    };
    
    console.log('🎉 Complete gift card decryption successful!');
    console.log('Gift card:', giftCard);
    
    return giftCard;
  } catch (error) {
    console.error('❌ Complete gift card decryption failed:', error);
    throw error;
  }
};

// =============================================================================
// EXPORT ALL FUNCTIONS
// =============================================================================
export {
  getViemChain,
  supportedChains,
  Lightning
};

// =============================================================================
// USAGE EXAMPLE - Matching official docs exactly:
// =============================================================================
/*
OFFICIAL DOCS PATTERN:
```
import { Hex } from "viem";

// Request a re-encryption of the result ciphertext
const resultHandle = "0x..." as Hex; // Retrieve the handle from the contract
const reencryptor = await zap.getReencryptor(walletClient); // Use same walletClient
const resultPlaintext = await reencryptor({ handle: resultHandle });
console.log(resultPlaintext.value); // The decrypted value
```

OUR IMPLEMENTATION:
```
// 1. Basic decryption (matches official docs)
const result = await decryptValue({
  walletClient,
  handle: encryptedHandle,
  valueType: 'code'
});

// 2. Complete gift card
const giftCard = await decryptGiftCard(codeHandle, pinHandle, walletClient);

// 3. Test with Card 44
const test = await testDecryptionWithCard44(walletClient);
```
*/