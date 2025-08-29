/**
 * Google Home / Nest Device Access Integration for Humidity App
 * 
 * This module integrates with Google Nest Device Access API to retrieve
 * INDOOR temperature data from user's Nest thermostats and other compatible devices.
 * 
 * IMPORTANT: This is for INDOOR temperature only. Outdoor weather data should
 * come from weather APIs (WeatherAPICore.js). When Google Home data is not
 * available, the app should fallback to manual indoor temperature entry.
 * 
 * Requirements:
 * - User must have Google Nest devices (thermostat, etc.)
 * - OAuth 2.0 authentication with Google
 * - Device Access project setup in Google Cloud Console
 */

class GoogleHomeConfig {
  constructor() {
    // OAuth 2.0 Configuration
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.REACT_APP_GOOGLE_CLIENT_ID;
    this.clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || import.meta.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    this.projectId = import.meta.env.VITE_GOOGLE_DEVICE_ACCESS_PROJECT_ID || import.meta.env.REACT_APP_GOOGLE_DEVICE_ACCESS_PROJECT_ID;
    
    // Device Access API Configuration
    this.apiBaseUrl = 'https://smartdevicemanagement.googleapis.com/v1';
    this.authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenUrl = 'https://oauth2.googleapis.com/token';
    
    // Required OAuth scopes for Device Access
    this.scopes = [
      'https://www.googleapis.com/auth/sdm.service',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
    
    // Cache settings
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes (Nest data doesn't change frequently)
    this.debugMode = (import.meta.env.VITE_GOOGLE_HOME_DEBUG || import.meta.env.REACT_APP_GOOGLE_HOME_DEBUG) === 'true';
    
    if (!this.clientId || !this.projectId) {
      console.warn('⚠️  Google Home integration not configured. Set up Device Access project first.');
    }
  }

  log(...args) {
    if (this.debugMode) {
      console.log('[GoogleHome]', ...args);
    }
  }

  error(...args) {
    console.error('[GoogleHome Error]', ...args);
  }
}

const config = new GoogleHomeConfig();

// Cache for device data and access tokens
const deviceCache = new Map();
const tokenStorage = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null
};

/**
 * Generate OAuth 2.0 authorization URL for Google Sign-In
 */
export function getGoogleAuthUrl(redirectUri) {
  if (!config.clientId) {
    throw new Error('Google Client ID not configured');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });

