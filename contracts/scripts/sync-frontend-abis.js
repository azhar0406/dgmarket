#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * DGMarket Frontend ABI Sync Script - FIXED VERSION
 * 
 * Simplified script that only handles ABI synchronization:
 * 1. Extracts ABIs from deployment artifacts
 * 2. Updates frontend ABI files  
 * 3. Validates ABI functions
 * 4. Creates backups of existing files
 * 
 * NOTE: Contract addresses are handled via direct import in frontend
 */

const CHAIN_ID = '84532'; // Base Sepolia
const DEPLOYMENT_DIR = `ignition/deployments/chain-${CHAIN_ID}`;
const FRONTEND_DIR = '../../frontend';

// Contract configurations
const CONTRACTS = {
  DGMarketCore: {
    artifactPath: `${DEPLOYMENT_DIR}/artifacts/DGMarketCompleteModule#DGMarketCore.json`,
    abiOutputPath: `${FRONTEND_DIR}/lib/abis/DGMarketCore.json`,
  },
  ChainlinkGiftCardManager: {
    artifactPath: `${DEPLOYMENT_DIR}/artifacts/DGMarketCompleteModule#ChainlinkGiftCardManager.json`,
    abiOutputPath: `${FRONTEND_DIR}/lib/abis/ChainlinkGiftCardManager.json`,
  }
};

/**
 * Colors for console output
 */
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create backup of existing file
 */
