/**
 * Modern Google Authentication Integration
 * 
 * This module handles Google Sign-In using the current Google Identity Services API
 * and OAuth 2.0 authorization for Nest Device Access.
 * 
 * Two-phase approach:
 * 1. Authentication: User signs in with Google (ID token)
 * 2. Authorization: User grants permission for Smart Device Management API (access token)
 */

class GoogleAuthConfig {
  constructor() {
    // OAuth 2.0 Configuration
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.REACT_APP_GOOGLE_CLIENT_ID;
    this.clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || import.meta.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    this.projectId = import.meta.env.VITE_GOOGLE_DEVICE_ACCESS_PROJECT_ID || import.meta.env.REACT_APP_GOOGLE_DEVICE_ACCESS_PROJECT_ID;
    
    // Smart Device Management API scope
    this.apiScope = 'https://www.googleapis.com/auth/sdm.service';
    this.apiBaseUrl = 'https://smartdevicemanagement.googleapis.com/v1';
    this.tokenUrl = 'https://oauth2.googleapis.com/token';
    
    // Debug mode
    this.debugMode = (import.meta.env.VITE_GOOGLE_HOME_DEBUG || import.meta.env.REACT_APP_GOOGLE_HOME_DEBUG) === 'true';
    
    // Check configuration
    this.isConfigured = !!(this.clientId && this.projectId);
    
    if (!this.isConfigured && this.debugMode) {
      console.warn('⚠️  Google Home integration not configured. Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_DEVICE_ACCESS_PROJECT_ID in .env file');
    }
  }

  log(...args) {
    if (this.debugMode) {
      console.log('[GoogleAuth]', ...args);
    }
  }

  error(...args) {
    console.error('[GoogleAuth Error]', ...args);
  }
}

const config = new GoogleAuthConfig();

// Authentication and authorization state
const authState = {
  isSignedIn: false,
  userInfo: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiry: null,
  hasDeviceAccess: false
};

// Event listeners for authentication state changes
const authListeners = new Set();

/**
 * Add listener for authentication state changes
 */
export function addAuthStateListener(callback) {
  authListeners.add(callback);
  // Immediately call with current state
  callback(authState);
}

/**
 * Remove authentication state listener
 */
export function removeAuthStateListener(callback) {
  authListeners.delete(callback);
}

/**
 * Notify all listeners of state changes
 */
function notifyAuthStateChange() {
  authListeners.forEach(listener => {
    try {
      listener(authState);
    } catch (error) {
      config.error('Auth state listener error:', error);
    }
  });
}

/**
 * Check if Google Identity Services library is loaded
 */
function isGoogleLibraryLoaded() {
  return typeof window !== 'undefined' && 
         window.google && 
         window.google.accounts && 
         window.google.accounts.id;
}

/**
 * Wait for Google Identity Services library to load
 */
function waitForGoogleLibrary() {
  return new Promise((resolve, reject) => {
    if (isGoogleLibraryLoaded()) {
      resolve();
      return;
    }

    const checkInterval = setInterval(() => {
      if (isGoogleLibraryLoaded()) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Google Identity Services library failed to load'));
    }, 10000); // 10 second timeout
  });
}

/**
 * Initialize Google Sign-In
 */
export async function initializeGoogleSignIn() {
  if (!config.isConfigured) {
    throw new Error('Google authentication not configured. Set environment variables.');
  }

  try {
    await waitForGoogleLibrary();
    config.log('Google Identity Services library loaded');

    // Initialize Google Sign-In
    window.google.accounts.id.initialize({
      client_id: config.clientId,
      callback: handleSignInResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    config.log('Google Sign-In initialized');
    return true;
  } catch (error) {
    config.error('Failed to initialize Google Sign-In:', error);
    throw error;
  }
}

/**
 * Handle Google Sign-In response (ID token)
 */
function handleSignInResponse(response) {
  try {
    config.log('Sign-in response received');
    
    if (response.credential) {
      // Decode the JWT ID token (basic info only - server should validate)
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      authState.isSignedIn = true;
      authState.userInfo = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };
      
      config.log('User signed in:', authState.userInfo.email);
      notifyAuthStateChange();
    } else {
      throw new Error('No credential received from Google Sign-In');
    }
  } catch (error) {
    config.error('Sign-in response handling failed:', error);
    authState.isSignedIn = false;
    authState.userInfo = null;
    notifyAuthStateChange();
  }
}

/**
 * Render Google Sign-In button
 */
export function renderGoogleSignInButton(element) {
  if (!config.isConfigured) {
    config.log('Google Sign-In not configured, skipping button render');
    return;
  }

  if (!isGoogleLibraryLoaded()) {
    config.error('Google library not loaded yet');
    return;
  }

  try {
    window.google.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 250
    });
    
    config.log('Google Sign-In button rendered');
  } catch (error) {
    config.error('Failed to render Google Sign-In button:', error);
  }
}

/**
 * Request OAuth 2.0 authorization for Smart Device Management API
 */
