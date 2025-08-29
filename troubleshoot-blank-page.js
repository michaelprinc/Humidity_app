#!/usr/bin/env node

/**
 * Quick Troubleshooting Script for Blank Page Issue
 * This will help identify the exact cause of the problem
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Troubleshooting Humidity App Blank Page Issue');
console.log('================================================\n');

// Check if all required files exist
const requiredFiles = [
  'src/main.jsx',
  'src/App.jsx', 
  'src/Layout.jsx',
  'src/HumidityHub.jsx',
  'src/index.css',
  'src/integrations/WeatherAPICore.js',
  'src/components/ClimateDisplayCard.jsx',
  'src/components/ComparisonResult.jsx',
  'src/components/LocationPermission.jsx',
  'src/components/VentilationForecast.jsx',
  '.env'
];

console.log('📁 Checking Required Files:');
for (const file of requiredFiles) {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
}

console.log('\n🔧 Checking UI Components:');
const uiComponents = [
  'src/components/ui/card.jsx',
  'src/components/ui/button.jsx',
  'src/components/ui/input.jsx',
  'src/components/ui/label.jsx',
  'src/components/ui/alert.jsx',
  'src/components/ui/skeleton.jsx'
];

for (const component of uiComponents) {
  const exists = fs.existsSync(component);
  console.log(`   ${exists ? '✅' : '❌'} ${component}`);
}

// Check .env configuration
console.log('\n🔑 Checking API Configuration:');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasApiKey = envContent.includes('REACT_APP_WEATHERAPI_KEY=') && !envContent.includes('your_weatherapi_key_here');
  console.log(`   ${hasApiKey ? '✅' : '❌'} API Key configured`);
  
  const hasDebugMode = envContent.includes('REACT_APP_WEATHER_DEBUG=true');
  console.log(`   ${hasDebugMode ? '✅' : '❌'} Debug mode enabled`);
} else {
  console.log('   ❌ .env file missing');
}

// Check for common import issues
console.log('\n🔗 Checking Import Statements:');

function checkImports(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const badImports = content.match(/@\/src\//g);
  
  return !badImports || badImports.length === 0;
}

const filesToCheck = [
  'src/HumidityHub.jsx',
  'src/components/VentilationForecast.jsx',
  'src/components/ClimateDisplayCard.jsx',
  'src/components/ComparisonResult.jsx',
  'src/components/LocationPermission.jsx'
];

for (const file of filesToCheck) {
  const importsOk = checkImports(file);
  console.log(`   ${importsOk ? '✅' : '❌'} ${file} imports`);
}

console.log('\n📦 Checking Package Dependencies:');
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['react', 'react-dom', 'framer-motion', 'lucide-react'];
  
  for (const dep of requiredDeps) {
    const exists = pkg.dependencies && pkg.dependencies[dep];
    console.log(`   ${exists ? '✅' : '❌'} ${dep}`);
  }
}

console.log('\n🚀 Recommendations:');
console.log('1. Open browser console (F12) and check for JavaScript errors');
console.log('2. Verify all files listed above exist');
console.log('3. Ensure import paths use relative paths (./...) instead of @/src/');
console.log('4. Check that .env file has valid API key');
console.log('5. Try: npm install (to reinstall dependencies)');
console.log('6. Try: Ctrl+F5 (hard refresh in browser)');

console.log('\n🔧 Next Debugging Steps:');
console.log('1. Check browser Network tab for failed file loads');
console.log('2. Verify Vite server is serving files correctly');
console.log('3. Test with a minimal React component');

console.log('\n📞 If issue persists:');
console.log('- Check browser console for specific error messages');
console.log('- Try opening http://localhost:3000/ in private/incognito mode'); 
console.log('- Restart VS Code and run npm run dev again');
