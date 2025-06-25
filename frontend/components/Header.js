'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleConnect = () => {
    connect({ connector: injected() })
  }

  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-primary-600">DG Market</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/marketplace" className="text-gray-700 hover:text-primary-600 transition-colors">
              Marketplace
            </Link>
            <Link href="/my-cards" className="text-gray-700 hover:text-primary-600 transition-colors">
              My Cards
            </Link>
            <Link href="/create" className="text-gray-700 hover:text-primary-600 transition-colors">
              Create
            </Link>
            <Link href="/agents" className="text-gray-700 hover:text-primary-600 transition-colors">
              AI Agents
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="hidden md:block">
            {isConnected ? (
              <div className="flex items-center space-x-4">
                <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                  {formatAddress(address)}
                </span>
                <button 
                  onClick={() => disconnect()} 
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnect} 
                className="btn-primary"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={toggleMenu}
              className="text-gray-700 hover:text-primary-600 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              <Link href="/marketplace" className="text-gray-700 hover:text-primary-600 transition-colors">
                Marketplace
              </Link>
              <Link href="/my-cards" className="text-gray-700 hover:text-primary-600 transition-colors">
                My Cards
              </Link>
              <Link href="/create" className="text-gray-700 hover:text-primary-600 transition-colors">
                Create
              </Link>
              <Link href="/agents" className="text-gray-700 hover:text-primary-600 transition-colors">
                AI Agents
              </Link>
              {isConnected ? (
                <div className="flex flex-col space-y-2">
                  <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium w-fit">
                    {formatAddress(address)}
                  </span>
                  <button 
                    onClick={() => disconnect()} 
                    className="text-gray-700 hover:text-primary-600 transition-colors w-fit"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleConnect} 
                  className="btn-primary w-fit"
                >
                  Connect Wallet
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
