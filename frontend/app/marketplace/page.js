'use client'

import { useState } from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { useAccount } from 'wagmi'

export default function Marketplace() {
  const { isConnected } = useAccount()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('newest')

  // Mock gift card data - in a real app, this would come from the blockchain
  const giftCards = [
    {
      id: 1,
      brand: 'Amazon',
      category: 'Shopping',
      value: 'Encrypted',
      image: '/images/amazon.png',
      seller: '0x1234...5678',
      price: '25 USDC',
      createdAt: '2025-06-24',
    },
    {
      id: 2,
      brand: 'Netflix',
      category: 'Entertainment',
      value: 'Encrypted',
      image: '/images/netflix.png',
      seller: '0x8765...4321',
      price: '15 USDC',
      createdAt: '2025-06-23',
    },
    {
      id: 3,
      brand: 'Starbucks',
      category: 'Food & Dining',
      value: 'Encrypted',
      image: '/images/starbucks.png',
      seller: '0x5678...1234',
      price: '10 USDC',
      createdAt: '2025-06-25',
    },
    {
      id: 4,
      brand: 'Uber',
      category: 'Travel',
      value: 'Encrypted',
      image: '/images/uber.png',
      seller: '0x4321...8765',
      price: '20 USDC',
      createdAt: '2025-06-22',
    },
    {
      id: 5,
      brand: 'Steam',
      category: 'Gaming',
      value: 'Encrypted',
      image: '/images/steam.png',
      seller: '0x2468...1357',
      price: '30 USDC',
      createdAt: '2025-06-21',
    },
  ]

  // Filter gift cards by category
  const filteredGiftCards = selectedCategory === 'All'
    ? giftCards
    : giftCards.filter(card => card.category === selectedCategory)

  // Sort gift cards
  const sortedGiftCards = [...filteredGiftCards].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt)
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt)
    } else if (sortBy === 'priceAsc') {
      return parseFloat(a.price) - parseFloat(b.price)
    } else if (sortBy === 'priceDesc') {
      return parseFloat(b.price) - parseFloat(a.price)
    }
    return 0
  })

  // Categories
  const categories = ['All', 'Shopping', 'Entertainment', 'Food & Dining', 'Travel', 'Gaming']

  return (
    <main>
      <Header />
      
      <div className="bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-3xl font-bold mb-8">Gift Card Marketplace</h1>
          
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
                    Please connect your wallet to purchase gift cards.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row justify-between mb-8">
            <div className="mb-4 md:mb-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedCategory === category
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
              </select>
            </div>
          </div>
          
          {/* Gift Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedGiftCards.map((card) => (
              <div key={card.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-40 bg-gray-200 flex items-center justify-center">
                  <div className="text-2xl font-bold text-gray-500">{card.brand}</div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{card.brand}</h3>
                    <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded">
                      {card.category}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">Value: {card.value}</p>
                  <p className="text-gray-500 text-sm mb-4">Seller: {card.seller}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">{card.price}</span>
                    <button 
                      className="btn-primary"
                      disabled={!isConnected}
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Empty state */}
          {filteredGiftCards.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No gift cards found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No gift cards available in this category.
              </p>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </main>
  )
}
