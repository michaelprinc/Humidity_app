#!/usr/bin/env node

/**
 * Migration Script: Switch from Mock Weather to WeatherAPI.com
 * 
 * This script updates your React components to use the new WeatherAPI.com
 * integration instead of the mock weather implementation.
 */

import fs from 'fs';
import path from 'path';

// Configuration
const FILES_TO_UPDATE = [
  'src/HumidityHub.jsx',
  'src/components/VentilationForecast.jsx',
  // Add other files that import from Core.js if needed
];

const OLD_IMPORT = `import { InvokeLLM } from '@/src/integrations/Core';`;
const NEW_IMPORT = `import { InvokeLLM } from '@/src/integrations/WeatherAPICore';`;

const OLD_IMPORT_ALT = `import { InvokeLLM } from '../integrations/Core.js';`;
const NEW_IMPORT_ALT = `import { InvokeLLM } from '../integrations/WeatherAPICore.js';`;

function updateFile(filePath) {
  try {
    console.log(`🔄 Updating ${filePath}...`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Replace imports
    if (content.includes(OLD_IMPORT)) {
      content = content.replace(OLD_IMPORT, NEW_IMPORT);
      updated = true;
      console.log(`   ✅ Updated import statement`);
    }
    
    if (content.includes(OLD_IMPORT_ALT)) {
      content = content.replace(OLD_IMPORT_ALT, NEW_IMPORT_ALT);
      updated = true;
      console.log(`   ✅ Updated relative import statement`);
    }
    
    if (updated) {
      // Create backup
      const backupPath = `${filePath}.backup`;
      fs.writeFileSync(backupPath, fs.readFileSync(filePath));
      console.log(`   📄 Backup created: ${backupPath}`);
      
      // Write updated content
      fs.writeFileSync(filePath, content);
      console.log(`   ✅ File updated successfully`);
      return true;
    } else {
      console.log(`   ℹ️  No changes needed`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('🚀 WeatherAPI.com Migration Script');
  console.log('==================================\n');
  
  // Check if WeatherAPI integration exists
  const weatherApiFile = 'src/integrations/WeatherAPICore.js';
  if (!fs.existsSync(weatherApiFile)) {
    console.log('❌ WeatherAPI integration not found!');
    console.log('Please ensure WeatherAPICore.js exists in src/integrations/');
    process.exit(1);
  }
  
  console.log('✅ WeatherAPI integration found');
  
  // Check if .env exists
  if (!fs.existsSync('.env')) {
    console.log('⚠️  .env file not found. Please run: npm run setup-weather');
    process.exit(1);
  }
  
  console.log('✅ Configuration file found');
  console.log('');
  
  let totalUpdated = 0;
  
  // Update each file
  FILES_TO_UPDATE.forEach(filePath => {
    if (updateFile(filePath)) {
      totalUpdated++;
    }
  });
  
  console.log('\\n📊 Migration Summary:');
  console.log(`   Files processed: ${FILES_TO_UPDATE.length}`);
  console.log(`   Files updated: ${totalUpdated}`);
  console.log(`   Files unchanged: ${FILES_TO_UPDATE.length - totalUpdated}`);
  
  if (totalUpdated > 0) {
    console.log('\\n🎉 Migration completed successfully!');
    console.log('\\n📋 Next Steps:');
    console.log('1. Test your app: npm run dev');
    console.log('2. Check browser console for weather API calls');
    console.log('3. Verify real weather data is displayed');
    console.log('\\n💡 Rollback: If needed, restore from .backup files');
  } else {
    console.log('\\n✅ No migration needed - all files already up to date!');
  }
  
  console.log('\\n🌤️  Your app now uses real weather data from WeatherAPI.com!');
}

main();
