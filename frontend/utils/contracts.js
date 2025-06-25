'use client'

import { createPublicClient, http, getContract } from 'viem'
import { baseSepolia } from 'viem/chains'
import { useReadContract } from 'wagmi'

// Contract ABIs - These will be imported from the contract build artifacts
// In production, you would import these from your contract build directory
const DGMarketCoreABI = [
  // Example ABI entries - replace with actual ABI from your build artifacts
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "priceFeed", "type": "address" }
    ],
    "name": "addSupportedToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "supportedTokens",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
  // Add more ABI entries as needed
]

const ConfidentialGiftCardABI = [
  // Example ABI entries - replace with actual ABI
  {
    "inputs": [
      { "internalType": "uint256", "name": "value", "type": "uint256" },
      { "internalType": "string", "name": "brand", "type": "string" },
      { "internalType": "string", "name": "category", "type": "string" },
      { "internalType": "uint256", "name": "expiryDate", "type": "uint256" }
    ],
    "name": "createGiftCard",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
  // Add more ABI entries as needed
]

const PriceOracleABI = [
  // Example ABI entries - replace with actual ABI
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "getLatestPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
  // Add more ABI entries as needed
]

const AgentCoordinatorABI = [
  // Example ABI entries - replace with actual ABI
  {
    "inputs": [
      { "internalType": "uint8", "name": "agentType", "type": "uint8" },
      { "internalType": "address", "name": "agentAddress", "type": "address" }
    ],
    "name": "registerAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
  // Add more ABI entries as needed
]

// Contract addresses - These will be updated after deployment
// You should load these from environment variables or a config file
const CONTRACT_ADDRESSES = {
  DGMarketCore: "0x0000000000000000000000000000000000000000", // Replace with actual address
  ConfidentialGiftCard: "0x0000000000000000000000000000000000000000", // Replace with actual address
  PriceOracle: "0x0000000000000000000000000000000000000000", // Replace with actual address
  AgentCoordinator: "0x0000000000000000000000000000000000000000", // Replace with actual address
}

// Create a public client for read operations
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
})

// Contract instances
export const getContracts = () => {
  return {
    dgMarketCore: getContract({
      address: CONTRACT_ADDRESSES.DGMarketCore,
      abi: DGMarketCoreABI,
      publicClient,
    }),
    confidentialGiftCard: getContract({
      address: CONTRACT_ADDRESSES.ConfidentialGiftCard,
      abi: ConfidentialGiftCardABI,
      publicClient,
    }),
    priceOracle: getContract({
      address: CONTRACT_ADDRESSES.PriceOracle,
      abi: PriceOracleABI,
      publicClient,
    }),
    agentCoordinator: getContract({
      address: CONTRACT_ADDRESSES.AgentCoordinator,
      abi: AgentCoordinatorABI,
      publicClient,
    }),
  }
}

// Hook to get contract addresses
export function useContractAddresses() {
  return CONTRACT_ADDRESSES
}

// Hook to check if a token is supported
export function useIsSupportedToken(tokenAddress) {
  const { data, isError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.DGMarketCore,
    abi: DGMarketCoreABI,
    functionName: 'supportedTokens',
    args: [tokenAddress],
  })

  return {
    isSupported: data,
    isError,
    isLoading,
  }
}

// Utility to update contract addresses (e.g., after deployment)
export function updateContractAddresses(addresses) {
  Object.assign(CONTRACT_ADDRESSES, addresses)
}
