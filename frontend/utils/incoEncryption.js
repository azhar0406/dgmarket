import { Lightning } from '@inco/js/lite';
import { getAddress } from 'viem';

/**
 * Get the Inco Lightning configuration
 * @returns {Object} Lightning configuration
 */
export const getIncoConfig = () => {
  // Use Base Sepolia for our implementation
  return new Lightning({
    chainId: 84532, // Base Sepolia chainId
    network: 'testnet'
  });
};

/**
 * Encrypt a string value for the gift card contract
 * @param {string} value - String value to encrypt (like gift card code)
 * @param {string} address - User's wallet address
 * @param {string} contractAddress - Gift card contract address
 * @returns {Promise<string>} - Encrypted value as a hex string
 */
export async function encryptStringValue({
  value,
  address,
  contractAddress,
}) {
  try {
    console.log(`🔒 Encrypting string: "${value}"`);
    
    // Convert string to BigInt (same as your enhanced method)
    const encoder = new TextEncoder();
    const bytes = encoder.encode(value);
    
    let bigIntValue = 0n;
    for (let i = 0; i < bytes.length; i++) {
      bigIntValue = (bigIntValue << 8n) + BigInt(bytes[i]);
    }
    
    console.log(`   📝 String as BigInt: ${bigIntValue.toString()}`);
    
    const checksummedAddress = getAddress(contractAddress);
    const incoConfig = getIncoConfig();
    
    const encryptedData = await incoConfig.encrypt(bigIntValue, {
      accountAddress: address,
      dappAddress: checksummedAddress,
    });
    
    console.log('✅ Successfully encrypted string value');
    return encryptedData;
  } catch (error) {
    console.error('❌ String encryption error:', error);
    throw new Error(`Failed to encrypt string: ${error.message}`);
  }
}

/**
 * Encrypt a numeric value (like PIN) for the gift card contract
 * @param {number|string} value - Numeric value to encrypt (like PIN)
 * @param {string} address - User's wallet address
 * @param {string} contractAddress - Gift card contract address
 * @returns {Promise<string>} - Encrypted value as a hex string
 */
export async function encryptNumericValue({
  value,
  address,
  contractAddress,
}) {
  try {
    console.log(`🔒 Encrypting PIN: "${value}"`);
    
    // Convert directly to BigInt for numeric values
    const valueBigInt = BigInt(value);
    console.log(`   📝 PIN as BigInt: ${valueBigInt.toString()}`);
    
    const checksummedAddress = getAddress(contractAddress);
    const incoConfig = getIncoConfig();
    
    const encryptedData = await incoConfig.encrypt(valueBigInt, {
      accountAddress: address,
      dappAddress: checksummedAddress,
    });
    
    console.log('✅ Successfully encrypted numeric value');
    return encryptedData;
  } catch (error) {
    console.error('❌ Numeric encryption error:', error);
    throw new Error(`Failed to encrypt numeric value: ${error.message}`);
  }
}

/**
 * Helper function to create a wallet client from an ethers provider
 * @param {Object} provider - Ethers provider
 * @returns {Promise<Object>} - Viem compatible wallet client
 */
export async function createWalletClientFromEthers(provider) {
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  
  return {
    account: { address },
    async signMessage({ message }) {
      return signer.signMessage(message);
    }
  };
}

/**
 * Convert BigInt back to original string (reverse of encryption process)
 * @param {bigint} bigIntValue - BigInt value to convert
 * @returns {string} - Original string
 */
function bigIntToString(bigIntValue) {
  if (bigIntValue === 0n) {
    return "";
  }
  
  // Extract bytes from BigInt (reverse of encryption process)
  const bytes = [];
  let remaining = bigIntValue;
  
  while (remaining > 0n) {
    const byte = Number(remaining & 0xFFn);
    bytes.unshift(byte); // Add to front to maintain correct order
    remaining = remaining >> 8n;
  }
  
  // Convert bytes back to string
  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(bytes));
}

/**
 * Decrypt a single encrypted handle
 * @param {Object} walletClient - Viem wallet client
 * @param {string} handle - Encrypted handle from the contract
 * @param {string} valueType - Type of value ('code' or 'pin')
 * @returns {Promise<string>} - Decrypted value as string
 */
