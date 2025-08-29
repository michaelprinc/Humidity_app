import React from 'react'

function App() {
  // Step 3: Test HumidityHub component
  try {
    console.log('🔍 App: Starting to load HumidityHub...');
    
    // Import Layout and HumidityHub with error boundaries
    const Layout = React.lazy(() => {
      console.log('🔍 App: Loading Layout component...');
      return import('./Layout').catch(error => {
        console.error('❌ Layout import failed:', error);
        throw error;
      });
    });

    const HumidityHub = React.lazy(() => {
      console.log('🔍 App: Loading HumidityHub component...');
      return import('./HumidityHub').catch(error => {
        console.error('❌ HumidityHub import failed:', error);
        throw error;
      });
    });

    return (
      <React.Suspense fallback={
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f0f0f0', 
          minHeight: '100vh',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2>🔄 Loading HumidityHub...</h2>
          <p>Testing the main HumidityHub component...</p>
          <p>If this hangs or goes blank, the issue is in HumidityHub or its child components.</p>
          <p>Check browser console (F12) for debug messages.</p>
        </div>
      }>
        <Layout>
          <HumidityHub />
        </Layout>
      </React.Suspense>
    );
  } catch (error) {
    console.error('❌ App Error:', error);
    return (
      <div style={{padding: '20px', color: 'red', backgroundColor: '#fff'}}>
        <h1>🚨 App Error Detected</h1>
        <p><strong>Error:</strong> {error.message}</p>
        <pre style={{backgroundColor: '#f5f5f5', padding: '10px'}}>{error.stack}</pre>
      </div>
    );
  }
}

export default App