  const authUrl = `${config.authUrl}?${params.toString()}`;
  config.log('Generated auth URL:', authUrl);
  return authUrl;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(authCode, redirectUri) {
  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const tokenData = await response.json();
    
    // Store tokens
    tokenStorage.accessToken = tokenData.access_token;
    tokenStorage.refreshToken = tokenData.refresh_token;
    tokenStorage.expiresAt = Date.now() + (tokenData.expires_in * 1000);
    
    config.log('Successfully obtained access token');
    return tokenData;
    
  } catch (error) {
    config.error('Token exchange failed:', error.message);
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
  if (!tokenStorage.refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: tokenStorage.refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokenData = await response.json();
    
    tokenStorage.accessToken = tokenData.access_token;
    tokenStorage.expiresAt = Date.now() + (tokenData.expires_in * 1000);
    
    config.log('Successfully refreshed access token');
    return tokenData.access_token;
    
  } catch (error) {
    config.error('Token refresh failed:', error.message);
    throw error;
  }
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken() {
  if (!tokenStorage.accessToken) {
    throw new Error('No access token available. User needs to authenticate.');
  }

  // Check if token is about to expire (5 minutes buffer)
  if (tokenStorage.expiresAt && Date.now() > (tokenStorage.expiresAt - 5 * 60 * 1000)) {
    config.log('Access token expired, refreshing...');
    return await refreshAccessToken();
  }

  return tokenStorage.accessToken;
}

/**
 * Fetch user's Google Nest devices
 */
export async function fetchNestDevices() {
  try {
    const accessToken = await getValidAccessToken();
    const cacheKey = 'nest_devices';
    const cached = deviceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < config.cacheDuration) {
      config.log('Using cached device list');
      return cached.data;
    }

    const url = `${config.apiBaseUrl}/enterprises/${config.projectId}/devices`;
    config.log('Fetching Nest devices from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Device API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const devices = data.devices || [];
    
    // Cache the result
    deviceCache.set(cacheKey, {
      data: devices,
      timestamp: Date.now()
    });
    
    config.log(`Found ${devices.length} Nest devices`);
    return devices;
    
  } catch (error) {
    config.error('Failed to fetch Nest devices:', error.message);
    throw error;
  }
}

/**
 * Get temperature data from Nest thermostats
 */
export async function getNestTemperatureData() {
  try {
    const devices = await fetchNestDevices();
    const thermostats = devices.filter(device => 
      device.type === 'sdm.devices.types.THERMOSTAT'
    );
    
    if (thermostats.length === 0) {
      throw new Error('No Nest thermostats found in user account');
    }

    const temperatureData = [];
    
    for (const thermostat of thermostats) {
      try {
        const traits = thermostat.traits || {};
        const tempTrait = traits['sdm.devices.traits.Temperature'];
        const humidityTrait = traits['sdm.devices.traits.Humidity'];
        const infoTrait = traits['sdm.devices.traits.Info'];
        
        if (tempTrait) {
          const deviceData = {
            deviceId: thermostat.name,
            deviceName: infoTrait?.customName || 'Nest Thermostat',
            temperature: tempTrait.ambientTemperatureCelsius,
            humidity: humidityTrait?.ambientHumidityPercent || null,
            room: thermostat.parentRelations?.[0]?.displayName || 'Unknown Room',
            timestamp: new Date().toISOString()
          };
          
          temperatureData.push(deviceData);
          config.log('Temperature data from device:', deviceData.deviceName, deviceData.temperature + '°C');
        }
      } catch (deviceError) {
        config.error('Error processing device:', thermostat.name, deviceError.message);
      }
    }
    
    if (temperatureData.length === 0) {
      throw new Error('No temperature data available from Nest devices');
    }
    
    return temperatureData;
    
  } catch (error) {
    config.error('Failed to get Nest temperature data:', error.message);
    throw error;
  }
}

/**
 * Get current indoor temperature (simplified interface for existing app)
 */
export async function getCurrentIndoorTemperature() {
  try {
    const temperatureData = await getNestTemperatureData();
    
    if (temperatureData.length === 0) {
      throw new Error('No temperature data available');
    }
    
    // If multiple thermostats, return average or primary one
    const primaryDevice = temperatureData[0];
    
    return {
      temperature: primaryDevice.temperature,
      humidity: primaryDevice.humidity,
      source: 'google_nest',
      deviceName: primaryDevice.deviceName,
      room: primaryDevice.room,
      timestamp: primaryDevice.timestamp,
      // Include all devices for advanced use
      allDevices: temperatureData
    };
    
  } catch (error) {
    config.error('Failed to get current indoor temperature:', error.message);
    throw error;
  }
}

/**
 * Check if user is authenticated with Google Home
 */
export function isGoogleHomeAuthenticated() {
  return !!(tokenStorage.accessToken && tokenStorage.refreshToken);
}

/**
 * Sign out user (clear tokens)
 */
export function signOutGoogleHome() {
  tokenStorage.accessToken = null;
  tokenStorage.refreshToken = null;
  tokenStorage.expiresAt = null;
  deviceCache.clear();
  config.log('User signed out from Google Home');
}

/**
 * Get authentication status and user info
 */
export function getGoogleHomeStatus() {
  return {
    isAuthenticated: isGoogleHomeAuthenticated(),
    hasDevices: deviceCache.has('nest_devices'),
    tokenExpiry: tokenStorage.expiresAt ? new Date(tokenStorage.expiresAt) : null
  };
}

// Utility exports for manual testing
export const GoogleHomeAPI = {
  getAuthUrl: getGoogleAuthUrl,
  exchangeCode: exchangeCodeForToken,
  getDevices: fetchNestDevices,
  getTemperature: getCurrentIndoorTemperature,
  getStatus: getGoogleHomeStatus,
  signOut: signOutGoogleHome,
  config: config
};