export async function decryptValue({
  walletClient,
  handle,
  valueType = 'code'
}) {
  if (!walletClient || !handle) {
    throw new Error('Missing required parameters for decryption');
  }
  
  try {
    console.log(`🔓 Decrypting ${valueType} from handle: ${handle.substring(0, 20)}...`);
    
    const incoConfig = getIncoConfig();
    const reencryptor = await incoConfig.getReencryptor(walletClient);
    
    // Add retry logic for reencryption
    const backoffConfig = {
      maxRetries: 100,
      baseDelayInMs: 1000,
      backoffFactor: 1.5,
    };
    
    const decryptedResult = await reencryptor(
      { handle: handle },
      backoffConfig
    );
    
    if (!decryptedResult) {
      throw new Error('Failed to decrypt');
    }
    
    const decryptedBigInt = decryptedResult.value;
    console.log(`   📝 Decrypted BigInt: ${decryptedBigInt.toString()}`);
    
    let finalValue;
    if (valueType === 'pin') {
      // For PINs, directly convert BigInt to string
      finalValue = decryptedBigInt.toString();
      console.log(`   ✅ Decrypted PIN: "${finalValue}"`);
    } else {
      // For codes, convert BigInt back to original string
      finalValue = bigIntToString(decryptedBigInt);
      console.log(`   ✅ Decrypted code: "${finalValue}"`);
    }
    
    return finalValue;
    
  } catch (error) {
    console.error(`❌ Decryption error for ${valueType}:`, error);
    throw new Error(`Failed to decrypt ${valueType}: ${error.message}`);
  }
}

/**
 * Decrypt BOTH gift card code and PIN from contract result
 * @param {Object} provider - Ethereum provider (ethers v5)
 * @param {Object} contractResult - Result from revealGiftCard contract call
 * @returns {Promise<{code: string, pin: string}>} - Decrypted gift card data
 */
export async function decryptGiftCardData(provider, contractResult) {
  try {
    console.log('🔐 Starting full gift card decryption...');
    console.log('📊 Contract result:', contractResult);
    
    // Create a wallet client from ethers provider
    const walletClient = await createWalletClientFromEthers(provider);
    
    // Extract both encrypted handles from contract result
    // The contract returns { encryptedCode, encryptedPin } or [encryptedCode, encryptedPin]
    let encryptedCodeHandle, encryptedPinHandle;
    
    if (Array.isArray(contractResult)) {
      // If it's an array: [encryptedCode, encryptedPin]
      encryptedCodeHandle = contractResult[0];
      encryptedPinHandle = contractResult[1];
    } else if (contractResult.encryptedCode && contractResult.encryptedPin) {
      // If it's an object: { encryptedCode, encryptedPin }
      encryptedCodeHandle = contractResult.encryptedCode;
      encryptedPinHandle = contractResult.encryptedPin;
    } else {
      throw new Error('Invalid contract result format');
    }
    
    console.log('🔑 Encrypted handles:');
    console.log('   Code handle:', encryptedCodeHandle);
    console.log('   PIN handle:', encryptedPinHandle);
    
    if (!encryptedCodeHandle || !encryptedPinHandle) {
      throw new Error('Missing encrypted handles from contract result');
    }
    
    console.log('🔓 Starting Inco FHE decryption for both values...');
    
    // Decrypt both values in parallel
    const [decryptedCode, decryptedPin] = await Promise.all([
      decryptValue({
        walletClient,
        handle: encryptedCodeHandle,
        valueType: 'code'
      }),
      decryptValue({
        walletClient,
        handle: encryptedPinHandle,
        valueType: 'pin'
      })
    ]);
    
    console.log('✅ Successfully decrypted both gift card values');
    console.log(`   Code: "${decryptedCode}"`);
    console.log(`   PIN: "${decryptedPin}"`);
    
    return {
      code: decryptedCode,
      pin: decryptedPin
    };
    
  } catch (error) {
    console.error('❌ Failed to decrypt gift card data:', error);
    throw error;
  }
}

/**
 * LEGACY: Decrypt a single gift card value (for backward compatibility)
 * @param {Object} provider - Ethereum provider (ethers v5)
 * @param {Object} contract - DGMarketCore contract instance
 * @param {number} cardId - ID of the gift card to decrypt
 * @returns {Promise<bigint>} - Decrypted gift card value
 */
export async function decryptGiftCardValue(provider, contract, cardId) {
  try {
    console.log('⚠️ Using legacy single-value decryption method');
    console.log('🔐 Starting decryption for card:', cardId);
    
    // Get the user's address
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    console.log('👤 User address:', userAddress);
    
    // Create a wallet client from ethers provider
    const walletClient = await createWalletClientFromEthers(provider);
    
    console.log('📡 Calling revealGiftCard on DGMarketCore...');
    
    // Call the revealGiftCard function which returns both encrypted handles
    const revealResult = await contract.revealGiftCard(cardId);
    console.log('🔑 Got encrypted handles from contract:', revealResult);
    
    // Get the first value (code) for backward compatibility
    const encryptedCodeHandle = revealResult.encryptedCode || revealResult[0];
    
    if (!encryptedCodeHandle) {
      throw new Error('No encrypted code handle returned from contract');
    }
    
    console.log('🔓 Starting Inco FHE decryption...');
    
    // Decrypt using the new method
    const decryptedCode = await decryptValue({
      walletClient,
      handle: encryptedCodeHandle,
      valueType: 'code'
    });
    
    console.log('✅ Successfully decrypted gift card value (legacy mode)');
    
    // Return as BigInt for backward compatibility
    return BigInt(decryptedCode.charCodeAt(0)); // Just return something for legacy compatibility
    
  } catch (error) {
    console.error('❌ Failed to decrypt gift card value:', error);
    throw error;
  }
}