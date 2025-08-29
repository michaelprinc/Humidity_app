#!/usr/bin/env node

/**
 * Weather Configuration Test Script
 * 
 * This script tests your WeatherAPI.com configuration and validates
 * that everything is working correctly.
 */

import https from 'https';
import fs from 'fs';

// Load environment variables from .env file
function loadEnvFile() {
  try {
    const envFile = fs.readFileSync('.env', 'utf8');
    const lines = envFile.split('\n');
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.log('⚠️  No .env file found. Please run setup first.');
    return false;
  }
  return true;
}

function testApiRequest(url, description) {
  return new Promise((resolve) => {
    console.log(`🔍 Testing ${description}...`);
    
    const startTime = Date.now();
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200 && response.current) {
            console.log(`✅ ${description} - Success (${duration}ms)`);
            console.log(`   Temperature: ${response.current.temp_c}°C`);
            console.log(`   Humidity: ${response.current.humidity}%`);
            console.log(`   Condition: ${response.current.condition.text}`);
            resolve({ success: true, duration, response });
          } else {
            console.log(`❌ ${description} - Failed`);
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Error: ${response.error?.message || 'Unknown error'}`);
            resolve({ success: false, error: response.error?.message });
          }
        } catch (error) {
          console.log(`❌ ${description} - Parse Error`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Raw response: ${data.substring(0, 200)}...`);
          resolve({ success: false, error: error.message });
        }
      });
    }).on('error', (error) => {
      console.log(`❌ ${description} - Network Error`);
      console.log(`   Error: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
  });
}

async function runTests() {
  console.log('🌤️  WeatherAPI.com Configuration Test');
  console.log('===================================\n');

  // Load environment variables
  if (!loadEnvFile()) {
    console.log('Run: npm run setup-weather');
    process.exit(1);
  }

  // Check required environment variables
  const apiKey = process.env.REACT_APP_WEATHERAPI_KEY;
  const baseUrl = process.env.REACT_APP_WEATHERAPI_BASE_URL || 'https://api.weatherapi.com/v1';
  
  if (!apiKey || apiKey === 'your_weatherapi_key_here') {
    console.log('❌ API key not configured properly');
    console.log('Please run: npm run setup-weather');
    process.exit(1);
  }

  console.log('📋 Configuration Check:');
  console.log(`   API Key: ${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Cache Duration: ${process.env.REACT_APP_WEATHER_CACHE_DURATION || '15'} minutes`);
  console.log(`   Debug Mode: ${process.env.REACT_APP_WEATHER_DEBUG || 'false'}`);
  console.log('');

  // Test locations
  const testLocations = [
    { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
    { name: 'New York, US', lat: 40.7128, lon: -74.0060 },
    { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 }
  ];

  const results = {
    current: [],
    forecast: []
  };

  // Test current weather for each location
  console.log('🌍 Testing Current Weather API:');
  for (const location of testLocations) {
    const url = `${baseUrl}/current.json?key=${apiKey}&q=${location.lat},${location.lon}&aqi=no`;
    const result = await testApiRequest(url, `Current weather for ${location.name}`);
    results.current.push({ location: location.name, ...result });
  }

  console.log('\n📊 Testing Forecast API:');
  // Test forecast for one location
  const forecastUrl = `${baseUrl}/forecast.json?key=${apiKey}&q=${testLocations[0].lat},${testLocations[0].lon}&days=3&aqi=no`;
  const forecastResult = await testApiRequest(forecastUrl, `3-day forecast for ${testLocations[0].name}`);
  results.forecast.push({ location: testLocations[0].name, ...forecastResult });

  // Summary
  console.log('\n📈 Test Summary:');
  const currentSuccess = results.current.filter(r => r.success).length;
  const forecastSuccess = results.forecast.filter(r => r.success).length;
  
  console.log(`   Current Weather: ${currentSuccess}/${results.current.length} successful`);
  console.log(`   Forecast: ${forecastSuccess}/${results.forecast.length} successful`);
  
  if (currentSuccess === results.current.length && forecastSuccess === results.forecast.length) {
    console.log('\n🎉 All tests passed! Your WeatherAPI.com configuration is working correctly.');
    console.log('\n🚀 You can now start your development server:');
    console.log('   npm run dev');
  } else {
    console.log('\n⚠️  Some tests failed. Please check your API key and internet connection.');
    
    // Show any errors
    const allResults = [...results.current, ...results.forecast];
    const errors = allResults.filter(r => !r.success);
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => {
        console.log(`   ${error.location}: ${error.error}`);
      });
    }
  }
  
  // Performance info
  const avgDuration = results.current
    .filter(r => r.success && r.duration)
    .reduce((acc, r) => acc + r.duration, 0) / currentSuccess;
    
  if (avgDuration > 0) {
    console.log(`\n⚡ Average response time: ${Math.round(avgDuration)}ms`);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Test cancelled by user.');
  process.exit(0);
});

runTests().catch(console.error);
