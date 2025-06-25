'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { getContracts } from '../../utils/contracts'
import { useEncryption } from '../../utils/encryption'
import Link from 'next/link'

export default function MyCards() {
  const { isConnected, address } = useAccount()
  
  // Contract addresses
  const contractAddresses = {
    ConfidentialGiftCard: "0x0000000000000000000000000000000000000000", // Replace with actual address
    DGMarketCore: "0x0000000000000000000000000000000000000000" // Replace with actual address
  }
  
  // State
  const [activeTab, setActiveTab] = useState('created')
  const [createdCards, setCreatedCards] = useState([])
  const [purchasedCards, setPurchasedCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Encryption utilities using the new Inco Lightning SDK
  const { 
    encryptValue,
    encryptBoolean,
    decryptValue,
    isInitialized,
    isLoading: encryptionLoading,
    error: encryptionError
  } = useEncryption(contractAddresses.ConfidentialGiftCard, address)
  
  // Mock data for demonstration - in a real app, this would come from the blockchain
  const mockCreatedCards = [
    {
      id: 1,
      brand: 'Amazon',
      category: 'Shopping',
      value: 'Encrypted',
      createdAt: '2025-06-20',
      expiryDate: '2026-06-20',
      status: 'Listed',
      price: '25 USDC'
    },
    {
      id: 2,
      brand: 'Starbucks',
      category: 'Food & Dining',
      value: 'Encrypted',
      createdAt: '2025-06-18',
      expiryDate: '2026-06-18',
      status: 'Sold',
      price: '10 USDC'
    }
  ]
  
  const mockPurchasedCards = [
    {
      id: 3,
      brand: 'Netflix',
      category: 'Entertainment',
      value: '$15.00',
      purchasedAt: '2025-06-22',
      expiryDate: '2026-06-22',
      seller: '0x8765...4321',
      code: 'NFLX-1234-5678-9012'
    },
    {
      id: 4,
      brand: 'Uber',
      category: 'Travel',
      value: '$20.00',
      purchasedAt: '2025-06-19',
      expiryDate: '2026-06-19',
      seller: '0x4321...8765',
      code: 'UBER-9876-5432-1098'
    }
  ]
  
  // Initialize and load data
  useEffect(() => {
    if (isConnected) {
      const loadData = async () => {
        try {
          setLoading(true)
          setError('')
          
          // In a real app, we would fetch data from the blockchain here
          // For now, we'll use mock data with a slight delay to simulate loading
          setTimeout(() => {
            setCreatedCards(mockCreatedCards)
            setPurchasedCards(mockPurchasedCards)
            setLoading(false)
          }, 1000)
          
        } catch (err) {
          console.error('Error loading gift cards:', err)
          setError('Failed to load your gift cards. Please try again.')
          setLoading(false)
        }
      }
      
      loadData()
    }
  }, [isConnected, address])
  
  // Function to list a card for sale
  const listForSale = async (cardId, price) => {
    try {
      // In a real app, this would call the smart contract to list the card
      console.log(`Listing card ${cardId} for sale at ${price} USDC`)
      
      // Example of how to use encryption when listing a card
      if (isInitialized) {
        const encryptedPrice = await encryptValue(parseFloat(price))
        console.log('Encrypted price:', encryptedPrice)
        // Here you would send the encryptedPrice to the smart contract
      } else {
        throw new Error('Encryption not initialized')
      }
      
      alert(`Card ${cardId} listed for sale successfully!`)
    } catch (err) {
      console.error('Error listing card for sale:', err)
      alert(`Failed to list card: ${err.message}`)
    }
  }
  
  // Function to delist a card
  const delistCard = async (cardId) => {
    // In a real app, this would call the smart contract to delist the card
    console.log(`Delisting card ${cardId}`)
    alert(`Card ${cardId} delisted successfully!`)
  }
  
  // Function to transfer a card to another address
  const transferCard = async (cardId, recipientAddress) => {
    // In a real app, this would call the smart contract to transfer the card
    console.log(`Transferring card ${cardId} to ${recipientAddress}`)
    alert(`Card ${cardId} transferred successfully!`)
  }
  
  // Function to reveal a card's code (for purchased cards)
  const revealCode = async (cardId) => {
    try {
      // In a real app, this would call the smart contract to get the encrypted code
      // Then decrypt it using the Inco Lightning SDK
      console.log(`Revealing code for card ${cardId}`)
      
      // Example of how to use decryption when revealing a card code
      if (isInitialized) {
        // This is a mock handle - in reality, you would get this from the contract
        const mockHandle = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        
        // In a real implementation, you would:
        // 1. Call the contract to get the handle for the encrypted code
        // 2. Use the decryptValue function to decrypt it
        // const decryptedCode = await decryptValue(mockHandle)
        // console.log('Decrypted code:', decryptedCode)
        
        // For demo purposes, we'll just update the UI with a mock code
        const updatedCards = purchasedCards.map(card => {
          if (card.id === cardId) {
            return { ...card, code: 'DEMO-1234-5678-9012' }
          }
          return card
        })
        
        setPurchasedCards(updatedCards)
      } else {
        throw new Error('Encryption not initialized')
      }
    } catch (err) {
      console.error('Error revealing card code:', err)
      alert(`Failed to reveal code: ${err.message}`)
    }
  }
  
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Gift Cards</h1>
          <p className="mt-2 text-gray-600">Manage your created and purchased gift cards</p>
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('created')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'created'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Created Cards
              </button>
              <button
                onClick={() => setActiveTab('purchased')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'purchased'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Purchased Cards
              </button>
            </nav>
          </div>
          
          {!isConnected ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Please connect your wallet to view your gift cards.</p>
            </div>
          ) : (
            <>
              {loading ? (
                <div className="p-8 text-center">
                  <p className="text-gray-600">Loading your gift cards...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <p className="text-red-600">{error}</p>
                  <button 
                    className="mt-4 btn-primary"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  {encryptionError && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500">
                      <p className="text-red-700">
                        <strong>Encryption Error:</strong> {encryptionError.message || 'Failed to initialize encryption'}
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        Some features may be limited without encryption.
                      </p>
                    </div>
                  )}
                
                  {activeTab === 'created' ? (
                    <>
                      <div className="p-6 flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">Gift Cards You Created</h2>
                        <Link href="/create-card" className="btn-primary">
                          Create New Card
                        </Link>
                      </div>
                      
                      {createdCards.length === 0 ? (
                        <div className="text-center py-12">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                            />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No gift cards created</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Get started by creating a new gift card.
                          </p>
                          <div className="mt-6">
                            <Link href="/create-card" className="btn-primary">
                              Create New Card
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Brand
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Value
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Expires
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Price
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {createdCards.map((card) => (
                                <tr key={card.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {card.brand}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {card.category}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {card.value}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {card.createdAt}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {card.expiryDate}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      card.status === 'Listed' 
                                        ? 'bg-green-100 text-green-800' 
                                        : card.status === 'Sold' 
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {card.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {card.price}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {card.status === 'Listed' ? (
                                      <button 
                                        onClick={() => delistCard(card.id)}
                                        className="text-primary-600 hover:text-primary-900 mr-4"
                                      >
                                        Delist
                                      </button>
                                    ) : card.status !== 'Sold' ? (
                                      <button 
                                        onClick={() => listForSale(card.id, card.price.split(' ')[0])}
                                        className="text-primary-600 hover:text-primary-900 mr-4"
                                      >
                                        List for Sale
                                      </button>
                                    ) : null}
                                    
                                    <button 
                                      onClick={() => transferCard(card.id, '0x...')}
                                      className="text-primary-600 hover:text-primary-900"
                                    >
                                      Transfer
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="p-6">
                        <h2 className="text-lg font-medium text-gray-900">Gift Cards You Purchased</h2>
                      </div>
                      
                      {purchasedCards.length === 0 ? (
                        <div className="text-center py-12">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No gift cards purchased</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            You haven't purchased any gift cards yet.
                          </p>
                          <div className="mt-6">
                            <Link href="/marketplace" className="btn-primary">
                              Browse Marketplace
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {purchasedCards.map((card) => (
                            <div key={card.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                              <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                  <h3 className="text-lg font-semibold">{card.brand}</h3>
                                  <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded">
                                    {card.category}
                                  </span>
                                </div>
                                
                                <div className="space-y-2 mb-6">
                                  <p className="text-gray-600">
                                    <span className="font-medium">Value:</span> {card.value}
                                  </p>
                                  <p className="text-gray-600">
                                    <span className="font-medium">Purchased:</span> {card.purchasedAt}
                                  </p>
                                  <p className="text-gray-600">
                                    <span className="font-medium">Expires:</span> {card.expiryDate}
                                  </p>
                                  <p className="text-gray-600">
                                    <span className="font-medium">Seller:</span> {card.seller}
                                  </p>
                                </div>
                                
                                <div className="border-t border-gray-200 pt-4">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="text-sm font-medium text-gray-500">Gift Card Code</span>
                                      <div className="mt-1 flex items-center">
                                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                                          {card.code ? card.code : '••••••••••••••••'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {!card.code && (
                                      <button 
                                        className="btn-primary"
                                        onClick={() => revealCode(card.id)}
                                        disabled={!isInitialized || encryptionLoading}
                                      >
                                        {encryptionLoading ? 'Loading...' : 'Reveal Code'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      <Footer />
    </main>
  )
}
