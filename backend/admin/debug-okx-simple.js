// debug-okx-simple.js
// Minimal OKX API test with better environment variable handling

const axios = require('axios');
const CryptoJS = require('crypto-js');
require('dotenv').config();

async function testOKXQuote() {
    console.log('🧪 Testing OKX API with minimal setup...');
    
    // Debug environment variables first
    console.log('\n🔍 Environment Variables Check:');
    console.log('OKX_API_KEY exists:', !!process.env.OKX_API_KEY);
    console.log('OKX_SECRET_KEY exists:', !!process.env.OKX_SECRET_KEY);
    console.log('OKX_API_PASSPHRASE exists:', !!process.env.OKX_API_PASSPHRASE);
    console.log('OKX_PROJECT_ID exists:', !!process.env.OKX_PROJECT_ID);
    
    // Show first few characters to verify
    if (process.env.OKX_API_KEY) {
        console.log('API Key preview:', process.env.OKX_API_KEY.slice(0, 8) + '...');
    }
    if (process.env.OKX_API_PASSPHRASE) {
        console.log('Passphrase preview:', '"' + process.env.OKX_API_PASSPHRASE + '"');
        console.log('Passphrase length:', process.env.OKX_API_PASSPHRASE.length);
    }
    if (process.env.OKX_PROJECT_ID) {
        console.log('Project ID preview:', process.env.OKX_PROJECT_ID.slice(0, 8) + '...');
    }
    
    // Your exact transaction amount
    const ethAmount = '280555555555556'; // 0.000280555555555556 ETH in wei
    
    console.log(`\nTesting with: ${ethAmount} wei (${parseFloat(ethAmount) / 1e18} ETH)`);
    
    // Test with authentication
    console.log('\n🔍 Testing with authentication...');
    try {
        const timestamp = new Date().toISOString();
        const requestPath = '/api/v5/dex/aggregator/quote';
        
        const params = {
            chainIndex: '8453',
            fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            toTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            amount: ethAmount,
            slippage: '0.005'
        };
        
        const queryString = "?" + new URLSearchParams(params).toString();
        
        // Get credentials with error handling
        const apiKey = process.env.OKX_API_KEY;
        const secretKey = process.env.OKX_SECRET_KEY;
        const apiPassphrase = process.env.OKX_API_PASSPHRASE+"$";
        const projectId = process.env.OKX_PROJECT_ID;
        
        if (!apiKey || !secretKey || !apiPassphrase || !projectId) {
            console.log('❌ Missing OKX credentials:');
            console.log('  API Key:', !!apiKey);
            console.log('  Secret Key:', !!secretKey);
            console.log('  Passphrase:', !!apiPassphrase);
            console.log('  Project ID:', !!projectId);
            return;
        }
        
        console.log('\n📝 Creating signature...');
        const stringToSign = timestamp + 'GET' + requestPath + queryString;
        console.log('String to sign:', stringToSign);
        
        let signature;
        try {
            signature = CryptoJS.enc.Base64.stringify(
                CryptoJS.HmacSHA256(stringToSign, secretKey)
            );
            console.log('✅ Signature created successfully');
        } catch (sigError) {
            console.log('❌ Signature creation failed:', sigError.message);
            return;
        }
        
        const headers = {
            "Content-Type": "application/json",
            "OK-ACCESS-KEY": apiKey,
            "OK-ACCESS-SIGN": signature,
            "OK-ACCESS-TIMESTAMP": timestamp,
            "OK-ACCESS-PASSPHRASE": apiPassphrase,
            "OK-ACCESS-PROJECT": projectId,
        };
        
        console.log('\n📡 Request details:');
        console.log(`URL: https://web3.okx.com${requestPath}${queryString}`);
        console.log('Headers (sanitized):');
        console.log({
            "Content-Type": headers["Content-Type"],
            "OK-ACCESS-KEY": headers["OK-ACCESS-KEY"].slice(0, 8) + "...",
            "OK-ACCESS-SIGN": headers["OK-ACCESS-SIGN"].slice(0, 8) + "...",
            "OK-ACCESS-TIMESTAMP": headers["OK-ACCESS-TIMESTAMP"],
            "OK-ACCESS-PASSPHRASE": '"' + headers["OK-ACCESS-PASSPHRASE"] + '"',
            "OK-ACCESS-PROJECT": headers["OK-ACCESS-PROJECT"].slice(0, 8) + "..."
        });
        
        console.log('\n📞 Making API request...');
        const response = await axios.get(`https://web3.okx.com${requestPath}`, {
            params,
            headers,
            timeout: 10000
        });
        
        console.log('✅ Authenticated request successful!');
        console.log('Status:', response.status);
        console.log('Response code:', response.data.code);
        
        if (response.data.code === '0') {
            const quote = response.data.data[0];
            const fromAmount = parseFloat(quote.fromTokenAmount) / 1e18;
            const toAmount = parseFloat(quote.toTokenAmount) / 1e6;
            
            console.log('\n💱 Quote Details:');
            console.log(`Input: ${fromAmount} ETH`);
            console.log(`Output: ${toAmount.toFixed(6)} USDC`);
            console.log(`Rate: 1 ETH = ${(toAmount / fromAmount).toFixed(2)}`);
        }
        
        console.log('\nFull response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Authenticated request failed:');
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log('Error data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Network/Code error:', error.message);
            console.log('Error details:', error);
        }
    }
}

async function main() {
    console.log('🎯 OKX API Debug Tool (Enhanced)');
    console.log('=================================');
    
    await testOKXQuote();
}

if (require.main === module) {
    main().catch(console.error);
}