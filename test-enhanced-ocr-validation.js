/**
 * Enhanced OCR Detection Validation Script
 * 
 * This script validates the improved OCR capabilities for digital number detection.
 * It tests various image preprocessing techniques and OCR configurations.
 */

import Tesseract from 'tesseract.js';

// Test configurations for digital display recognition
const testConfigurations = [
  {
    name: 'Enhanced LSTM with Morphology',
    options: {
      tessedit_char_whitelist: '0123456789.',
      tessedit_pageseg_mode: '8', // Single word
      tessedit_ocr_engine_mode: '1', // LSTM only
      classify_bln_numeric_mode: '1',
      textord_really_old_xheight: '1'
    }
  },
  {
    name: 'Legacy Engine for Line Segments',
    options: {
      tessedit_char_whitelist: '0123456789.',
      tessedit_pageseg_mode: '10', // Single character
      tessedit_ocr_engine_mode: '0', // Legacy engine
      classify_bln_numeric_mode: '1'
    }
  },
  {
    name: 'Combined Engine Single Line',
    options: {
      tessedit_char_whitelist: '0123456789.',
      tessedit_pageseg_mode: '7', // Single line
      tessedit_ocr_engine_mode: '2', // Combined LSTM + Legacy
      classify_bln_numeric_mode: '1',
      textord_really_old_xheight: '1'
    }
  },
  {
    name: 'Raw Image Single Word',
    options: {
      tessedit_char_whitelist: '0123456789.',
      tessedit_pageseg_mode: '13', // Raw line
      tessedit_ocr_engine_mode: '1'
    }
  }
];

// Create test canvas with synthetic digital display
function createTestCanvas(number, style = 'seven-segment') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 200;
  canvas.height = 80;
  
  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (style === 'seven-segment') {
    // Simulate seven-segment display
    ctx.fillStyle = '#00FF00'; // Green digits
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), canvas.width / 2, canvas.height / 2);
  } else if (style === 'lcd') {
    // Simulate LCD display
    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0066FF';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), canvas.width / 2, canvas.height / 2);
  }
  
  return canvas;
}