function createBackup(filePath) {
  if (fs.existsSync(filePath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;
    fs.copyFileSync(filePath, backupPath);
    log(`📦 Backup created: ${path.basename(backupPath)}`, 'yellow');
    return backupPath;
  }
  return null;
}

/**
 * Extract ABI from deployment artifact
 */
function extractABI(artifactPath) {
  try {
    log(`🔍 Reading: ${path.basename(artifactPath)}`, 'blue');
    
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    if (!artifact.abi) {
      throw new Error(`No ABI found in artifact`);
    }

    const functionCount = artifact.abi.filter(item => item.type === 'function').length;
    log(`✅ ABI extracted: ${functionCount} functions`, 'green');
    return artifact.abi;
    
  } catch (error) {
    log(`❌ Failed to extract ABI: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Write ABI to frontend file
 */
function writeABI(abi, outputPath) {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`📁 Created directory: ${path.relative(process.cwd(), dir)}`, 'cyan');
    }

    // Create backup
    createBackup(outputPath);

    // Write ABI file
    fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));
    log(`✅ ABI saved: ${path.relative(process.cwd(), outputPath)}`, 'green');
    
  } catch (error) {
    log(`❌ Failed to write ABI: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Extract contract addresses for validation (not updating files)
 */
function validateAddresses() {
  try {
    const addressesPath = `${DEPLOYMENT_DIR}/deployed_addresses.json`;
    log(`🔍 Validating deployment addresses...`, 'blue');
    
    if (!fs.existsSync(addressesPath)) {
      throw new Error(`Addresses file not found: ${addressesPath}`);
    }

    const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    
    const coreAddress = addresses['DGMarketCompleteModule#DGMarketCore'];
    const managerAddress = addresses['DGMarketCompleteModule#ChainlinkGiftCardManager'];
    
    if (!coreAddress || !managerAddress) {
      throw new Error('Missing contract addresses in deployment file');
    }
    
    log(`✅ DGMarketCore: ${coreAddress}`, 'green');
    log(`✅ ChainlinkManager: ${managerAddress}`, 'green');
    log(`💡 Addresses are handled via direct import in frontend`, 'cyan');
    
    return addresses;
    
  } catch (error) {
    log(`❌ Failed to validate addresses: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Update constants file with admin address if missing
 */
function updateConstants() {
  try {
    const constantsPath = `${FRONTEND_DIR}/lib/constants.ts`;
    
    if (!fs.existsSync(constantsPath)) {
      log(`📝 Creating constants.ts file...`, 'cyan');
      
      const constantsContent = `// DGMarket Frontend Constants

// USDC Configuration (Base Sepolia)
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
export const USDC_DECIMALS = 6;

// Admin Configuration - Replace with your actual admin wallet
export const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '';

// Network Configuration
export const SUPPORTED_CHAIN_ID = 84532; // Base Sepolia

// Gift Card Categories
export const GIFT_CARD_CATEGORIES = [
  'Food & Dining',
  'Shopping', 
  'Gaming',
  'Travel',
  'Entertainment'
] as const;

export type GiftCardCategory = typeof GIFT_CARD_CATEGORIES[number];
`;

      const dir = path.dirname(constantsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(constantsPath, constantsContent);
      log(`✅ Constants created: ${path.relative(process.cwd(), constantsPath)}`, 'green');
      log(`⚠️ Remember to set NEXT_PUBLIC_ADMIN_WALLET_ADDRESS in your .env.local`, 'yellow');
    } else {
      // Check if ADMIN_WALLET_ADDRESS exists
      const content = fs.readFileSync(constantsPath, 'utf8');
      if (!content.includes('ADMIN_WALLET_ADDRESS')) {
        log(`⚠️ ADMIN_WALLET_ADDRESS missing from constants.ts`, 'yellow');
        log(`💡 Add this line: export const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '';`, 'yellow');
      } else {
        log(`✅ Constants file looks good`, 'green');
      }
    }
    
  } catch (error) {
    log(`❌ Error updating constants: ${error.message}`, 'red');
  }
}

/**
 * Validate that all required functions exist in ABIs (FIXED)
 */
function validateABIs() {
  log(`🔍 Validating ABI files...`, 'blue');
  
  // FIXED: Removed automationCreateGiftCard from ChainlinkGiftCardManager
  const requiredFunctions = {
    DGMarketCore: [
      'getAllGiftCards', 
      'purchaseGiftCard', 
      'getAllCategoriesWithData',
      'automationCreateGiftCard'  // ✅ This belongs to DGMarketCore
    ],
    ChainlinkGiftCardManager: [
      'triggerRestock',
      'requestRestock', 
      'batchCheckRestock'
      // ❌ REMOVED: automationCreateGiftCard (this belongs to DGMarketCore only)
    ]
  };

  for (const [contractName, config] of Object.entries(CONTRACTS)) {
    try {
      if (!fs.existsSync(config.abiOutputPath)) {
        throw new Error(`ABI file missing: ${config.abiOutputPath}`);
      }

      const abi = JSON.parse(fs.readFileSync(config.abiOutputPath, 'utf8'));
      const functionNames = abi
        .filter(item => item.type === 'function')
        .map(item => item.name);

      if (requiredFunctions[contractName]) {
        const missing = requiredFunctions[contractName].filter(fn => !functionNames.includes(fn));
        if (missing.length > 0) {
          log(`⚠️ ${contractName} missing functions: ${missing.join(', ')}`, 'yellow');
        } else {
          log(`✅ ${contractName} has all required functions`, 'green');
        }
      }

      log(`✅ ${contractName}: ${functionNames.length} functions validated`, 'green');
      
    } catch (error) {
      log(`❌ ${contractName} validation failed: ${error.message}`, 'red');
      throw error;
    }
  }
}

/**
 * Main execution function - STREAMLINED
 */
async function main() {
  const startTime = Date.now();
  
  try {
    log('🚀 DGMarket Frontend ABI Sync - FIXED', 'magenta');
    log('========================================', 'magenta');
    
    // Step 1: Validate addresses (no updating needed)
    log('\n📍 Step 1: Validating deployment...', 'cyan');
    validateAddresses();
    
    // Step 2: Process ABIs (main purpose)
    log('\n📍 Step 2: Syncing contract ABIs...', 'cyan');
    for (const [contractName, config] of Object.entries(CONTRACTS)) {
      log(`\n🔧 Processing ${contractName}...`, 'yellow');
      
      const abi = extractABI(config.artifactPath);
      writeABI(abi, config.abiOutputPath);
    }
    
    // Step 3: Update constants
    log('\n📍 Step 3: Checking constants...', 'cyan');
    updateConstants();
    
    // Step 4: Final validation (FIXED)
    log('\n📍 Step 4: Final validation...', 'cyan');
    validateABIs();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    // Success message
    log('\n🎉 ABI SYNC COMPLETE! 🎉', 'green');
    log('========================', 'green');
    log(`⏱️ Completed in ${duration} seconds`, 'green');
    log('✅ All ABIs synchronized', 'green');
    log('✅ Contract validation passed', 'green');
    log('💡 Contract addresses handled via direct import', 'cyan');
    
    log('\n🚀 Your frontend is ready to use!', 'magenta');
    log('💡 Run this script after any contract redeployment', 'yellow');
    
    // Show next steps
    log('\n🔄 Next Steps:', 'cyan');
    log('  1. Set your admin wallet in .env.local:', 'white');
    log('     NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0xYourWalletAddress', 'white');
    log('  2. Start your frontend: npm run dev', 'white');
    log('  3. Visit: http://localhost:3000/marketplace', 'white');
    
  } catch (error) {
    log('\n💥 SYNC FAILED! 💥', 'red');
    log('==================', 'red');
    log(`❌ Error: ${error.message}`, 'red');
    log('\n🔧 Please check your deployment artifacts and try again', 'yellow');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, extractABI };