'use client'

import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Image from 'next/image'

export default function Home() {
  const router = useRouter()
  const { isConnected } = useAccount()

  // Features list
  const features = [
    {
      title: 'Privacy-First Design',
      description: 'Trade gift cards with complete privacy. Values and balances are encrypted using Inco Lightning TEE technology.',
      icon: '🔒'
    },
    {
      title: 'Multi-Token Support',
      description: 'Buy and sell gift cards using various ERC-20 tokens with real-time price feeds from Chainlink.',
      icon: '💱'
    },
    {
      title: 'AI-Driven Marketplace',
      description: 'Our AI agents help optimize listings, find the best deals, and ensure secure transactions.',
      icon: '🤖'
    },
    {
      title: 'Secure Transfers',
      description: 'Transfer gift cards confidentially with encrypted values that only the recipient can decrypt.',
      icon: '🔄'
    }
  ]

  // How it works steps
  const steps = [
    {
      title: 'Connect Wallet',
      description: 'Connect your Ethereum wallet to access the DG Market platform.',
      icon: '👛'
    },
    {
      title: 'Create or Browse',
      description: 'List your gift cards for sale or browse the marketplace for cards to purchase.',
      icon: '🔍'
    },
    {
      title: 'Secure Transaction',
      description: 'Complete transactions with encrypted values for maximum privacy and security.',
      icon: '🔐'
    },
    {
      title: 'Redeem Value',
      description: 'Decrypt and reveal gift card codes only when you need to use them.',
      icon: '🎁'
    }
  ]

  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="container mx-auto px-4 py-20 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                The Privacy-First Gift Card Marketplace
              </h1>
              <p className="text-xl mb-8">
                Buy, sell, and trade gift cards with complete privacy using encrypted smart contracts on Base.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => router.push('/marketplace')}
                  className="bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium text-lg transition-colors"
                >
                  Explore Marketplace
                </button>
                <button 
                  onClick={() => router.push('/create')}
                  className="bg-transparent hover:bg-primary-700 border-2 border-white px-6 py-3 rounded-lg font-medium text-lg transition-colors"
                >
                  Create Gift Card
                </button>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-72 h-72 md:w-96 md:h-96">
                {/* Placeholder for hero image */}
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <div className="text-8xl">🎁</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose DG Market?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our decentralized marketplace combines the best of blockchain technology with privacy-preserving features.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Getting started with DG Market is easy. Follow these simple steps:
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            {steps.map((step, index) => (
              <div key={index} className="flex-1 flex flex-col items-center text-center">
                <div className="bg-primary-100 text-primary-600 text-4xl w-20 h-20 rounded-full flex items-center justify-center mb-4">
                  {step.icon}
                </div>
                <div className="bg-primary-600 text-white w-8 h-8 rounded-full flex items-center justify-center mb-4">
                  {index + 1}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-2/3 mb-8 md:mb-0">
              <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
              <p className="text-xl text-gray-300">
                Join the privacy-first gift card marketplace today and experience the future of secure digital trading.
              </p>
            </div>
            <div className="md:w-1/3 flex justify-center md:justify-end">
              <button 
                onClick={() => isConnected ? router.push('/marketplace') : null}
                className="bg-primary-600 hover:bg-primary-700 px-8 py-4 rounded-lg font-medium text-lg transition-colors"
              >
                {isConnected ? 'Enter Marketplace' : 'Connect Wallet to Start'}
              </button>
            </div>
          </div>
        </div>
      </section>
      
      {/* AI Agents Preview */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold mb-4">AI-Powered Marketplace</h2>
              <p className="text-xl text-gray-600 mb-6">
                Our marketplace is enhanced with AI agents that help optimize your experience, find the best deals, and ensure secure transactions.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="text-primary-600 mr-3">✓</div>
                  <div>
                    <span className="font-medium">Market Advisor</span> - Get personalized recommendations based on market trends
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="text-primary-600 mr-3">✓</div>
                  <div>
                    <span className="font-medium">Listing Optimizer</span> - Maximize visibility and sales potential of your listings
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="text-primary-600 mr-3">✓</div>
                  <div>
                    <span className="font-medium">Security Guardian</span> - Ensure your transactions are secure and legitimate
                  </div>
                </li>
              </ul>
              <button 
                onClick={() => router.push('/agents')}
                className="mt-8 bg-primary-600 text-white hover:bg-primary-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Explore AI Agents
              </button>
            </div>
            <div className="md:w-1/2">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-3">🤖</div>
                  <div>
                    <h3 className="font-medium">Market Advisor</h3>
                    <p className="text-sm text-gray-500">AI Agent</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-gray-800">Hello! I'm your Market Advisor. Based on current trends, gift cards in the Entertainment category are selling quickly. Would you like me to show you the best deals?</p>
                  </div>
                  <div className="bg-primary-100 rounded-lg p-3 ml-auto max-w-[80%]">
                    <p className="text-primary-800">Yes, show me the best entertainment gift cards available.</p>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-gray-800">Great! I've found 3 Netflix gift cards and 2 Disney+ cards with excellent value. The best deal is a $50 Netflix card selling for only 45 USDC. Would you like me to take you there?</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
                  This is a preview of how our AI agents can assist you.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}
