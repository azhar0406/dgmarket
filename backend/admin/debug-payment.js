// debug-payment.js
// Clean simple script to complete Card #3 purchase

const { ethers } = require('ethers');
require('dotenv').config();

async function completePurchase() {
  console.log('🎁 Completing purchase for Card #3...');
  
  try {
    // Check environment
    if (!process.env.ADMIN_PRIVATE_KEY) {
      console.log('❌ Missing ADMIN_PRIVATE_KEY in .env');
      return;
    }
    
    if (!process.env.BASE_SEPOLIA_RPC) {
      console.log('❌ Missing BASE_SEPOLIA_RPC in .env');
      return;
    }
    
    // Setup connection with your Ankr RPC
    console.log(`📡 Connecting to: ${process.env.BASE_SEPOLIA_RPC}`);
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);
    const signer = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    
    console.log(`🔑 Admin: ${signer.address}`);
    
    // Test connection
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected - Block: ${blockNumber}`);
    
    // Setup contract
    const contractAddress = '0xd9F2A41902524d20F12B3f2784d2F0962E0090cE';
    const abi = [
      "function purchaseGiftCardOnBehalf(address user, uint256 cardId) external"
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, signer);
    
    // Execute purchase
    console.log('\n🚀 Purchasing Card #3 for user...');
    console.log(`   User: 0x0D9f77503dA9d5EC2497b1619Fc3c04464309859`);
    
    const tx = await contract.purchaseGiftCardOnBehalf(
      '0x0D9f77503dA9d5EC2497b1619Fc3c04464309859',
      3
    );
    
    console.log(`📡 TX Hash: ${tx.hash}`);
    console.log('⏳ Confirming...');
    
    await tx.wait();
    
    console.log('\n🎉 SUCCESS!');
    console.log('✅ Gift card assigned to user');
    console.log('✅ User should see card in "My Cards" page now');
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    
    if (error.message.includes('AccessControl') || error.message.includes('admin')) {
      console.log('\n🔧 ADMIN ROLE ISSUE:');
      console.log('   Your admin address needs ADMIN_ROLE in the contract');
      console.log('   From contract owner, run:');
      console.log(`   grantRole(ADMIN_ROLE, "${process.env.ADMIN_ADDRESS || signer?.address}")`);
    } else if (error.message.includes('purchased')) {
      console.log('\n✅ Card might already be purchased - check "My Cards"');
    } else {
      console.log('\n🔧 Other possible issues:');
      console.log('   - Admin needs ETH for gas');
      console.log('   - Card ID invalid');
      console.log('   - Network connection issue');
    }
  }
}

completePurchase();