// Apply image preprocessing
function applyPreprocessing(canvas, type = 'enhanced') {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  if (type === 'enhanced') {
    // Enhanced preprocessing pipeline
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      
      // Apply enhanced thresholding for digital displays
      const threshold = avg > 100 ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = threshold;
    }
  } else if (type === 'adaptive') {
    // Adaptive thresholding
    const width = canvas.width;
    const height = canvas.height;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Local adaptive threshold
        let localSum = 0;
        let count = 0;
        const blockSize = 5;
        
        for (let dy = -blockSize; dy <= blockSize; dy++) {
          for (let dx = -blockSize; dx <= blockSize; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const localIdx = (ny * width + nx) * 4;
              localSum += (data[localIdx] + data[localIdx + 1] + data[localIdx + 2]) / 3;
              count++;
            }
          }
        }
        
        const localMean = localSum / count;
        const threshold = avg > (localMean - 10) ? 255 : 0;
        data[idx] = data[idx + 1] = data[idx + 2] = threshold;
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Run OCR validation tests
async function runOcrValidation() {
  console.log('🔍 Starting Enhanced OCR Validation Tests...\n');

  // Create and initialize worker once with enhanced model
  const worker = await Tesseract.createWorker('enhanced_v3', undefined, {
    langPath: './models'
  });
  await worker.loadLanguage('enhanced_v3');
  await worker.initialize('enhanced_v3');

  const testNumbers = ['23.5', '45.2', '67.8', '12.0', '99.9', '8.5'];
  const testStyles = ['seven-segment', 'lcd'];
  const preprocessingTypes = ['enhanced', 'adaptive'];

  const results = [];

  for (const number of testNumbers) {
    console.log(`Testing number: ${number}`);
    
    for (const style of testStyles) {
      for (const preprocessing of preprocessingTypes) {
        console.log(`  Style: ${style}, Preprocessing: ${preprocessing}`);
        
        // Create test canvas
        const canvas = createTestCanvas(number, style);
        
        // Apply preprocessing
        applyPreprocessing(canvas, preprocessing);
        
        // Test each configuration
        for (const config of testConfigurations) {
          try {
            const startTime = Date.now();
            await worker.setParameters(config.options);
            const result = await worker.recognize(canvas);
            const endTime = Date.now();
            
            const detectedText = result.data.text.replace(/[^0-9.]/g, '').trim();
            const confidence = result.data.confidence;
            const isCorrect = detectedText === number;
            
            const testResult = {
              expectedNumber: number,
              detectedText,
              isCorrect,
              confidence,
              style,
              preprocessing,
              configuration: config.name,
              processingTime: endTime - startTime
            };
            
            results.push(testResult);
            
            console.log(`    ${config.name}: ${detectedText} (${confidence.toFixed(1)}%) ${isCorrect ? '✅' : '❌'}`);
            
          } catch (error) {
            console.log(`    ${config.name}: ERROR - ${error.message} ❌`);
            results.push({
              expectedNumber: number,
              detectedText: 'ERROR',
              isCorrect: false,
              confidence: 0,
              style,
              preprocessing,
              configuration: config.name,
              error: error.message
            });
          }
        }
      }
    }
    console.log('');
  }
  
  // Analyze results
  console.log('📊 Validation Results Summary:\n');
  
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.isCorrect).length;
  const accuracyRate = (successfulTests / totalTests * 100).toFixed(1);
  
  console.log(`Overall Accuracy: ${successfulTests}/${totalTests} (${accuracyRate}%)`);
  
  // Best performing configurations
  const configPerformance = {};
  testConfigurations.forEach(config => {
    const configResults = results.filter(r => r.configuration === config.name);
    const configSuccess = configResults.filter(r => r.isCorrect).length;
    const configAccuracy = (configSuccess / configResults.length * 100).toFixed(1);
    const avgConfidence = configResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / configResults.length;
    
    configPerformance[config.name] = {
      accuracy: configAccuracy,
      avgConfidence: avgConfidence.toFixed(1),
      successCount: configSuccess,
      totalCount: configResults.length
    };
  });
  
  console.log('\n🏆 Configuration Performance:');
  Object.entries(configPerformance).forEach(([name, perf]) => {
    console.log(`  ${name}: ${perf.accuracy}% accuracy, ${perf.avgConfidence}% avg confidence`);
  });
  
  // Preprocessing performance
  const preprocessingPerformance = {};
  preprocessingTypes.forEach(type => {
    const typeResults = results.filter(r => r.preprocessing === type);
    const typeSuccess = typeResults.filter(r => r.isCorrect).length;
    const typeAccuracy = (typeSuccess / typeResults.length * 100).toFixed(1);
    
    preprocessingPerformance[type] = {
      accuracy: typeAccuracy,
      successCount: typeSuccess,
      totalCount: typeResults.length
    };
  });
  
  console.log('\n🎨 Preprocessing Performance:');
  Object.entries(preprocessingPerformance).forEach(([name, perf]) => {
    console.log(`  ${name}: ${perf.accuracy}% accuracy (${perf.successCount}/${perf.totalCount})`);
  });
  
  // Style performance
  const stylePerformance = {};
  testStyles.forEach(style => {
    const styleResults = results.filter(r => r.style === style);
    const styleSuccess = styleResults.filter(r => r.isCorrect).length;
    const styleAccuracy = (styleSuccess / styleResults.length * 100).toFixed(1);
    
    stylePerformance[style] = {
      accuracy: styleAccuracy,
      successCount: styleSuccess,
      totalCount: styleResults.length
    };
  });
  
  console.log('\n🖥️ Display Style Performance:');
  Object.entries(stylePerformance).forEach(([name, perf]) => {
    console.log(`  ${name}: ${perf.accuracy}% accuracy (${perf.successCount}/${perf.totalCount})`);
  });
  
  // Recommendations
  console.log('\n💡 Recommendations for Digital Number Detection:');
  
  const bestConfig = Object.entries(configPerformance).reduce((a, b) => 
    parseFloat(a[1].accuracy) > parseFloat(b[1].accuracy) ? a : b
  );
  console.log(`  • Best OCR Configuration: ${bestConfig[0]} (${bestConfig[1].accuracy}% accuracy)`);
  
  const bestPreprocessing = Object.entries(preprocessingPerformance).reduce((a, b) => 
    parseFloat(a[1].accuracy) > parseFloat(b[1].accuracy) ? a : b
  );
  console.log(`  • Best Preprocessing: ${bestPreprocessing[0]} (${bestPreprocessing[1].accuracy}% accuracy)`);
  
  if (parseFloat(accuracyRate) < 80) {
    console.log('  • Consider implementing additional preprocessing techniques');
    console.log('  • Test with different threshold values for your specific display type');
    console.log('  • Ensure proper lighting and crop area positioning');
  } else {
    console.log('  • Current configuration shows good performance for digital displays');
    console.log('  • Consider using multiple configurations in parallel for best results');
  }

  await worker.terminate();

  return {
    overallAccuracy: accuracyRate,
    bestConfiguration: bestConfig[0],
    bestPreprocessing: bestPreprocessing[0],
    detailedResults: results
  };
}

// Export for use in Node.js or browser
if (typeof window !== 'undefined') {
  // Browser environment
  window.runOcrValidation = runOcrValidation;
  console.log('OCR Validation loaded. Run runOcrValidation() to test.');
} else {
  // Node.js environment
  runOcrValidation().then(results => {
    console.log('\n✅ OCR Validation Complete!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ OCR Validation Failed:', error);
    process.exit(1);
  });
}