export async function requestDeviceAccess() {
  if (!authState.isSignedIn) {
    throw new Error('User must be signed in before requesting device access');
  }

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google OAuth 2.0 library not available');
  }

  try {
    config.log('Requesting device access authorization...');

    // Initialize OAuth 2.0 client for authorization
    const authClient = window.google.accounts.oauth2.initCodeClient({
      client_id: config.clientId,
      scope: config.apiScope,
      ux_mode: 'popup',
      callback: handleAuthorizationResponse
    });

    // Request authorization
    authClient.requestCode();
    
  } catch (error) {
    config.error('Failed to request device access:', error);
    throw error;
  }
}

/**
 * Handle OAuth 2.0 authorization response (authorization code)
 */
async function handleAuthorizationResponse(response) {
  if (response.error) {
    config.error('Authorization failed:', response.error);
    authState.hasDeviceAccess = false;
    notifyAuthStateChange();
    return;
  }

  if (response.code) {
    try {
      config.log('Authorization code received, exchanging for tokens...');
      
      // Exchange authorization code for access token
      await exchangeCodeForTokens(response.code);
      
      authState.hasDeviceAccess = true;
      config.log('Device access granted successfully');
      notifyAuthStateChange();
      
    } catch (error) {
      config.error('Token exchange failed:', error);
      authState.hasDeviceAccess = false;
      notifyAuthStateChange();
    }
  }
}

/**
 * Exchange authorization code for access and refresh tokens
 */
async function exchangeCodeForTokens(authCode) {
  const tokenRequest = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: authCode,
    grant_type: 'authorization_code',
    redirect_uri: window.location.origin // Use current origin as redirect URI
  };

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(tokenRequest)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
  }

  const tokenData = await response.json();
  
  authState.accessToken = tokenData.access_token;
  authState.refreshToken = tokenData.refresh_token;
  authState.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
  
  config.log('Tokens obtained successfully');
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
  if (!authState.refreshToken) {
    throw new Error('No refresh token available');
  }

  const refreshRequest = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: authState.refreshToken,
    grant_type: 'refresh_token'
  };

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(refreshRequest)
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const tokenData = await response.json();
  
  authState.accessToken = tokenData.access_token;
  authState.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
  
  config.log('Access token refreshed');
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken() {
  if (!authState.accessToken) {
    throw new Error('No access token available. User needs to authorize device access.');
  }

  // Check if token is about to expire (5 minutes buffer)
  if (authState.tokenExpiry && Date.now() > (authState.tokenExpiry - 5 * 60 * 1000)) {
    config.log('Access token expired, refreshing...');
    await refreshAccessToken();
  }

  return authState.accessToken;
}

/**
 * Fetch user's Nest devices
 */
export async function fetchNestDevices() {
  if (!authState.hasDeviceAccess) {
    throw new Error('Device access not granted. User needs to authorize first.');
  }

  try {
    const accessToken = await getValidAccessToken();
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
    
    config.log(`Found ${devices.length} Nest devices`);
    return devices;
    
  } catch (error) {
    config.error('Failed to fetch Nest devices:', error);
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
    config.error('Failed to get Nest temperature data:', error);
    throw error;
  }
}

/**
 * Get current indoor temperature (simplified interface)
 */
export async function getCurrentIndoorTemperature() {
  try {
    const temperatureData = await getNestTemperatureData();
    
    if (temperatureData.length === 0) {
      throw new Error('No temperature data available');
    }
    
    // If multiple thermostats, return the first one (or could implement averaging)
    const primaryDevice = temperatureData[0];
    
    return {
      temperature: primaryDevice.temperature,
      humidity: primaryDevice.humidity,
      source: 'google_nest',
      deviceName: primaryDevice.deviceName,
      room: primaryDevice.room,
      timestamp: primaryDevice.timestamp,
      allDevices: temperatureData // Include all devices for advanced use
    };
    
  } catch (error) {
    config.error('Failed to get current indoor temperature:', error);
    throw error;
  }
}

/**
 * Sign out user
 */
export function signOut() {
  if (isGoogleLibraryLoaded()) {
    window.google.accounts.id.disableAutoSelect();
  }
  
  // Clear authentication state
  authState.isSignedIn = false;
  authState.userInfo = null;
  authState.accessToken = null;
  authState.refreshToken = null;
  authState.tokenExpiry = null;
  authState.hasDeviceAccess = false;
  
  config.log('User signed out');
  notifyAuthStateChange();
}

/**
 * Get current authentication status
 */
export function getAuthStatus() {
  return {
    isConfigured: config.isConfigured,
    isSignedIn: authState.isSignedIn,
    hasDeviceAccess: authState.hasDeviceAccess,
    userInfo: authState.userInfo,
    tokenExpiry: authState.tokenExpiry ? new Date(authState.tokenExpiry) : null
  };
}

// Export for debugging and testing
export const GoogleAuth = {
  config,
  initializeGoogleSignIn,
  renderGoogleSignInButton,
  requestDeviceAccess,
  getCurrentIndoorTemperature,
  fetchNestDevices,
  signOut,
  getAuthStatus,
  addAuthStateListener,
  removeAuthStateListener
};
