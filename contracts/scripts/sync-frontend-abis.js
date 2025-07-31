#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * FIXED PATH ABI SYNC - Target the correct directory where frontend imports from
 */

const CHAIN_ID = '84532';
const DEPLOYMENT_DIR = `ignition/deployments/chain-${CHAIN_ID}`;
// 🎯 FIXED: Point to the correct frontend directory where frontend actually imports from
const FRONTEND_DIR = '../../dgmarket/frontend';

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

function fixPathAndSync() {
  log('🎯 FIXED PATH ABI SYNC', 'magenta');
  log('======================', 'magenta');
  log('Now targeting the CORRECT directory where frontend imports from\n', 'cyan');
  
  const abisDir = path.resolve(`${FRONTEND_DIR}/lib/abis`);
  log(`📁 Target directory: ${abisDir}`, 'cyan');
  
  // Check current files in the target directory
  log('\n📄 Current files in TARGET directory:', 'yellow');
  if (fs.existsSync(abisDir)) {
    const files = fs.readdirSync(abisDir);
    files.forEach(file => {
      const filePath = path.join(abisDir, file);
      const stats = fs.statSync(filePath);
      log(`   - ${file} (${stats.size} bytes, ${stats.mtime})`, 'white');
      
      // Check DGMarketCore specifically
      if (file === 'DGMarketCore.json') {
        try {
          const abi = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const purchaseFunction = abi.find(fn => fn.type === 'function' && fn.name === 'purchaseGiftCard');
          if (purchaseFunction) {
            log(`     🎯 OLD purchaseGiftCard: ${purchaseFunction.inputs?.length || 0} inputs (WILL BE UPDATED)`, 'red');
          }
        } catch (e) {
          log(`     ⚠️ Cannot read current ABI`, 'yellow');
        }
      }
    });
  } else {
    log('❌ Target directory does not exist!', 'red');
    return;
  }
  
  // Now update the ABIs in the correct location
  const contracts = {
    DGMarketCore: {
      artifactPath: `${DEPLOYMENT_DIR}/artifacts/DGMarketCompleteModule#DGMarketCore.json`,
      abiOutputPath: `${FRONTEND_DIR}/lib/abis/DGMarketCore.json`,
    },
    ChainlinkGiftCardManager: {
      artifactPath: `${DEPLOYMENT_DIR}/artifacts/DGMarketCompleteModule#ChainlinkGiftCardManager.json`,
      abiOutputPath: `${FRONTEND_DIR}/lib/abis/ChainlinkGiftCardManager.json`,
    }
  };
  
  log('\n🔄 UPDATING ABIs IN CORRECT LOCATION:', 'yellow');
  
  for (const [contractName, config] of Object.entries(contracts)) {
    log(`\n🔧 Processing ${contractName}:`, 'yellow');
    
    const artifactPath = path.resolve(config.artifactPath);
    if (!fs.existsSync(artifactPath)) {
      log(`❌ Artifact not found: ${artifactPath}`, 'red');
      continue;
    }
    
    try {
      // Read artifact
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      if (!artifact.abi) {
        log(`❌ No ABI in artifact`, 'red');
        continue;
      }
      
      const functions = artifact.abi.filter(item => item.type === 'function');
      log(`📖 Found ${functions.length} functions in artifact`, 'cyan');
      
      // Check purchaseGiftCard in artifact
      if (contractName === 'DGMarketCore') {
        const purchaseFunction = functions.find(fn => fn.name === 'purchaseGiftCard');
        if (purchaseFunction) {
          log(`🎯 NEW purchaseGiftCard: ${purchaseFunction.inputs?.length || 0} inputs`, 'green');
          if (purchaseFunction.inputs) {
            purchaseFunction.inputs.forEach((input, i) => {
              log(`   ${i + 1}. ${input.name}: ${input.type}`, 'white');
            });
          }
        }
      }
      
      // Write to correct location
      const outputPath = path.resolve(config.abiOutputPath);
      log(`💾 Writing to CORRECT location: ${outputPath}`, 'cyan');
      
      fs.writeFileSync(outputPath, JSON.stringify(artifact.abi, null, 2));
      
      // Verify
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        log(`✅ SUCCESSFULLY updated (${stats.size} bytes)`, 'green');
        
        // Double-check the content
        const writtenABI = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        const writtenFunctions = writtenABI.filter(item => item.type === 'function');
        
        if (contractName === 'DGMarketCore') {
          const writtenPurchaseFunction = writtenFunctions.find(fn => fn.name === 'purchaseGiftCard');
          if (writtenPurchaseFunction) {
            log(`🎯 VERIFIED: purchaseGiftCard now has ${writtenPurchaseFunction.inputs?.length || 0} inputs`, 'green');
          }
        }
      }
      
    } catch (error) {
      log(`❌ Error processing ${contractName}: ${error.message}`, 'red');
    }
  }
  
  // Final verification
  log('\n✅ FINAL VERIFICATION:', 'magenta');
  log('=====================', 'magenta');
  
  const finalABIPath = path.resolve(`${FRONTEND_DIR}/lib/abis/DGMarketCore.json`);
  if (fs.existsSync(finalABIPath)) {
    const finalABI = JSON.parse(fs.readFileSync(finalABIPath, 'utf8'));
    const finalPurchaseFunction = finalABI.find(fn => fn.type === 'function' && fn.name === 'purchaseGiftCard');
    
    if (finalPurchaseFunction) {
      log(`🎉 SUCCESS! purchaseGiftCard now has ${finalPurchaseFunction.inputs?.length || 0} inputs`, 'green');
      log(`📄 File location: ${finalABIPath}`, 'cyan');
      log(`🎯 This is where your frontend imports from!`, 'green');
    } else {
      log(`❌ purchaseGiftCard not found in final ABI`, 'red');
    }
  } else {
    log(`❌ Final ABI file not found`, 'red');
  }
  
  log('\n🚀 READY TO TEST:', 'magenta');
  log('================', 'magenta');
  log('✅ ABI updated in CORRECT location', 'green');
  log('✅ Frontend should now import correct ABI', 'green');
  log('🔄 Restart your frontend server and test purchase!', 'yellow');
}

if (require.main === module) {
  fixPathAndSync();
}

module.exports = { fixPathAndSync };