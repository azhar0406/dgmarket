# DG Market Frontend

A Next.js 14 frontend for the DG Market (Decentralized Gift Card Marketplace) project, featuring privacy-first gift card trading using Inco Lightning's Trusted Execution Environment (TEE) for confidential smart contracts.

## Features

- **Privacy-First Design**: Encrypted gift card values and private user balances
- **Multi-Token Support**: Accept payments in various ERC-20 tokens
- **Secure Ownership Transfer**: Confidential gift card transfers
- **AI-Driven Agents**: Multi-agent system for marketplace optimization
- **Chainlink Integration**: Price feeds and automation for reliable data

## Tech Stack

- **Frontend**: Next.js 14, React 18
- **Blockchain Integration**: Wagmi v2, Viem 2.0
- **Encryption**: fhevmjs for client-side encryption
- **State Management**: React Query, Zustand
- **Styling**: Tailwind CSS

## Prerequisites

- Node.js 18+ and pnpm
- MetaMask or another Ethereum wallet browser extension
- Access to Base Sepolia testnet

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dgmarket.git
   cd dgmarket/frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env.local` file in the frontend directory:
   ```
   NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://base-sepolia-rpc.publicnode.com
   ```

### Running the Frontend

Start the development server:

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Smart Contract Deployment

Before using the frontend with live contracts, you need to deploy the smart contracts to Base Sepolia testnet.

### Contract Deployment Steps

1. Navigate to the project root:
   ```bash
   cd ..
   ```

2. Create a `.env` file in the project root with your wallet private key:
   ```
   PRIVATE_KEY=your_wallet_private_key
   BASE_SEPOLIA_RPC_URL=https://base-sepolia-rpc.publicnode.com
   ```

3. Deploy contracts using Hardhat Ignition:
   ```bash
   pnpm hardhat ignition deploy ./ignition/modules/DGMarketDeploy.ts --network base-sepolia
   ```

4. After deployment, configure the contracts:
   ```bash
   node scripts/configure-viem.js
   ```

### Updating Contract Addresses

After deployment, update the contract addresses in the frontend:

1. Open `/frontend/utils/contracts.js`
2. Update the `CONTRACT_ADDRESSES` object with the addresses from your deployment

## Project Structure

```
frontend/
├── app/                  # Next.js app directory
│   ├── agents/           # AI agents page
│   ├── create/           # Create gift card page
│   ├── marketplace/      # Gift card marketplace page
│   ├── my-cards/         # User's gift cards page
│   ├── globals.css       # Global styles
│   ├── layout.js         # Root layout with providers
│   ├── page.js           # Landing page
│   └── providers.js      # React providers configuration
├── components/           # Reusable components
│   ├── Footer.js         # Site footer
│   └── Header.js         # Site header with wallet connection
├── utils/                # Utility functions
│   ├── contracts.js      # Smart contract interaction utilities
│   └── encryption.js     # Encryption utilities for TEE
├── public/               # Static assets
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Project dependencies
```

## Key Pages

- **Home (`/`)**: Landing page with project information
- **Marketplace (`/marketplace`)**: Browse and purchase gift cards
- **My Cards (`/my-cards`)**: View created and purchased gift cards
- **Create (`/create`)**: Create new gift cards
- **Agents (`/agents`)**: Interact with AI agents

## Encryption Flow

1. User connects wallet
2. Frontend initializes fhevmjs encryption instance
3. When creating a gift card, the value is encrypted client-side
4. Smart contract stores the encrypted value
5. Only the owner or buyer can decrypt the value

## Contract Integration

The frontend interacts with four main contracts:

1. **ConfidentialGiftCard**: Handles encrypted gift card creation and transfers
2. **DGMarketCore**: Manages marketplace listings and purchases
3. **PriceOracle**: Provides token price feeds via Chainlink
4. **AgentCoordinator**: Coordinates AI agents for market optimization

## Development Guidelines

- Use React hooks for state management
- Follow the container/presentational component pattern
- Use Wagmi hooks for blockchain interactions
- Implement proper error handling for all blockchain operations
- Keep sensitive operations client-side with encryption

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
