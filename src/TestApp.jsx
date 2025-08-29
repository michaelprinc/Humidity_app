import React from 'react'

function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 React Test Component</h1>
      <p>If you can see this, React is working!</p>
      <button onClick={() => alert('JavaScript is working!')}>
        Test Button
      </button>
    </div>
  )
}

export default TestApp
