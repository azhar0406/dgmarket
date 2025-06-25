'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { getContracts } from '../../utils/contracts'

export default function AIAgents() {
  const { isConnected, address } = useAccount()
  
  // State
  const [activeAgent, setActiveAgent] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Mock agent data - in a real app, this would come from the blockchain
  const agents = [
    {
      id: 1,
      name: 'Market Advisor',
      type: 'Advisor',
      description: 'Helps you find the best gift cards based on your preferences and market trends.',
      icon: '📊',
      status: 'Active',
      capabilities: ['Market analysis', 'Price recommendations', 'Trend insights']
    },
    {
      id: 2,
      name: 'Listing Optimizer',
      type: 'Optimizer',
      description: 'Optimizes your gift card listings for maximum visibility and faster sales.',
      icon: '🚀',
      status: 'Active',
      capabilities: ['Pricing optimization', 'Category suggestions', 'Listing enhancement']
    },
    {
      id: 3,
      name: 'Security Guardian',
      type: 'Guardian',
      description: 'Monitors transactions and alerts you of any suspicious activities.',
      icon: '🛡️',
      status: 'Active',
      capabilities: ['Fraud detection', 'Transaction verification', 'Security alerts']
    }
  ]
  
  // Select an agent
  const selectAgent = (agent) => {
    setActiveAgent(agent)
    
    // Add welcome message from agent
    setMessages([
      {
        sender: 'agent',
        text: `Hello! I'm ${agent.name}, your ${agent.type} AI agent. How can I assist you today?`,
        timestamp: new Date()
      }
    ])
  }
  
  // Send message to agent
  const sendMessage = () => {
    if (!inputMessage.trim()) return
    
    // Add user message
    const userMessage = {
      sender: 'user',
      text: inputMessage,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)
    
    // Simulate agent response after a delay
    setTimeout(() => {
      // Mock agent responses based on agent type
      let responseText = ''
      
      if (activeAgent.type === 'Advisor') {
        responseText = 'Based on current market trends, gift cards in the Entertainment category are selling quickly. I recommend focusing on Netflix, Disney+, or gaming platforms like Steam.'
      } else if (activeAgent.type === 'Optimizer') {
        responseText = 'I analyzed your listings and recommend adjusting the price of your Amazon gift card by 5% to increase its visibility. The optimal price point appears to be around 22 USDC.'
      } else if (activeAgent.type === 'Guardian') {
        responseText = 'All your recent transactions look secure. Remember to always verify the recipient address before transferring gift cards to prevent fraud.'
      }
      
      const agentMessage = {
        sender: 'agent',
        text: responseText,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, agentMessage])
      setLoading(false)
    }, 1500)
  }
  
  // Handle input change
  const handleInputChange = (e) => {
    setInputMessage(e.target.value)
  }
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage()
  }
  
  return (
    <main>
      <Header />
      
      <div className="bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-3xl font-bold mb-8">AI Agents</h1>
          
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
                    Please connect your wallet to interact with AI agents.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Agent List */}
            <div className="lg:w-1/3">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Available Agents</h2>
                
                <div className="space-y-4">
                  {agents.map((agent) => (
                    <div 
                      key={agent.id}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        activeAgent?.id === agent.id 
                          ? 'bg-primary-50 border border-primary-200' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => isConnected && selectAgent(agent)}
                    >
                      <div className="flex items-center">
                        <div className="text-3xl mr-3">{agent.icon}</div>
                        <div>
                          <h3 className="font-medium">{agent.name}</h3>
                          <p className="text-sm text-gray-500">{agent.type}</p>
                        </div>
                        <div className="ml-auto">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            agent.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {agent.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{agent.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {agent.capabilities.map((capability, index) => (
                          <span 
                            key={index} 
                            className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Chat Interface */}
            <div className="lg:w-2/3">
              <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
                {activeAgent ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">{activeAgent.icon}</div>
                        <div>
                          <h3 className="font-medium">{activeAgent.name}</h3>
                          <p className="text-xs text-gray-500">{activeAgent.type}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: '400px' }}>
                      {messages.map((message, index) => (
                        <div 
                          key={index} 
                          className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-3/4 rounded-lg px-4 py-2 ${
                              message.sender === 'user' 
                                ? 'bg-primary-100 text-primary-900' 
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p>{message.text}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {loading && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 rounded-lg px-4 py-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Chat Input */}
                    <div className="p-4 border-t border-gray-200">
                      <form onSubmit={handleSubmit} className="flex">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={handleInputChange}
                          className="flex-1 rounded-l-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Type your message..."
                          disabled={loading || !isConnected}
                        />
                        <button
                          type="submit"
                          className="bg-primary-600 text-white px-4 py-2 rounded-r-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          disabled={loading || !inputMessage.trim() || !isConnected}
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full p-8 text-center">
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No agent selected</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Select an AI agent from the list to start a conversation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}
