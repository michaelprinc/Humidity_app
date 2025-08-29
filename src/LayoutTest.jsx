import React from 'react';

export default function LayoutTest({ children }) {
  console.log('🔍 Layout: Component is loading...');
  
  try {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#f1f5f9', // bg-slate-100 equivalent
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'Inter, sans-serif'
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
          }
        `}</style>
        <main style={{
          width: '100%',
          maxWidth: '28rem', // max-w-md equivalent (448px)
          margin: '0 auto'
        }}>
          {children}
        </main>
      </div>
    );
  } catch (error) {
    console.error('❌ Layout Error:', error);
    return (
      <div style={{ padding: '20px', backgroundColor: 'red', color: 'white' }}>
        <h2>Layout Error</h2>
        <p>{error.message}</p>
      </div>
    );
  }
}
