---
trigger: always_on
---

# Inco Complete Documentation for DG Market

## Table of Contents
1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Solidity SDK](#solidity-sdk)
4. [JavaScript SDK](#javascript-sdk)
5. [Foundry Setup](#foundry-setup)
6. [Encrypted Data Types](#encrypted-data-types)
7. [Operations](#operations)
8. [Access Control](#access-control)
9. [Decryption & Re-encryption](#decryption--re-encryption)
10. [Best Practices](#best-practices)

---

## Introduction

Inco is a confidentiality layer for existing blockchains that enables privacy-preserving smart contracts using **Fully Homomorphic Encryption (FHE)**. It has two core protocols:

### Inco Lightning
- Uses **Trusted Execution Environments (TEEs)** for verifiable confidential compute
- Introduces new private data types, operations, and access controls
- No new chain, no new wallet required
- Currently available on **Base Sepolia** in beta testnet

### Inco Atlas (Coming Soon)
- Powered by Fully Homomorphic Encryption (FHE) and Multi-Party Computation (MPC)
- Will be released in the near future

### Key Benefits
- **Privacy with FHE**: User data and transaction details remain confidential
- **Developer Friendly**: Write confidential smart contracts in Solidity
- **Scalable & Secure**: Enterprise-grade security and privacy
- **EVM Compatible**: Works with existing Ethereum tooling

---

## Architecture Overview

### Components

#### 1. Smart Contract Library
Extends the EVM with encrypted data types and operations:
- **Encrypted data types**: `ebool`, `eaddress`, `estring`, `euint32`, `euint64`, `euint256`
- **Arithmetic operations**: `e.add`, `e.sub`, `e.mul`, `e.div`, `e.rem`
- **Comparison operations**: `e.eq`, `e.le`, `e.gt`, `e.ne`, `e.ge`, `e.lt`
- **Conditional operations**: `e.select`
- **Decryption operations**: `e.asyncDecrypt`

#### 2. Confidential Compute Nodes
- Run in Trusted Execution Environments (TEEs)
- Execute confidential computations
- Validate access control before decryption
- Process encrypted operations based on blockchain events

#### 3. Decryption Nodes + Callback Relayer
- Multiple decryption nodes operate in a quorum of TEEs
- Monitor blockchain for decryption requests
- Collect signed results from the decryption network
- Submit decryption results back via callback transactions

#### 4. Client-side JavaScript Library
- Encrypts user inputs using the network's public key
- Handles ephemeral key and EIP-712 signature generation
- Decrypts results locally for the user

---

## Solidity SDK

### Installation & Setup for Foundry

#### 1. Install Dependencies
```bash
# Add Inco packages
bun add @inco/lightning @inco/shared

# Or with npm/yarn/pnpm
npm install @inco/lightning @inco/shared
```

#### 2. Create Remappings
Create `remappings.txt` at the root of your contracts directory:
```txt
forge-std/=lib/forge-std/src/
ds-test/=lib/ds-test/src/
@inco/=node_modules/@inco/
@openzeppelin/=node_modules/@openzeppelin/
```

#### 3. Import in Your Contract
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@inco/lightning/src/Lib.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
```

### Basic Contract Structure

```solidity
pragma solidity ^0.8.24;

import {euint256, ebool, e} from "@inco/lightning/Lib.sol";

contract ConfidentialGiftCard {
    using e for *;

    // Encrypted mappings
    mapping(address => euint256) private balances;
    mapping(uint256 => euint256) private giftCardValues;
    mapping(uint256 => ebool) private giftCardActive;

    constructor() {
        // Initialize contract
    }

    function createGiftCard(
        uint256 cardId,
        bytes memory valueInput
    ) external {
        euint256 value = valueInput.newEuint256(msg.sender);
        giftCardValues[cardId] = value;
        giftCardActive[cardId] = true.asEbool();
    }

    function redeemGiftCard(
        uint256 cardId
    ) external returns (ebool success) {
        ebool isActive = giftCardActive[cardId];
        euint256 cardValue = giftCardValues[cardId];

        // Conditional logic with encrypted data
        success = isActive;
        euint256 transferAmount = success.select(
            cardValue,
            uint256(0).asEuint256()
        );

        balances[msg.sender] = balances[msg.sender].add(transferAmount);
        giftCardActive[cardId] = success.select(
            false.asEbool(),
            isActive
        );

        return success;
    }
}
```

---

## JavaScript SDK

### Installation
```bash
npm install fhevmjs
```

### Basic Setup

#### Node.js Environment
```javascript
import { createFhevmInstance } from "fhevmjs/node";

const createInstance = async () => {
  const instance = await createFhevmInstance({
    networkUrl: "https://your-network-url",
    gatewayUrl: "https://your-gateway-url",
  });
  return instance;
};
```

#### Browser/React Environment
```javascript
import { createFhevmInstance } from "fhevmjs";

const createInstance = async () => {
  const instance = await createFhevmInstance({
    networkUrl: "https://your-network-url",
    gatewayUrl: "https://your-gateway-url",
  });
  return instance;
};
```

### Encryption & Usage

#### Encrypting Inputs
```javascript
// Create encrypted input for a contract
const input = await fhevmInstance.createEncryptedInput(
  contractAddress,
  userAddress
);

// Add different data types
input.add64(1000); // For euint64
input.add32(500);  // For euint32
input.addBool(true); // For ebool

// Encrypt the input
const encryptedInput = input.encrypt();

// Use in transaction
const tx = await contract.someFunction(
  encryptedInput.handles[0],
  encryptedInput.inputProof,
  { gasLimit: 500000 }
);
```

#### Re-encryption for Reading Data
```javascript
// Generate ephemeral key pair
const { publicKey, privateKey } = fhevmInstance.generateKeypair();

// Create EIP-712 signature for reencryption
const eip712 = fhevmInstance.createEIP712(publicKey, contractAddress);
const signature = await signer.signTypedData(
  eip712.domain,
  eip712.types,
  eip712.message
);

// Request reencryption
const encryptedBalance = await contract.getEncryptedBalance(
  userAddress,
  publicKey,
  signature
);

// Decrypt locally
const balance = fhevmInstance.decrypt(contractAddress, encryptedBalance, privateKey);
```

---

## Encrypted Data Types

### Available Types
- `ebool` - Encrypted boolean
- `euint8` - Encrypted 8-bit unsigned integer
- `euint16` - Encrypted 16-bit unsigned integer
- `euint32` - Encrypted 32-bit unsigned integer
- `euint64` - Encrypted 64-bit unsigned integer
- `euint256` - Encrypted 256-bit unsigned integer
- `eaddress` - Encrypted address
- `estring` - Encrypted string

### Type Conversion
```solidity
// Convert plaintext to encrypted
euint256 encryptedValue = uint256(1000).asEuint256();
ebool encryptedBool = true.asEbool();

// From user input (encrypted on client side)
euint256 userValue = inputData.newEuint256(msg.sender);
```

---

## Operations

### Mathematical Operations
```solidity
euint256 a = uint256(10).asEuint256();
euint256 b = uint256(5).asEuint256();

euint256 sum = a.add(b);        // Addition
euint256 diff = a.sub(b);       // Subtraction
euint256 product = a.mul(b);    // Multiplication
euint256 quotient = a.div(b);   // Division
euint256 remainder = a.rem(b);  // Remainder
```

### Bitwise Operations
```solidity
euint256 result1 = a.and(b);    // Bitwise AND
euint256 result2 = a.or(b);     // Bitwise OR
euint256 result3 = a.xor(b);    // Bitwise XOR
euint256 result4 = a.shl(2);    // Shift left
euint256 result5 = a.shr(2);    // Shift right
```

### Comparison Operations
```solidity
ebool isEqual = a.eq(b);        // Equal
ebool isNotEqual = a.ne(b);     // Not equal
ebool isGreater = a.gt(b);      // Greater than
ebool isGreaterEq = a.ge(b);    // Greater than or equal
ebool isLess = a.lt(b);         // Less than
ebool isLessEq = a.le(b);       // Less than or equal

euint256 minimum = a.min(b);    // Minimum value
euint256 maximum = a.max(b);    // Maximum value
```

### Conditional Operations
```solidity
ebool condition = a.gt(b);
euint256 result = condition.select(
    uint256(100).asEuint256(),  // Value if true
    uint256(0).asEuint256()     // Value if false
);
```

---

## Access Control

### Handle-based Access Control
Inco uses a handle-based system where encrypted values can only be accessed by authorized addresses:

```solidity
contract GiftCardMarketplace {
    using e for *;

    mapping(address => euint256) private balances;

    function transfer(
        address to,
        euint256 amount
    ) external returns (ebool success) {
        // Check if sender has access to the encrypted amount
        require(
            msg.sender.isAllowed(amount),
            "Unauthorized access to encrypted value"
        );

        success = balances[msg.sender].ge(amount);
        euint256 transferAmount = success.select(amount, uint256(0).asEuint256());

        balances[msg.sender] = balances[msg.sender].sub(transferAmount);
        balances[to] = balances[to].add(transferAmount);

        return success;
    }
}
```

---

## Decryption & Re-encryption

### Two Types of Decryption

#### 1. Global Decryption (`e.asyncDecrypt`)
For making data publicly available on-chain:

```solidity
contract PublicAuction {
    using e for *;

    euint256 private encryptedHighestBid;
    uint256 public highestBid;

    function revealHighestBid() external onlyOwner {
        // This will trigger async decryption
        uint256[] memory cts = new uint256[](1);
        cts[0] = e.getCiphertext(encryptedHighestBid);

        e.asyncDecrypt(cts);
    }

    // Callback function called by decryption network
    function fulfillDecryption(
        uint256 requestId,
        uint256[] memory plaintexts
    ) external onlyGateway {
        require(plaintexts.length == 1, "Invalid response");
        highestBid = plaintexts[0];
    }
}
```

#### 2. Re-encryption
For private user access:

```solidity
contract PrivateBalance {
    using e for *;

    mapping(address => euint256) private balances;

    function getBalance(
        address user,
        bytes32 publicKey,
        bytes memory signature
    ) external view returns (bytes memory) {
        require(msg.sender == user || isOwner(), "Unauthorized");

        return balances[user].reencrypt(publicKey, signature);
    }
}
```

---

## Best Practices

### 1. Gas Optimization
- Minimize operations on encrypted data
- Use conditional operations (`select`) instead of if/else
- Batch operations when possible

### 2. Security Considerations
- Always validate access control for encrypted handles
- Use proper randomness for encrypted operations
- Implement proper access patterns

### 3. Error Handling
```solidity
contract SecureGiftCard {
    using e for *;

    function safeTransfer(
        address to,
        euint256 amount
    ) external returns (ebool success) {
        require(to != address(0), "Invalid recipient");
        require(
            msg.sender.isAllowed(amount),
            "Unauthorized amount access"
        );

        success = balances[msg.sender].ge(amount);

        // Only proceed if balance is sufficient
        euint256 transferAmount = success.select(
            amount,
            uint256(0).asEuint256()
        );

        balances[msg.sender] = balances[msg.sender].sub(transferAmount);
        balances[to] = balances[to].add(transferAmount);

        return success;
    }
}
```