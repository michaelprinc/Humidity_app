/**
 * WeatherAPI.com Integration for Humidity App
 * 
 * This module replaces the mock weather implementation with real
 * WeatherAPI.com data while maintaining the same interface.
 */

class WeatherAPIConfig {
  constructor() {
    this.apiKey = import.meta.env.VITE_WEATHERAPI_KEY || import.meta.env.REACT_APP_WEATHERAPI_KEY;
    this.baseUrl = import.meta.env.VITE_WEATHERAPI_BASE_URL || import.meta.env.REACT_APP_WEATHERAPI_BASE_URL || 'https://api.weatherapi.com/v1';
    this.cacheDuration = parseInt(import.meta.env.VITE_WEATHER_CACHE_DURATION || import.meta.env.REACT_APP_WEATHER_CACHE_DURATION || '15') * 60 * 1000; // Convert to ms
    this.debugMode = (import.meta.env.VITE_WEATHER_DEBUG || import.meta.env.REACT_APP_WEATHER_DEBUG) === 'true';
    this.fallbackToMock = (import.meta.env.VITE_WEATHER_FALLBACK_MOCK || import.meta.env.REACT_APP_WEATHER_FALLBACK_MOCK) === 'true';
    
    if (!this.apiKey) {
      console.warn('⚠️  WeatherAPI key not found. Run: node setup-weather-config.js');
    }
  }

  log(...args) {
    if (this.debugMode) {
      console.log('[WeatherAPI]', ...args);
    }
  }

  error(...args) {
    console.error('[WeatherAPI Error]', ...args);
  }
}

const config = new WeatherAPIConfig();

// Cache management
const weatherCache = new Map();

function getCacheKey(lat, lon, type) {
  return `${type}_${lat.toFixed(3)}_${lon.toFixed(3)}`;
}

function isCacheValid(timestamp) {
  return Date.now() - timestamp < config.cacheDuration;
}

// Mock data fallback (original implementation)
function generateMockWeather(lat, lon, includeHourly = false) {
  config.log('Falling back to mock data');
  
  const baseTemp = 15 + Math.sin(lat * Math.PI / 180) * 10;
  const humidity = 40 + Math.random() * 40;
  const temperature = baseTemp + (Math.random() - 0.5) * 10;
  
  const current = {
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity),
    condition: 'Partly cloudy',
    wind_kph: Math.round(Math.random() * 20),
    pressure_mb: 1013 + Math.round((Math.random() - 0.5) * 40),
    uv: Math.round(Math.random() * 10)
  };

  if (!includeHourly) {
    return current;
  }

  // Generate hourly forecast for next 24 hours
  const hourly = [];
  for (let i = 1; i <= 24; i++) {
    const hourTemp = temperature + (Math.random() - 0.5) * 5;
    const hourHumidity = humidity + (Math.random() - 0.5) * 20;
    
    hourly.push({
      time: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
      temperature: Math.round(hourTemp * 10) / 10,
      humidity: Math.max(0, Math.min(100, Math.round(hourHumidity))),
      condition: 'Partly cloudy'
    });
  }

  return { current, hourly };
}

