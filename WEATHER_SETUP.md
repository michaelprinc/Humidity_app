# WeatherAPI.com Configuration Guide

This guide explains how to set up real weather data for the Humidity App using WeatherAPI.com.

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

**For Node.js environments:**
```bash
npm run setup-weather
```

**For Windows PowerShell:**
```powershell
npm run setup-weather-ps
```

### Option 2: Manual Setup

1. **Sign up for WeatherAPI.com**
   - Visit: https://www.weatherapi.com/signup.aspx
   - Create a free account
   - Get your API key from the dashboard

2. **Create configuration file**
   ```bash
   cp .env.template .env
   ```

3. **Add your API key to `.env`**
   ```bash
   REACT_APP_WEATHERAPI_KEY=your_actual_api_key_here
   ```

## 📋 Configuration Options

The `.env` file supports these settings:

```bash
# Required: Your WeatherAPI.com API key
REACT_APP_WEATHERAPI_KEY=your_api_key_here

# Optional: API base URL (default shown)
REACT_APP_WEATHERAPI_BASE_URL=https://api.weatherapi.com/v1

# Optional: Cache duration in minutes (default: 15)
REACT_APP_WEATHER_CACHE_DURATION=15

# Optional: Enable debug logging (default: false)
REACT_APP_WEATHER_DEBUG=false

# Optional: Fallback to mock data if API fails (default: true)
REACT_APP_WEATHER_FALLBACK_MOCK=true
```

## 🌤️ WeatherAPI.com Free Tier

**Generous limits:**
- ✅ **1,000,000 calls per month** (very generous!)
- ✅ Current weather conditions
- ✅ 3-day weather forecast
- ✅ Historical weather data (limited)
- ✅ Air quality data
- ✅ No credit card required

**API Coverage:**
- 🌍 Global weather data
- 🏙️ 4+ million locations
- ⚡ Real-time updates
- 📊 Detailed weather parameters

## 🔧 Implementation Details

### Architecture

The new implementation (`src/integrations/WeatherAPICore.js`) maintains compatibility with the existing app while adding real weather data:

- **Same interface**: No changes needed in React components
- **Caching**: Reduces API calls by caching for 15 minutes
- **Error handling**: Graceful fallback to mock data if API fails
- **Debug mode**: Optional logging for development

### Key Features

1. **Smart Caching**
   - Caches weather data for 15 minutes (configurable)
   - Reduces API usage by ~75%
   - Improves app performance

2. **Error Resilience**
   - Automatic fallback to mock data
   - Graceful handling of network issues
   - Debug logging for troubleshooting

3. **Rate Limiting Protection**
   - Monitoring and logging of API usage
   - Built-in caching to stay within limits
   - Free tier supports 10k+ users per month

## 📊 Usage Monitoring

### Check API Usage

Enable debug mode to monitor API calls:
```bash
REACT_APP_WEATHER_DEBUG=true
```

This will log:
- API requests and responses
- Cache hits/misses
- Error conditions
- Fallback activations

### Estimated Usage

With 15-minute caching:
- **Single user**: ~100 calls/day
- **10 users**: ~1,000 calls/day
- **100 users**: ~10,000 calls/day
- **Free tier limit**: 33,333 calls/day (1M/month)

## 🛠️ Development

### Testing API Integration

```javascript
// Test current weather
import { WeatherAPI } from './src/integrations/WeatherAPICore.js';

const weather = await WeatherAPI.getCurrentWeather(52.5200, 13.4050); // Berlin
console.log(weather);

// Test forecast
const forecast = await WeatherAPI.getForecastWeather(52.5200, 13.4050);
console.log(forecast);
```

### Cache Management

```javascript
// Clear weather cache
WeatherAPI.clearCache();

// Check cache size
console.log('Cached items:', WeatherAPI.getCacheSize());
```

## 🔒 Security

### API Key Protection

✅ **Correct approach:**
- Store API key in `.env` file
- Add `.env*` to `.gitignore` (already done)
- Use environment variables in code

❌ **Never do this:**
- Hard-code API keys in source code
- Commit `.env` files to version control
- Share API keys in chat/email

### Environment Variables

The app uses the `REACT_APP_` prefix for environment variables that need to be available in the browser. This is a Vite/React requirement.

## 🚨 Troubleshooting

### Common Issues

**1. "API key not found" warning**
```bash
# Check if .env file exists
ls .env

# Verify API key is set
grep WEATHERAPI_KEY .env
```

**2. "Failed to fetch weather" errors**
```bash
# Enable debug mode
REACT_APP_WEATHER_DEBUG=true

# Check browser console for detailed error messages
```

**3. "Network error" messages**
```bash
# Test API key manually
curl "https://api.weatherapi.com/v1/current.json?key=YOUR_KEY&q=London"
```

### Debug Commands

```bash
# Test API key validity
node -e "
const https = require('https');
const key = process.env.REACT_APP_WEATHERAPI_KEY;
https.get('https://api.weatherapi.com/v1/current.json?key=' + key + '&q=London', (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', d => console.log(d.toString()));
});
"
```

## 📈 Migration from Mock Data

The migration is seamless:

1. **Before**: Mock data in `src/integrations/Core.js`
2. **After**: Real data in `src/integrations/WeatherAPICore.js`
3. **Components**: No changes needed (same interface)

### Gradual Migration

You can run both systems side by side:
- Keep `Core.js` for backup/testing
- Use `WeatherAPICore.js` for production
- Switch by changing the import statement

## 🎯 Next Steps

1. **Set up API key** using the automated script
2. **Test integration** with debug mode enabled
3. **Monitor usage** during development
4. **Deploy to production** with confidence

The free tier is generous enough for most applications, and you can always upgrade if needed.
