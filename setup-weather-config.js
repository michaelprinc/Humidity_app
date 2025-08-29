#!/usr/bin/env node

/**
 * WeatherAPI.com Configuration Setup Script
 * 
 * This script helps you set up the WeatherAPI.com configuration
 * by creating the .env file and validating your API key.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const CONFIG_FILE = '.env';
const TEMPLATE_FILE = '.env.template';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function validateApiKey(apiKey) {
  return new Promise((resolve) => {
    const testUrl = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=London&aqi=no`;
    
    https.get(testUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.current) {
            resolve({ valid: true, message: 'API key is valid!' });
          } else {
            resolve({ valid: false, message: `API Error: ${response.error?.message || 'Invalid response'}` });
          }
        } catch (error) {
          resolve({ valid: false, message: `Parse error: ${error.message}` });
        }
      });
    }).on('error', (error) => {
      resolve({ valid: false, message: `Network error: ${error.message}` });
    });
  });
}

async function main() {
  console.log('🌤️  WeatherAPI.com Configuration Setup');
  console.log('=====================================\n');

  // Check if .env already exists
  if (fs.existsSync(CONFIG_FILE)) {
    const overwrite = await askQuestion('⚠️  .env file already exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  // Get API key from user
  console.log('📋 Please follow these steps:');
  console.log('1. Visit: https://www.weatherapi.com/signup.aspx');
  console.log('2. Create a free account');
  console.log('3. Get your API key from the dashboard');
  console.log('4. Enter it below\n');

  const apiKey = await askQuestion('🔑 Enter your WeatherAPI.com API key: ');

  if (!apiKey || apiKey.trim().length === 0) {
    console.log('❌ No API key provided. Setup cancelled.');
    rl.close();
    return;
  }

  // Validate API key
  console.log('🔍 Validating API key...');
  const validation = await validateApiKey(apiKey.trim());

  if (!validation.valid) {
    console.log(`❌ ${validation.message}`);
    console.log('Please check your API key and try again.');
    rl.close();
    return;
  }

  console.log(`✅ ${validation.message}`);

  // Read template and create .env file
  try {
    let template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    template = template.replace('your_weatherapi_key_here', apiKey.trim());

    fs.writeFileSync(CONFIG_FILE, template);
    console.log('📄 .env file created successfully!');

    // Additional configuration options
    const debugMode = await askQuestion('🐛 Enable debug mode? (y/n): ');
    if (debugMode.toLowerCase() === 'y') {
      const envContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      const updatedContent = envContent.replace('REACT_APP_WEATHER_DEBUG=false', 'REACT_APP_WEATHER_DEBUG=true');
      fs.writeFileSync(CONFIG_FILE, updatedContent);
      console.log('✅ Debug mode enabled');
    }

    console.log('\n🎉 Setup complete!');
    console.log('📊 WeatherAPI.com Free Tier Limits:');
    console.log('   • 1,000,000 calls per month');
    console.log('   • Current weather ✅');
    console.log('   • 3-day forecast ✅');
    console.log('   • Historical data (limited) ✅');
    console.log('\n🚀 You can now start your development server!');

  } catch (error) {
    console.log(`❌ Error creating .env file: ${error.message}`);
  }

  rl.close();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Setup cancelled by user.');
  process.exit(0);
});

main().catch(console.error);
