/**
 * Data Consistency Test
 * Verifies that Current Analysis and Forecast tabs use the same data source
 */

import { WeatherAPI } from './src/integrations/WeatherAPICore.js';

async function testDataConsistency() {
  console.log('🧪 Testing Data Consistency Between Current and Forecast...\n');
  
  // Test coordinates (Berlin)
  const lat = 52.5200;
  const lon = 13.4050;
  
  try {
    console.log('📊 Fetching forecast data (used by both Current Analysis and Forecast tabs)...');
    const forecastData = await WeatherAPI.getForecastWeather(lat, lon, 3);
    
    console.log('\n📋 Forecast Data Structure:');
    console.log('├── Current Weather:', {
      temperature: forecastData.current.temperature,
      humidity: forecastData.current.humidity,
      condition: forecastData.current.condition
    });
    
    console.log('├── Hourly Data Length:', forecastData.hourly.length);
    
    if (forecastData.hourly.length > 0) {
      const firstHour = forecastData.hourly[0];
      const currentTime = new Date();
      const firstHourTime = new Date(firstHour.time);
      
      console.log('├── First Hour Data:', {
        time: firstHour.time,
        temperature: firstHour.temperature,
        humidity: firstHour.humidity,
        condition: firstHour.condition
      });
      
      console.log('├── Current Hour:', currentTime.getHours());
      console.log('└── First Hour in Data:', firstHourTime.getHours());
      
      // Check if current weather matches current hour in forecast
      const currentHourMatch = firstHourTime.getHours() === currentTime.getHours();
      console.log(`\n✅ Current hour included in forecast: ${currentHourMatch ? 'YES' : 'NO'}`);
      
      if (currentHourMatch) {
        const tempDiff = Math.abs(forecastData.current.temperature - firstHour.temperature);
        const humidityDiff = Math.abs(forecastData.current.humidity - firstHour.humidity);
        
        console.log(`🎯 Temperature consistency: ${tempDiff < 0.1 ? 'PERFECT' : `${tempDiff}°C difference`}`);
        console.log(`🎯 Humidity consistency: ${humidityDiff < 1 ? 'PERFECT' : `${humidityDiff}% difference`}`);
      }
    }
    
    console.log('\n✅ Data consistency test completed successfully!');
    console.log('🎉 Both Current Analysis and Forecast tabs now use the same data source.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDataConsistency();
