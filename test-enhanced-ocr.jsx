import React, { useState } from 'react';
import OcrInput from './src/components/OcrInput';

/**
 * Test page for enhanced OCR functionality
 * 
 * This component allows testing the new resizable crop area feature
 * for better OCR accuracy on temperature and humidity readings.
 */
function TestEnhancedOcr() {
  const [temperatureValue, setTemperatureValue] = useState(null);
  const [humidityValue, setHumidityValue] = useState(null);
  const [currentInput, setCurrentInput] = useState('temperature');

  const handleTemperatureConfirm = (value) => {
    setTemperatureValue(value);
    setCurrentInput('humidity');
    console.log('Temperature confirmed:', value);
  };

  const handleHumidityConfirm = (value) => {
    setHumidityValue(value);
    setCurrentInput('done');
    console.log('Humidity confirmed:', value);
  };

  const resetTest = () => {
    setTemperatureValue(null);
    setHumidityValue(null);
    setCurrentInput('temperature');
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Enhanced OCR Test</h1>
        <p className="text-gray-600">Test the new resizable crop area functionality</p>
      </div>

      {/* Results Display */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">Results:</h2>
        <div className="space-y-1 text-sm">
          <div>Temperature: {temperatureValue ? `${temperatureValue}°C` : 'Not set'}</div>
          <div>Humidity: {humidityValue ? `${humidityValue}%` : 'Not set'}</div>
        </div>
      </div>

      {/* OCR Input */}
      {currentInput === 'temperature' && (
        <div className="space-y-2">
          <h3 className="font-medium">Scan Temperature Reading</h3>
          <OcrInput 
            label="Temperature (°C)" 
            onConfirm={handleTemperatureConfirm}
          />
        </div>
      )}

      {currentInput === 'humidity' && (
        <div className="space-y-2">
          <h3 className="font-medium">Scan Humidity Reading</h3>
          <OcrInput 
            label="Humidity (%)" 
            onConfirm={handleHumidityConfirm}
          />
        </div>
      )}

      {currentInput === 'done' && (
        <div className="text-center space-y-4">
          <div className="text-green-600 font-medium">✓ Scanning Complete!</div>
          <button 
            onClick={resetTest}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Again
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">How to use:</h3>
        <ol className="list-decimal list-inside space-y-1 text-gray-700">
          <li>Position the green crop box over the number you want to scan</li>
          <li>Drag the box to move it, use the corner handle to resize</li>
          <li>The app will automatically scan every 2 seconds</li>
          <li>Click "Scan Now" for immediate scanning</li>
          <li>Click "Confirm" when the correct value is detected</li>
        </ol>
      </div>
    </div>
  );
}

export default TestEnhancedOcr;
