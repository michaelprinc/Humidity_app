import crypto from 'crypto';

/**
 * Tuya Cloud OAuth and Device Status Integration
 *
 * Provides helper functions to authenticate with Tuya Cloud and
 * retrieve temperature and humidity from a specified device.
 */
class TuyaConfig {
  constructor() {
    this.accessId = import.meta?.env?.VITE_TUYA_ACCESS_ID || process.env.VITE_TUYA_ACCESS_ID;
    this.accessSecret = import.meta?.env?.VITE_TUYA_ACCESS_SECRET || process.env.VITE_TUYA_ACCESS_SECRET;
    this.deviceId = import.meta?.env?.VITE_TUYA_DEVICE_ID || process.env.VITE_TUYA_DEVICE_ID;
    this.apiBaseUrl =
      import.meta?.env?.VITE_TUYA_API_BASE_URL ||
      process.env.VITE_TUYA_API_BASE_URL ||
      'https://openapi.tuyaus.com';
    this.debug = (import.meta?.env?.VITE_TUYA_DEBUG || process.env.VITE_TUYA_DEBUG) === 'true';
    this.isConfigured = Boolean(this.accessId && this.accessSecret && this.deviceId);
  }

  log(...args) {
    if (this.debug) {
      console.log('[TuyaAuth]', ...args);
    }
  }

  error(...args) {
    console.error('[TuyaAuth Error]', ...args);
  }
}

const config = new TuyaConfig();

function signString(str) {
  return crypto.createHmac('sha256', config.accessSecret).update(str, 'utf8').digest('hex').toUpperCase();
}

async function getAccessToken() {
  if (!config.isConfigured) {
    throw new Error('Tuya credentials not configured');
  }

  const t = Date.now().toString();
  const sign = signString(config.accessId + t);

  const res = await fetch(`${config.apiBaseUrl}/v1.0/token?grant_type=1`, {
    method: 'GET',
    headers: {
      'client_id': config.accessId,
      sign,
      t,
      'sign_method': 'HMAC-SHA256'
    }
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error('Failed to obtain Tuya token');
  }
  return data.result.access_token;
}

async function getDeviceStatus(token) {
  const t = Date.now().toString();
  const path = `/v1.0/devices/${config.deviceId}/status`;
  const sign = signString(config.accessId + token + t);

  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method: 'GET',
    headers: {
      'client_id': config.accessId,
      'sign': sign,
      't': t,
      'sign_method': 'HMAC-SHA256',
      'access_token': token
    }
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error('Failed to fetch Tuya device status');
  }
  return data.result;
}

export async function getLocalTemperatureHumidity() {
  const token = await getAccessToken();
  const status = await getDeviceStatus(token);

  const tempDp = status.find((d) => d.code === 'temp_current' || d.code === 'temp_value');
  const humDp = status.find((d) => d.code === 'humidity_value' || d.code === 'humidity_current');
  const temperature = tempDp ? tempDp.value / 10 : null; // Tuya reports temp x10
  const humidity = humDp ? humDp.value : null;

  return {
    temperature,
    humidity,
    deviceId: config.deviceId,
    timestamp: Date.now()
  };
}

export const TuyaAuth = {
  getLocalTemperatureHumidity,
};

export function getTuyaConfig() {
  return { ...config };
}
