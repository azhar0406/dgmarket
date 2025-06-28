# DG Market

A decentralized gift card marketplace using Inco Lightning's Trusted Execution Environment (TEE) for confidential smart contracts and Chainlink Functions for automated gift card restocking.

## Features

- **Privacy-First Design**: Encrypted gift card values and private user balances
- **Multi-Token Support**: Accept payments in various ERC-20 tokens
- **Secure Ownership Transfer**: Confidential gift card transfers
- **Chainlink Functions**: Automated gift card restocking via Chainlink Functions
- **Chainlink Integration**: Price feeds and automation for reliable data

## Tech Stack

### Frontend
- Next.js 14, React 18
- Wagmi v2, Viem 2.0
- fhevmjs for client-side encryption
- React Query, Zustand
- Tailwind CSS, Chakra UI

### Backend
- Node.js with Express
- Ethers.js for blockchain interaction
- Winston for logging
- Axios for API requests

### Smart Contracts
- Solidity 0.8.24
- OpenZeppelin contracts
- Chainlink Functions v1.0.0
- Inco Lightning TEE

## Prerequisites

- Node.js 18+ and pnpm
- MetaMask or another Ethereum wallet browser extension
- Access to Base Sepolia testnet

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dgmarket.git
   cd dgmarket
   ```

2. Install dependencies for all components:
   ```bash
   # Install frontend dependencies
   cd frontend
   pnpm install
   cd ..
   
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   
   # Install contract dependencies
   cd contracts
   npm install
   ```

3. Create environment files:

   **Frontend (.env.local in frontend directory):**
   ```
   NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://base-sepolia-rpc.publicnode.com
   NEXT_PUBLIC_ENVIRONMENT=local # Options: local, testnet, mainnet
   ```

   **Backend (.env in backend directory):**
   ```
   PORT=3001
   RPC_URL=https://base-sepolia-rpc.publicnode.com
   PRIVATE_KEY=your_backend_wallet_private_key
   CHAINLINK_MANAGER_ADDRESS=your_deployed_contract_address
   CONFIDENTIAL_GIFTCARD_ADDRESS=your_deployed_contract_address
   GIFT_CARD_API_URL=https://api.giftcards.com
   LOG_LEVEL=info
   ```

   **Contracts (.env in contracts directory):**
   ```
   PRIVATE_KEY=your_wallet_private_key
   BASE_SEPOLIA_RPC_URL=https://base-sepolia-rpc.publicnode.com
   CHAINLINK_SUBSCRIPTION_ID=your_chainlink_subscription_id
   CHAINLINK_DON_ID=your_chainlink_don_id
   ```

## Running the Application

### Frontend

```bash
cd frontend
pnpm dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000).

### Backend

```bash
cd backend
npm run dev
```

The backend service will start on port 3001 (or as configured in .env).

## Smart Contract Deployment

1. Navigate to the contracts directory:
   ```bash
   cd contracts
   ```

2. Deploy contracts using Hardhat:
   ```bash
   npx hardhat run scripts/deploy.js --network base-sepolia
   ```

3. After deployment, update the contract addresses in:
   - Frontend: `/frontend/constants/addresses.js`
   - Backend: `.env` file

## Project Structure

```
├── frontend/                  # Next.js frontend application
│   ├── app/                   # Next.js app directory
│   ├── components/            # Reusable React components
│   ├── constants/             # Contract ABIs and addresses
│   ├── hooks/                 # Custom React hooks
│   └── utils/                 # Utility functions
│
├── backend/                   # Node.js backend service
│   ├── abis/                  # Contract ABIs for backend
│   ├── controllers/           # API route controllers
│   ├── services/              # Business logic services
│   ├── utils/                 # Utility functions
│   └── index.js               # Main entry point
│
└── contracts/                 # Solidity smart contracts
    ├── contracts/             # Contract source files
    │   ├── ChainlinkGiftCardManager.sol  # Gift card inventory with Chainlink Functions
    │   ├── ConfidentialGiftCard.sol      # TEE-based encrypted gift cards
    │   └── DGMarketCore.sol              # Core marketplace functionality
    ├── scripts/               # Deployment and testing scripts
    └── test/                  # Contract test files
```

## Smart Contract Architecture

### DGMarketCore.sol
- Core marketplace functionality
- Handles listings, purchases, and payments
- Implements AccessControl for role-based permissions
- Manages supported payment tokens

### ConfidentialGiftCard.sol
- ERC721 token representing gift cards
- Stores encrypted gift card values using TEE
- Handles ownership transfers and redemption requests
- Implements access control for admin and backend roles

### ChainlinkGiftCardManager.sol
- Manages gift card inventory by category
- Uses Chainlink Functions to request restocking from external APIs
- Implements threshold-based automated restocking
- Tracks inventory levels and pending requests

## Backend Service

The backend service performs several key functions:

1. **Event Monitoring**: Listens for blockchain events like `RestockRequested` and `RestockFulfilled`
2. **API Integration**: Communicates with external gift card providers
3. **Transaction Submission**: Adds new gift cards to the blockchain when restocking
4. **Health Monitoring**: Provides endpoints to check system status

### Key Endpoints

- `GET /health`: Check service status
- `POST /restock`: Manually trigger restocking for a category
- `GET /inventory/:category`: Get current inventory for a category

## Frontend Components

### Key Pages

- **Home (`/`)**: Landing page with project information
- **Marketplace (`/marketplace`)**: Browse and purchase gift cards
- **My Cards (`/my-cards`)**: View created and purchased gift cards
- **Create (`/create`)**: Create new gift cards
- **Admin (`/admin`)**: Admin dashboard for inventory management

### Admin Dashboard

The admin dashboard includes:

- Gift card inventory management
- Role-based access control
- Restock request management
- Threshold configuration

## Chainlink Functions Integration

1. **Subscription Setup**: Create a Chainlink Functions subscription
2. **DON Configuration**: Configure the Decentralized Oracle Network
3. **JavaScript Source**: Define API request logic in the contract
4. **Request Flow**: Contract requests data → Chainlink executes → Backend processes response

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
