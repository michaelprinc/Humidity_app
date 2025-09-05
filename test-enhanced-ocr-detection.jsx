import React, { useState } from 'react';
import OcrInput from './src/components/OcrInput';

/**
 * Test page for Enhanced OCR with Advanced Digital Number Detection
 * 
 * This component tests the new multiple preprocessing pipelines,
 * morphological operations, and confidence-based result validation.
 */
function TestEnhancedOcrDetection() {
  const [temperatureValue, setTemperatureValue] = useState(null);
  const [humidityValue, setHumidityValue] = useState(null);
  const [currentInput, setCurrentInput] = useState('temperature');
  const [testResults, setTestResults] = useState([]);

  const handleTemperatureConfirm = (value) => {
    const result = {
      type: 'temperature',
      value: value,
      timestamp: new Date().toISOString(),
      confidence: 'high' // This would come from the OCR component
    };
    
    setTemperatureValue(value);
    setTestResults(prev => [...prev, result]);
    setCurrentInput('humidity');
    console.log('Enhanced OCR - Temperature confirmed:', value);
  };

  const handleHumidityConfirm = (value) => {
    const result = {
      type: 'humidity',
      value: value,
      timestamp: new Date().toISOString(),
      confidence: 'high'
    };
    
    setHumidityValue(value);
    setTestResults(prev => [...prev, result]);
    setCurrentInput('done');
    console.log('Enhanced OCR - Humidity confirmed:', value);
  };

  const resetTest = () => {
    setTemperatureValue(null);
    setHumidityValue(null);
    setCurrentInput('temperature');
    setTestResults([]);
  };

  const exportTestResults = () => {
    const data = JSON.stringify(testResults, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-test-results-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Enhanced OCR Detection Test</h1>
        <p className="text-gray-600">Testing advanced digital number detection with:</p>
        <ul className="text-sm text-gray-500 mt-2 space-y-1">
          <li>• Multiple preprocessing pipelines</li>
          <li>• Morphological operations for line-based digits</li>
          <li>• Confidence-based result validation</li>
          <li>• Edge enhancement and adaptive thresholding</li>
        </ul>
      </div>

      {/* Enhanced Results Display */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border">
        <h2 className="font-semibold mb-3 text-center">Enhanced OCR Results</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Temperature:</span>
            <span className={`text-lg font-mono ${temperatureValue ? 'text-green-600' : 'text-gray-400'}`}>
              {temperatureValue ? `${temperatureValue}°C` : 'Not detected'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Humidity:</span>
            <span className={`text-lg font-mono ${humidityValue ? 'text-green-600' : 'text-gray-400'}`}>
              {humidityValue ? `${humidityValue}%` : 'Not detected'}
            </span>
          </div>
        </div>
        
        {testResults.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Test Session:</div>
            <div className="text-xs text-gray-500">
              Total readings: {testResults.length} | 
              Last updated: {new Date(testResults[testResults.length - 1]?.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      {/* OCR Input with Enhanced Features */}
      {currentInput === 'temperature' && (
        <div className="space-y-2">
          <div className="text-center text-sm font-medium text-blue-600">
            Step 1: Scan Temperature Reading
          </div>
          <OcrInput 
            label="Temperature" 
            onConfirm={handleTemperatureConfirm} 
          />
          <div className="text-xs text-center text-gray-500">
            Enhanced preprocessing will automatically apply multiple filters for better digit recognition
          </div>
        </div>
      )}

      {currentInput === 'humidity' && (
        <div className="space-y-2">
          <div className="text-center text-sm font-medium text-green-600">
            Step 2: Scan Humidity Reading
          </div>
          <OcrInput 
            label="Humidity" 
            onConfirm={handleHumidityConfirm} 
          />
          <div className="text-xs text-center text-gray-500">
            Watch the border color change based on detection confidence
          </div>
        </div>
      )}

      {currentInput === 'done' && (
        <div className="text-center space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-800 font-medium mb-2">✅ Enhanced OCR Test Complete!</div>
            <div className="text-sm text-green-600">
              Both temperature and humidity readings captured successfully using advanced preprocessing
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={resetTest}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Test Again
            </button>
            <button 
              onClick={exportTestResults}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Export Results
            </button>
          </div>
        </div>
      )}

      {/* Advanced Features Info */}
      <div className="bg-gray-50 p-3 rounded-lg border">
        <h3 className="text-sm font-semibold mb-2">Enhanced Features Active:</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span>Morphological ops</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            <span>Edge enhancement</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
            <span>Multi-pipeline</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
            <span>Confidence scoring</span>
          </div>
        </div>
      </div>

      {/* Usage Tips */}
      <div className="text-xs text-gray-500 space-y-1">
        <div className="font-medium">Enhanced OCR Tips:</div>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Position crop area precisely over digits</li>
          <li>Green border = high confidence (&gt;70%)</li>
          <li>Yellow border = medium confidence (40-70%)</li>
          <li>Red border = low confidence (&lt;40%)</li>
          <li>System runs multiple detection algorithms automatically</li>
        </ul>
      </div>
    </div>
  );
}

export default TestEnhancedOcrDetection;