// WeatherAPI.com API calls
async function fetchCurrentWeather(lat, lon) {
  const cacheKey = getCacheKey(lat, lon, 'current');
  const cached = weatherCache.get(cacheKey);
  
  if (cached && isCacheValid(cached.timestamp)) {
    config.log('Using cached current weather data');
    return cached.data;
  }

  try {
    const url = `${config.baseUrl}/current.json?key=${config.apiKey}&q=${lat},${lon}&aqi=no`;
    config.log('Fetching current weather:', url.replace(config.apiKey, 'API_KEY'));
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`WeatherAPI HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`WeatherAPI Error: ${data.error.message}`);
    }
    
    // Process location information
    const location = {
      name: data.location.name,
      region: data.location.region,
      country: data.location.country,
      lat: data.location.lat,
      lon: data.location.lon,
      tz_id: data.location.tz_id,
      localtime: data.location.localtime
    };
    
    const weatherData = {
      location,
      temperature: data.current.temp_c,
      humidity: data.current.humidity,
      condition: data.current.condition.text,
      wind_kph: data.current.wind_kph,
      pressure_mb: data.current.pressure_mb,
      uv: data.current.uv
    };
    
    // Cache the result
    weatherCache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now()
    });
    
    config.log('Current weather fetched successfully');
    return weatherData;
    
  } catch (error) {
    config.error('Failed to fetch current weather:', error.message);
    
    if (config.fallbackToMock) {
      return generateMockWeather(lat, lon, false);
    }
    
    throw error;
  }
}

async function fetchForecastWeather(lat, lon, days = 3) {
  const cacheKey = getCacheKey(lat, lon, `forecast_${days}`);
  const cached = weatherCache.get(cacheKey);
  
  if (cached && isCacheValid(cached.timestamp)) {
    config.log('Using cached forecast weather data');
    return cached.data;
  }

  try {
    const url = `${config.baseUrl}/forecast.json?key=${config.apiKey}&q=${lat},${lon}&days=${days}&aqi=no&alerts=no`;
    config.log('Fetching forecast weather:', url.replace(config.apiKey, 'API_KEY'));
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`WeatherAPI HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`WeatherAPI Error: ${data.error.message}`);
    }
    
    // Process location information
    const location = {
      name: data.location.name,
      region: data.location.region,
      country: data.location.country,
      lat: data.location.lat,
      lon: data.location.lon,
      tz_id: data.location.tz_id,
      localtime: data.location.localtime
    };
    
    // Process current weather
    const current = {
      temperature: data.current.temp_c,
      humidity: data.current.humidity,
      condition: data.current.condition.text,
      wind_kph: data.current.wind_kph,
      pressure_mb: data.current.pressure_mb,
      uv: data.current.uv
    };
    
    // Process hourly forecast (24 hours starting from current hour)
    const hourly = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    // Include current hour and remaining hours from today  
    if (data.forecast.forecastday[0]) {
      const todayHours = data.forecast.forecastday[0].hour.slice(currentHour);
      todayHours.forEach(hour => {
        hourly.push({
          time: hour.time,
          temperature: hour.temp_c,
          humidity: hour.humidity,
          condition: hour.condition.text
        });
      });
    }
    
    // Get hours from tomorrow to complete 24 hours
    if (data.forecast.forecastday[1] && hourly.length < 24) {
      const tomorrowHours = data.forecast.forecastday[1].hour.slice(0, 24 - hourly.length);
      tomorrowHours.forEach(hour => {
        hourly.push({
          time: hour.time,
          temperature: hour.temp_c,
          humidity: hour.humidity,
          condition: hour.condition.text
        });
      });
    }
    
    const forecastData = { location, current, hourly };
    
    // Cache the result
    weatherCache.set(cacheKey, {
      data: forecastData,
      timestamp: Date.now()
    });
    
    config.log('Forecast weather fetched successfully');
    return forecastData;
    
  } catch (error) {
    config.error('Failed to fetch forecast weather:', error.message);
    
    if (config.fallbackToMock) {
      return generateMockWeather(lat, lon, true);
    }
    
    throw error;
  }
}

/**
 * Main API function that replaces the mock implementation
 * Maintains compatibility with existing HumidityHub.jsx code
 */
export async function InvokeLLM({ prompt, add_context_from_internet, response_json_schema }) {
  try {
    // Parse location from prompt (existing format)
    const latMatch = prompt.match(/latitude ([-\d.]+)/);
    const lonMatch = prompt.match(/longitude ([-\d.]+)/);
    
    if (!latMatch || !lonMatch) {
      throw new Error("Unable to parse location from prompt");
    }
    
    const lat = parseFloat(latMatch[1]);
    const lon = parseFloat(lonMatch[1]);
    
    config.log('Processing weather request for:', lat, lon);
    
    // Determine request type based on prompt content
    if (prompt.includes('forecast') || prompt.includes('hourly') || prompt.includes('24')) {
      // Return forecast data including current weather
      return await fetchForecastWeather(lat, lon, 3);
    } else {
      // Return only current weather
      return await fetchCurrentWeather(lat, lon);
    }
    
  } catch (error) {
    config.error('InvokeLLM failed:', error.message);
    
    // If we can parse coordinates, try fallback
    const latMatch = prompt.match(/latitude ([-\d.]+)/);
    const lonMatch = prompt.match(/longitude ([-\d.]+)/);
    
    if (latMatch && lonMatch && config.fallbackToMock) {
      const lat = parseFloat(latMatch[1]);
      const lon = parseFloat(lonMatch[1]);
      const includeHourly = prompt.includes('forecast') || prompt.includes('hourly');
      return generateMockWeather(lat, lon, includeHourly);
    }
    
    throw error;
  }
}

// Utility functions for manual testing
export const WeatherAPI = {
  getCurrentWeather: fetchCurrentWeather,
  getForecastWeather: fetchForecastWeather,
  clearCache: () => weatherCache.clear(),
  getCacheSize: () => weatherCache.size,
  config: config
};
