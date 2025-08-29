# Google Home Integration Setup Guide

This guide will help you set up Google Home/Nest integration to automatically retrieve indoor temperature data from your Nest thermostats.

## Overview

The Google Home integration allows users to:
- Sign in with their Google account
- Automatically pull indoor temperature and humidity from Nest thermostats
- Fall back to manual entry when Google Home data isn't available
- Keep outdoor weather data separate (from weather APIs)

## Prerequisites

1. **Google Nest Devices**: Users must have Google Nest thermostats or compatible devices
2. **Google Cloud Console Account**: For OAuth setup
3. **Google Device Access Console Account**: For Nest API access

## Setup Steps

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google Device Access API
   - Google OAuth 2.0

4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth 2.0 Client ID**
6. Choose **Web application**
7. Add authorized redirect URIs:
   ```
   http://localhost:3000/auth/google/callback
   http://localhost:5173/auth/google/callback  (for Vite dev server)
   https://yourdomain.com/auth/google/callback (for production)
   ```
8. Note down your **Client ID** and **Client Secret**

### 2. Google Device Access Console Setup

1. Go to [Google Device Access Console](https://console.nest.google.com/device-access/)
2. Pay the one-time $5 fee to access the API
3. Create a new project
4. Note down your **Project ID**
5. Add your OAuth Client ID from step 1

### 3. Environment Configuration

1. Copy `.env.example.google` to `.env`:
   ```bash
   cp .env.example.google .env
   ```

2. Fill in your values:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_client_id_from_step_1
   VITE_GOOGLE_CLIENT_SECRET=your_client_secret_from_step_1
   VITE_GOOGLE_DEVICE_ACCESS_PROJECT_ID=your_project_id_from_step_2
   VITE_GOOGLE_HOME_DEBUG=true  # for development
   ```

### 4. User Setup Requirements

For users to use Google Home integration, they need:

1. **Google Nest Account**: With at least one Nest thermostat
2. **Same Google Account**: Used for both Nest and your app
3. **Device Permissions**: Nest devices must be shared with the Device Access project

## Usage Flow

1. **Initial Setup**: User clicks "Google Home/Nest" option
2. **Authentication**: User signs in with Google (popup window)
3. **Permission Grant**: User grants access to their Nest devices
4. **Data Retrieval**: App automatically fetches temperature from Nest thermostats
5. **Fallback**: If no data available, user can switch to manual entry

## Component Integration

The `IndoorTemperature` component handles:
- Google authentication flow
- Automatic data retrieval from Nest devices
- Manual temperature entry fallback
- Source switching (Google ↔ Manual)

```jsx
import IndoorTemperature from './components/IndoorTemperature';

function App() {
  const handleTemperatureChange = (tempData) => {
    console.log('Indoor temp updated:', tempData);
    // Use tempData.temperature, tempData.humidity, tempData.source
  };

  return (
    <IndoorTemperature onTemperatureChange={handleTemperatureChange} />
  );
}
```

## Data Structure

Temperature data returned:
```javascript
{
  temperature: 22.5,        // Celsius
  humidity: 45,             // Percentage (optional)
  source: 'google_nest',    // 'google_nest' or 'manual'
  deviceName: 'Living Room Thermostat',  // Only for Google
  room: 'Living Room',      // Only for Google
  timestamp: Date,          // When data was retrieved
  lastUpdated: Date         // When component was updated
}
```

## Limitations

### Development vs Production

- **Development**: Can use client secret in frontend (not recommended for production)
- **Production**: Should use backend proxy to hide client secret

### API Limitations

- **5-minute cache**: Nest data doesn't change frequently
- **Rate limits**: Google has API rate limits
- **Device types**: Only works with Nest thermostats (not all Google Home devices)
- **Certification**: Production apps need Google certification

### User Limitations

- Users must own actual Nest devices
- Devices must be properly configured in Nest app
- Same Google account for Nest and your app

## Security Notes

1. **Client Secret**: Store securely in production (backend only)
2. **Token Storage**: Currently in memory (consider localStorage for persistence)
3. **HTTPS Required**: Production OAuth requires HTTPS
4. **CORS**: Ensure proper CORS configuration

## Troubleshooting

### Common Issues

1. **"No devices found"**: User doesn't have Nest thermostats or wrong account
2. **"Authentication failed"**: Check Client ID/Secret and redirect URIs
3. **"Project not found"**: Verify Device Access Project ID
4. **"Permission denied"**: User hasn't granted device access permissions

### Debug Mode

Enable debug logging:
```env
VITE_GOOGLE_HOME_DEBUG=true
```

Check browser console for detailed logs.

## Fallback Strategy

When Google Home data is unavailable:
1. **Show error message** with clear explanation
2. **Offer manual entry** as alternative
3. **Keep manual entry simple** (just temperature + optional humidity)
4. **Allow easy switching** between sources

This ensures the app remains functional even without Google Home devices.
