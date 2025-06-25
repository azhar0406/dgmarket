'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useWriteContract } from 'wagmi'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { useEncryption } from '../../utils/encryption'
import { getContracts } from '../../utils/contracts'

export default function CreateGiftCard() {
  const router = useRouter()
  const { isConnected, address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  
  // Contract addresses
  const contractAddresses = {
    ConfidentialGiftCard: "0x0000000000000000000000000000000000000000" // Replace with actual address
  }
  
  // Encryption utilities
  const { 
    encryption, 
    initializeEncryption, 
    encryptValue, 
    isReady 
  } = useEncryption(contractAddresses.ConfidentialGiftCard)
  
  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    category: 'Shopping',
    value: '',
    expiryDate: '',
    price: '',
    description: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [encryptionInitialized, setEncryptionInitialized] = useState(false)
  
  // Categories
  const categories = ['Shopping', 'Entertainment', 'Food & Dining', 'Travel', 'Gaming', 'Other']
  
  // Initialize encryption
  useEffect(() => {
    if (isConnected && !encryptionInitialized) {
      const init = async () => {
        try {
          const success = await initializeEncryption()
          setEncryptionInitialized(success)
          if (!success) {
            setError('Failed to initialize encryption. Please try again.')
          }
        } catch (err) {
          console.error('Encryption initialization error:', err)
          setError('Failed to initialize encryption: ' + err.message)
        }
      }
      
      init()
    }
  }, [isConnected, encryptionInitialized, initializeEncryption])
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isConnected) {
      setError('Please connect your wallet first')
      return
    }
    
    if (!encryptionInitialized) {
      setError('Encryption is not initialized. Please wait or refresh the page.')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      // Validate form
      if (!formData.brand || !formData.value || !formData.expiryDate || !formData.price) {
        throw new Error('Please fill in all required fields')
      }
      
      // Parse values
      const valueInWei = BigInt(parseFloat(formData.value) * 10**18)
      const expiryTimestamp = Math.floor(new Date(formData.expiryDate).getTime() / 1000)
      
      // Encrypt the gift card value
      const encryptedValue = await encryptValue(valueInWei)
      
      // Get contract ABIs
      const { confidentialGiftCard } = getContracts()
      
      // Create gift card transaction
      const txResult = await writeContractAsync({
        address: contractAddresses.ConfidentialGiftCard,
        abi: confidentialGiftCard.abi,
        functionName: 'createGiftCard',
        args: [
          encryptedValue,
          formData.brand,
          formData.category,
          BigInt(expiryTimestamp)
        ]
      })
      
      console.log('Transaction submitted:', txResult)
      
      // Redirect to my cards page after successful creation
      router.push('/my-cards')
    } catch (err) {
      console.error('Error creating gift card:', err)
      setError(`Failed to create gift card: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <main>
      <Header />
      
      <div className="bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-bold mb-8">Create Gift Card</h1>
          
          {!isConnected ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Please connect your wallet to create gift cards.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white shadow-md rounded-lg p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="e.g. Amazon, Netflix, Starbucks"
                  required
                  disabled={!isConnected || isSubmitting}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                  disabled={!isConnected || isSubmitting}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
                  Value (USD) *
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="value"
                    name="value"
                    value={formData.value}
                    onChange={handleChange}
                    className="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                    disabled={!isConnected || isSubmitting}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This value will be encrypted and only visible to the buyer after purchase.
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  id="expiryDate"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                  disabled={!isConnected || isSubmitting}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price (USDC) *
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                    disabled={!isConnected || isSubmitting}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">USDC</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Add any additional details about the gift card"
                  disabled={!isConnected || isSubmitting}
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => router.push('/marketplace')}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!isConnected || isSubmitting || !encryptionInitialized}
                >
                  {isSubmitting ? 'Creating...' : 'Create Gift Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}
