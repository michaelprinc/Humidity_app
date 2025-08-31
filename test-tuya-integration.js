#!/usr/bin/env node
/**
 * Basic tests for Tuya Cloud integration
 */
async function runTests() {
  console.log('🔌 Testing Tuya integration...');

  process.env.VITE_TUYA_ACCESS_ID = 'abc';
  process.env.VITE_TUYA_ACCESS_SECRET = 'secret';
  process.env.VITE_TUYA_DEVICE_ID = 'device123';

  // Mock fetch responses
  global.fetch = async (url) => {
    if (url.includes('/token')) {
      return {
        json: async () => ({ success: true, result: { access_token: 'test_token' } })
      };
    }
    if (url.includes('/devices/')) {
      return {
        json: async () => ({
          success: true,
          result: [
            { code: 'temp_current', value: 235 },
            { code: 'humidity_value', value: 50 }
          ]
        })
      };
    }
    return { json: async () => ({ success: false }) };
  };

  const { getLocalTemperatureHumidity } = await import('./src/integrations/TuyaAuth.js');

  try {
    const data = await getLocalTemperatureHumidity();
    if (data.temperature === 23.5 && data.humidity === 50) {
      console.log('✅ Tuya data parsed correctly');
    } else {
      console.error('❌ Incorrect data returned', data);
    }
  } catch (err) {
    console.error('❌ Tuya integration failed', err);
  }
}

runTests();
