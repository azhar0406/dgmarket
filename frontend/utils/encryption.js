'use client'

import { useState, useEffect } from 'react'
import { getViemChain, supportedChains } from '@inco/js'
import { Lightning } from '@inco/js/lite'
import { createWalletClient, http, Hex } from 'viem'

/**
 * IncoEncryption - A singleton class to handle Inco Lightning TEE encryption
 */
class IncoEncryption {
  constructor() {
    if (IncoEncryption.instance) {
      return IncoEncryption.instance
    }
    
    this.zap = null
    this.walletClient = null
    this.reencryptor = null
    this.dappAddress = null
    this.isInitialized = false
    this.isInitializing = false
    this.error = null
    
    IncoEncryption.instance = this
  }

  /**
   * Initialize the Inco Lightning client
   * @param {string} contractAddress - The address of the confidential contract
   * @param {object} account - The wallet account object
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize(contractAddress, account) {
    if (this.isInitialized) return true
    if (this.isInitializing) return false
    
    try {
      this.isInitializing = true
      console.log('Initializing Inco encryption for contract:', contractAddress)
      
      const chainId = supportedChains.baseSepolia
      
      // Initialize Lightning client
      this.zap = Lightning.latest('testnet', chainId)
      
      // Create wallet client
      this.walletClient = createWalletClient({
        chain: getViemChain(chainId),
        account,
        transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
      })
      
      // Store contract address
      this.dappAddress = contractAddress
      
      // Initialize reencryptor
      this.reencryptor = await this.zap.getReencryptor(this.walletClient)
      
      this.isInitialized = true
      this.isInitializing = false
      this.error = null
      
      return true
    } catch (err) {
      console.error('Failed to initialize Inco encryption:', err)
      this.error = err
      this.isInitializing = false
      return false
    }
  }

  /**
   * Check if the encryption client is initialized
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && !!this.zap && !!this.walletClient && !!this.dappAddress
  }

  /**
   * Get the current error if any
   * @returns {Error|null}
   */
  getError() {
    return this.error
  }

  /**
   * Encrypt a numeric value
   * @param {number} value - The value to encrypt
   * @returns {Promise<string>} - The encrypted value
   */
  async encryptValue(value) {
    if (!this.isReady()) {
      throw new Error('Encryption not initialized')
    }
    
    try {
      const ciphertext = await this.zap.encrypt(value, {
        accountAddress: this.walletClient.account.address,
        dappAddress: this.dappAddress
      })
      
      return ciphertext
    } catch (err) {
      console.error('Failed to encrypt value:', err)
      throw err
    }
  }

  /**
   * Encrypt a boolean value
   * @param {boolean} value - The boolean to encrypt
   * @returns {Promise<string>} - The encrypted boolean
   */
  async encryptBoolean(value) {
    if (!this.isReady()) {
      throw new Error('Encryption not initialized')
    }
    
    try {
      const ciphertext = await this.zap.encrypt(value ? 1 : 0, {
        accountAddress: this.walletClient.account.address,
        dappAddress: this.dappAddress
      })
      
      return ciphertext
    } catch (err) {
      console.error('Failed to encrypt boolean:', err)
      throw err
    }
  }

  /**
   * Decrypt a value using the result handle
   * @param {string} resultHandle - The handle from the contract
   * @returns {Promise<any>} - The decrypted value
   */
  async decryptValue(resultHandle) {
    if (!this.isReady()) {
      throw new Error('Encryption not initialized')
    }
    
    try {
      const resultPlaintext = await this.reencryptor({ 
        handle: resultHandle
      })
      return resultPlaintext.value
    } catch (err) {
      console.error('Failed to decrypt value:', err)
      throw err
    }
  }
}

// Create the singleton instance
const incoEncryption = new IncoEncryption()

/**
 * React hook to use Inco Lightning encryption in components
 * @param {string} contractAddress - The address of the confidential contract
 * @param {object} account - The wallet account object
 * @returns {Object} - Encryption methods and state
 */
export function useEncryption(contractAddress, account) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!contractAddress || !account) return
    
    const initEncryption = async () => {
      setIsLoading(true)
      try {
        const success = await incoEncryption.initialize(contractAddress, account)
        setIsInitialized(success)
        if (!success) {
          setError(incoEncryption.getError())
        }
      } catch (err) {
        setError(err)
      } finally {
        setIsLoading(false)
      }
    }
    
    initEncryption()
  }, [contractAddress, account])

  return {
    isInitialized,
    isLoading,
    error,
    encryptValue: (value) => incoEncryption.encryptValue(value),
    encryptBoolean: (value) => incoEncryption.encryptBoolean(value),
    decryptValue: (handle) => incoEncryption.decryptValue(handle)
  }
}

export default incoEncryption
