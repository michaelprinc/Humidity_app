/**
 * Google Integration Configuration Test
 * 
 * Run this in browser console to test Google integration setup
 */

console.log('🔧 Google Integration Configuration Test');
console.log('==========================================');

// Test environment variables
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const projectId = import.meta.env.VITE_GOOGLE_DEVICE_ACCESS_PROJECT_ID;
const debugMode = import.meta.env.VITE_GOOGLE_HOME_DEBUG;

console.log('📋 Environment Variables:');
console.log('VITE_GOOGLE_CLIENT_ID:', clientId ? 'SET ✅' : 'MISSING ❌');
console.log('VITE_GOOGLE_DEVICE_ACCESS_PROJECT_ID:', projectId ? 'SET ✅' : 'MISSING ❌');
console.log('VITE_GOOGLE_HOME_DEBUG:', debugMode || 'false');

// Test Google library loading
console.log('\n📚 Google Library Status:');
console.log('Google Identity Services:', typeof window.google !== 'undefined' ? 'LOADED ✅' : 'NOT LOADED ❌');

// Test auth module import
try {
  import('../src/integrations/GoogleAuth.js').then(module => {
    console.log('\n🔐 Google Auth Module:');
    console.log('Module import:', 'SUCCESS ✅');
    
    const authStatus = module.getAuthStatus();
    console.log('Configuration status:', authStatus.isConfigured ? 'CONFIGURED ✅' : 'NOT CONFIGURED ❌');
    console.log('Auth status details:', authStatus);
    
    if (!authStatus.isConfigured) {
      console.log('\n💡 To enable Google Home integration:');
      console.log('1. Go to Google Cloud Console');
      console.log('2. Create OAuth 2.0 client ID');
      console.log('3. Go to Google Device Access Console');
      console.log('4. Register project (requires $5 fee)');
      console.log('5. Update .env file with your credentials');
      console.log('6. Restart dev server');
    }
  });
} catch (error) {
  console.error('❌ Google Auth Module import failed:', error);
}

console.log('\n🎯 Current Behavior:');
console.log('- Manual temperature entry: ALWAYS AVAILABLE ✅');
console.log('- Google Home integration:', clientId && projectId ? 'READY TO CONFIGURE ✅' : 'NEEDS SETUP ⚙️');
