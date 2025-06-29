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
 * Encrypt a value for the gift card contract
 * @param {number|bigint} value - Value to encrypt
 * @param {string} address - User's wallet address
 * @param {string} contractAddress - Gift card contract address
 * @returns {Promise<string>} - Encrypted value as a hex string
 */
export async function encryptValue({
  value,
  address,
  contractAddress,
}) {
  try {
    const valueBigInt = BigInt(value);
    const checksummedAddress = getAddress(contractAddress);
    
    const incoConfig = getIncoConfig();
    
    const encryptedData = await incoConfig.encrypt(valueBigInt, {
      accountAddress: address,
      dappAddress: checksummedAddress,
    });
    
    console.log('Successfully encrypted value');
    return encryptedData;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt: ${error.message}`);
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
 * Decrypt a gift card value
 * @param {Object} walletClient - Viem wallet client
 * @param {string} handle - Encrypted handle from the contract
 * @returns {Promise<bigint>} - Decrypted value
 */
export async function reEncryptValue({
  walletClient,
  handle,
}) {
  if (!walletClient || !handle) {
    throw new Error('Missing required parameters for reencryption');
  }
  
  try {
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
    
    console.log('Successfully decrypted gift card value');
    return decryptedResult.value;
  } catch (error) {
    console.error('Reencryption error:', error);
    throw new Error(`Failed to reencrypt: ${error.message}`);
  }
}

/**
 * Decrypt a gift card value using Inco Lightning
 * @param {Object} provider - Ethereum provider
 * @param {Object} contract - ConfidentialGiftCard contract instance
 * @param {number} cardId - ID of the gift card to decrypt
 * @returns {Promise<bigint>} - Decrypted gift card value
 */
export async function decryptGiftCardValue(provider, contract, cardId) {
  try {
    // Get the user's address
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    
    // Create a wallet client from ethers provider
    const walletClient = await createWalletClientFromEthers(provider);
    
    // Get the encrypted gift card value from the contract
    const encryptedValue = await contract.getEncryptedGiftCardValue(cardId);
    
    // Decrypt the value
    const decryptedValue = await reEncryptValue({
      walletClient,
      handle: encryptedValue,
    });
    
    return decryptedValue;
  } catch (error) {
    console.error('Failed to decrypt gift card value:', error);
    throw error;
  }
}
