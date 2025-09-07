import React, { useRef, useEffect, useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { Button } from './ui/button';

/**
 * Enhanced OCR Input Component with Advanced Digital Number Detection
 * 
 * Features:
 * - Multiple preprocessing pipelines for digital displays
 * - Advanced morphological operations for line-based digits
 * - Multiple OCR engine configurations with confidence scoring
 * - Specialized filters for seven-segment displays
 * - Real-time image enhancement and noise reduction
 */
export default function OcrInput({ label, onConfirm }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const workerRef = useRef(null);
  
  const [preview, setPreview] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Crop area state (relative to video dimensions)
  const [cropArea, setCropArea] = useState({
    x: 0.25,      // 25% from left
    y: 0.35,      // 35% from top
    width: 0.5,   // 50% of video width
    height: 0.3   // 30% of video height
  });

  useEffect(() => {
    let stream;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setVideoLoaded(true);
          };
        }
      } catch (err) {
        console.error('Failed to access camera', err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Initialize persistent Tesseract worker with custom model
  useEffect(() => {
    let worker;
    const initWorker = async () => {
      try {
        worker = await Tesseract.createWorker('enhanced_v3', undefined, {
          // Path where enhanced_v3.traineddata is served
          langPath: '/models'
        });
        await worker.loadLanguage('enhanced_v3');
        await worker.initialize('enhanced_v3');
        workerRef.current = worker;
      } catch (err) {
        console.error('Failed to initialize OCR worker', err);
      }
    };
    initWorker();
    return () => {
      worker?.terminate();
    };
  }, []);

  // Advanced image preprocessing for digital displays
  const preprocessImage = (canvas, ctx, imageData) => {
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Create multiple preprocessing pipelines
    const pipelines = [];
    
    // Pipeline 1: Enhanced contrast with morphological operations
    const enhancedData = new Uint8ClampedArray(data);
    
    // Convert to grayscale and apply adaptive thresholding
    for (let i = 0; i < enhancedData.length; i += 4) {
      const r = enhancedData[i];
      const g = enhancedData[i + 1];
      const b = enhancedData[i + 2];
      
      // Weighted grayscale conversion
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      enhancedData[i] = enhancedData[i + 1] = enhancedData[i + 2] = gray;
    }
    
    // Apply Gaussian blur for noise reduction
    const blurredData = applyGaussianBlur(enhancedData, width, height);
    
    // Apply adaptive thresholding
    const thresholdData = applyAdaptiveThreshold(blurredData, width, height);
    
    // Apply morphological operations for digital displays
    const morphData = applyMorphologicalOperations(thresholdData, width, height);
    
    pipelines.push({
      name: 'enhanced_morph',
      data: morphData
    });
    
    // Pipeline 2: High contrast binary for seven-segment displays
    const binaryData = new Uint8ClampedArray(data);
    for (let i = 0; i < binaryData.length; i += 4) {
      const avg = (binaryData[i] + binaryData[i + 1] + binaryData[i + 2]) / 3;
      const binary = avg > 140 ? 255 : 0; // Adjusted threshold for digital displays
      binaryData[i] = binaryData[i + 1] = binaryData[i + 2] = binary;
    }
    pipelines.push({
      name: 'high_contrast_binary',
      data: binaryData
    });
    
    // Pipeline 3: Edge enhancement for line-based digits
    const edgeData = applyEdgeEnhancement(enhancedData, width, height);
    pipelines.push({
      name: 'edge_enhanced',
      data: edgeData
    });
    
    return pipelines;
  };
  
  // Gaussian blur implementation
  const applyGaussianBlur = (data, width, height) => {
    const result = new Uint8ClampedArray(data);
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    const kernelSum = 16;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * width + x) * 4;
        const blurred = sum / kernelSum;
        result[idx] = result[idx + 1] = result[idx + 2] = blurred;
      }
    }
    return result;
  };
  
  // Adaptive thresholding for varying lighting conditions
  const applyAdaptiveThreshold = (data, width, height) => {
    const result = new Uint8ClampedArray(data);
    const blockSize = 15;
    const C = 10;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        
        // Calculate local mean
        for (let dy = -blockSize; dy <= blockSize; dy++) {
          for (let dx = -blockSize; dx <= blockSize; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              sum += data[(ny * width + nx) * 4];
              count++;
            }
          }
        }
        
        const mean = sum / count;
        const idx = (y * width + x) * 4;
        const threshold = data[idx] > (mean - C) ? 255 : 0;
        result[idx] = result[idx + 1] = result[idx + 2] = threshold;
      }
    }
    return result;
  };
  
  // Morphological operations to enhance digit structure
  const applyMorphologicalOperations = (data, width, height) => {
    // Erosion followed by dilation (opening) to remove noise
    const eroded = applyErosion(data, width, height);
    const opened = applyDilation(eroded, width, height);
    
    // Dilation followed by erosion (closing) to fill gaps
    const dilated = applyDilation(opened, width, height);
    const closed = applyErosion(dilated, width, height);
    
    return closed;
  };
  
  const applyErosion = (data, width, height) => {
    const result = new Uint8ClampedArray(data);
    const kernel = [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0]
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let minVal = 255;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            if (kernel[ky][kx]) {
              const idx = ((y + ky - 1) * width + (x + kx - 1)) * 4;
              minVal = Math.min(minVal, data[idx]);
            }
          }
        }
        const idx = (y * width + x) * 4;
        result[idx] = result[idx + 1] = result[idx + 2] = minVal;
      }
    }
    return result;
  };
  
  const applyDilation = (data, width, height) => {
    const result = new Uint8ClampedArray(data);
    const kernel = [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0]
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let maxVal = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            if (kernel[ky][kx]) {
              const idx = ((y + ky - 1) * width + (x + kx - 1)) * 4;
              maxVal = Math.max(maxVal, data[idx]);
            }
          }
        }
        const idx = (y * width + x) * 4;
        result[idx] = result[idx + 1] = result[idx + 2] = maxVal;
      }
    }
    return result;
  };
  
  // Edge enhancement for line-based digits
  const applyEdgeEnhancement = (data, width, height) => {
    const result = new Uint8ClampedArray(data);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const idx = ((y + ky - 1) * width + (x + kx - 1)) * 4;
            const pixel = data[idx];
            const kernelIdx = ky * 3 + kx;
            gx += pixel * sobelX[kernelIdx];
            gy += pixel * sobelY[kernelIdx];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const enhanced = Math.min(255, magnitude);
        const idx = (y * width + x) * 4;
        result[idx] = result[idx + 1] = result[idx + 2] = enhanced;
      }
    }
    return result;
  };

  // Enhanced OCR processing with multiple configurations
  const performOCR = useCallback(async () => {
    if (!videoRef.current || !cropCanvasRef.current || !videoLoaded || isProcessing) return;
    
    setIsProcessing(true);
    setDebugInfo(null);
    
    try {
      const video = videoRef.current;
      const canvas = cropCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Calculate actual crop dimensions
      const videoRect = video.getBoundingClientRect();
      const cropX = cropArea.x * video.videoWidth;
      const cropY = cropArea.y * video.videoHeight;
      const cropWidth = cropArea.width * video.videoWidth;
      const cropHeight = cropArea.height * video.videoHeight;
      
      // Set canvas size to match crop area
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      
      // Draw cropped portion
      ctx.drawImage(
        video,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
      
      // Get image data for preprocessing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Apply multiple preprocessing pipelines
      const pipelines = preprocessImage(canvas, ctx, imageData);
      
      // OCR configurations optimized for digital displays
      const ocrConfigs = [
        {
          name: 'digits_only_lstm',
          options: {
            tessedit_char_whitelist: '0123456789.',
            tessedit_pageseg_mode: '8', // Single word
            tessedit_ocr_engine_mode: '1', // LSTM only
            classify_bln_numeric_mode: '1'
          }
        },
        {
          name: 'digits_legacy',
          options: {
            tessedit_char_whitelist: '0123456789.',
            tessedit_pageseg_mode: '10', // Single character
            tessedit_ocr_engine_mode: '0', // Legacy engine
            classify_bln_numeric_mode: '1'
          }
        },
        {
          name: 'digits_combined',
          options: {
            tessedit_char_whitelist: '0123456789.',
            tessedit_pageseg_mode: '7', // Single line
            tessedit_ocr_engine_mode: '2', // Combined LSTM + Legacy
            classify_bln_numeric_mode: '1',
            textord_really_old_xheight: '1'
          }
        }
      ];
      
      const results = [];

      const worker = workerRef.current;
      if (!worker) {
        console.warn('OCR worker not ready');
        return;
      }

      // Test each pipeline with each OCR configuration
      for (const pipeline of pipelines) {
        // Apply pipeline data to canvas
        const pipelineImageData = new ImageData(pipeline.data, canvas.width, canvas.height);
        ctx.putImageData(pipelineImageData, 0, 0);

        for (const config of ocrConfigs) {
          try {
            await worker.setParameters(config.options);
            const result = await worker.recognize(canvas);

            const detectedText = result.data.text.replace(/[^0-9.]/g, '').trim();
            const confidence = result.data.confidence;
            
            // Validate detected text
            if (detectedText && /^\d*\.?\d+$/.test(detectedText)) {
              const numValue = parseFloat(detectedText);
              // Reasonable range check for temperature/humidity
              if (!isNaN(numValue) && numValue >= 0 && numValue <= 200) {
                results.push({
                  text: detectedText,
                  value: numValue,
                  confidence: confidence,
                  pipeline: pipeline.name,
                  config: config.name
                });
              }
            }
          } catch (err) {
            console.warn(`OCR failed for ${pipeline.name} + ${config.name}:`, err);
          }
        }
      }
      
      // Select best result based on confidence and validation
      if (results.length > 0) {
        // Sort by confidence and select best
        results.sort((a, b) => b.confidence - a.confidence);
        const bestResult = results[0];
        
        // Additional validation: check if multiple results agree
        const agreementCount = results.filter(r => 
          Math.abs(r.value - bestResult.value) < 0.1
        ).length;
        
        const adjustedConfidence = bestResult.confidence * (agreementCount / results.length);
        
        setPreview(bestResult.text);
        setConfidence(adjustedConfidence);
        setDebugInfo({
          totalResults: results.length,
          agreementCount,
          bestPipeline: bestResult.pipeline,
          bestConfig: bestResult.config,
          allResults: results.slice(0, 3) // Show top 3 for debugging
        });
      } else {
        setPreview('');
        setConfidence(0);
        setDebugInfo({ error: 'No valid numbers detected' });
      }
      
    } catch (err) {
      console.error('OCR error', err);
      setDebugInfo({ error: err.message });
    } finally {
      setIsProcessing(false);
    }
  }, [cropArea, videoLoaded, isProcessing]);

  // Auto-OCR every second using preloaded worker for faster feedback
  useEffect(() => {
    if (!videoLoaded) return;

    const interval = setInterval(performOCR, 1000);
    return () => clearInterval(interval);
  }, [performOCR, videoLoaded]);

  // Handle crop area dragging
  const handleMouseDown = useCallback((e, handle) => {
    e.preventDefault();
    setIsDragging(true);
    setDragHandle(handle);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;
    
    setCropArea(prev => {
      let newArea = { ...prev };
      
      switch (dragHandle) {
        case 'move':
          const deltaX = relativeX - (prev.x + prev.width / 2);
          const deltaY = relativeY - (prev.y + prev.height / 2);
          newArea.x = Math.max(0, Math.min(1 - prev.width, prev.x + deltaX));
          newArea.y = Math.max(0, Math.min(1 - prev.height, prev.y + deltaY));
          break;
        case 'resize':
          newArea.width = Math.max(0.1, Math.min(1 - prev.x, relativeX - prev.x));
          newArea.height = Math.max(0.1, Math.min(1 - prev.y, relativeY - prev.y));
          break;
      }
      
      return newArea;
    });
  }, [isDragging, dragHandle]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragHandle(null);
  }, []);

  // Touch event handlers
  const handleTouchStart = useCallback((e, handle) => {
    e.preventDefault();
    setIsDragging(true);
    setDragHandle(handle);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = (touch.clientX - rect.left) / rect.width;
    const relativeY = (touch.clientY - rect.top) / rect.height;
    
    setCropArea(prev => {
      let newArea = { ...prev };
      
      switch (dragHandle) {
        case 'move':
          const deltaX = relativeX - (prev.x + prev.width / 2);
          const deltaY = relativeY - (prev.y + prev.height / 2);
          newArea.x = Math.max(0, Math.min(1 - prev.width, prev.x + deltaX));
          newArea.y = Math.max(0, Math.min(1 - prev.height, prev.y + deltaY));
          break;
        case 'resize':
          newArea.width = Math.max(0.1, Math.min(1 - prev.x, relativeX - prev.x));
          newArea.height = Math.max(0.1, Math.min(1 - prev.y, relativeY - prev.y));
          break;
      }
      
      return newArea;
    });
  }, [isDragging, dragHandle]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setDragHandle(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleConfirm = () => {
    const num = parseFloat(preview);
    if (!isNaN(num) && onConfirm && confidence > 50) { // Require minimum confidence
      onConfirm(num);
    }
  };

  const handleManualScan = () => {
    performOCR();
  };

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="relative w-full bg-black rounded-md overflow-hidden"
        style={{ aspectRatio: '16/9' }}
      >
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Crop overlay */}
        {videoLoaded && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark overlay outside crop area */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              style={{
                clipPath: `polygon(
                  0% 0%, 
                  0% 100%, 
                  ${cropArea.x * 100}% 100%, 
                  ${cropArea.x * 100}% ${cropArea.y * 100}%, 
                  ${(cropArea.x + cropArea.width) * 100}% ${cropArea.y * 100}%, 
                  ${(cropArea.x + cropArea.width) * 100}% ${(cropArea.y + cropArea.height) * 100}%, 
                  ${cropArea.x * 100}% ${(cropArea.y + cropArea.height) * 100}%, 
                  ${cropArea.x * 100}% 100%, 
                  100% 100%, 
                  100% 0%
                )`
              }}
            />
            
            {/* Crop area border with confidence-based color */}
            <div
              className={`absolute border-2 bg-transparent pointer-events-auto cursor-move ${
                confidence > 70 ? 'border-green-400' : 
                confidence > 40 ? 'border-yellow-400' : 
                'border-red-400'
              }`}
              style={{
                left: `${cropArea.x * 100}%`,
                top: `${cropArea.y * 100}%`,
                width: `${cropArea.width * 100}%`,
                height: `${cropArea.height * 100}%`,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
              onTouchStart={(e) => handleTouchStart(e, 'move')}
            >
              {/* Corner handles */}
              <div className={`absolute -bottom-2 -right-2 w-4 h-4 border border-white rounded-full cursor-se-resize pointer-events-auto ${
                confidence > 70 ? 'bg-green-400' : 
                confidence > 40 ? 'bg-yellow-400' : 
                'bg-red-400'
              }`}
                   onMouseDown={(e) => {
                     e.stopPropagation();
                     handleMouseDown(e, 'resize');
                   }}
                   onTouchStart={(e) => {
                     e.stopPropagation();
                     handleTouchStart(e, 'resize');
                   }}
              />
              
              {/* Center crosshair */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-6 h-0.5 ${
                  confidence > 70 ? 'bg-green-400' : 
                  confidence > 40 ? 'bg-yellow-400' : 
                  'bg-red-400'
                }`}></div>
                <div className={`absolute w-0.5 h-6 ${
                  confidence > 70 ? 'bg-green-400' : 
                  confidence > 40 ? 'bg-yellow-400' : 
                  'bg-red-400'
                }`}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading indicator */}
        {!videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <div>Loading camera...</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden canvas for OCR processing */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={cropCanvasRef} className="hidden" />
      
      {/* Controls and preview */}
      <div className="space-y-3">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">Detected Value:</div>
          <div className="text-2xl font-mono font-bold min-h-8">
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-blue-600">Processing...</span>
              </div>
            ) : preview ? (
              <div>
                <span className={`${
                  confidence > 70 ? 'text-green-600' : 
                  confidence > 40 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>{preview}</span>
                <div className="text-xs text-gray-500 mt-1">
                  Confidence: {confidence.toFixed(0)}%
                </div>
              </div>
            ) : (
              <span className="text-gray-400">Position crop area over the number</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleManualScan} 
            variant="outline" 
            className="flex-1"
            disabled={isProcessing || !videoLoaded}
          >
            Scan Now
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="flex-1"
            disabled={!preview || isProcessing || confidence < 50}
          >
            Confirm {label}
          </Button>
        </div>
        
        {/* Debug information */}
        {debugInfo && (
          <div className="text-xs bg-gray-100 p-2 rounded">
            {debugInfo.error ? (
              <div className="text-red-600">Error: {debugInfo.error}</div>
            ) : (
              <div>
                <div>Results: {debugInfo.totalResults}, Agreement: {debugInfo.agreementCount}</div>
                <div>Best: {debugInfo.bestPipeline} + {debugInfo.bestConfig}</div>
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-gray-500 text-center">
          Drag the green box to position it over the number. Border color indicates detection confidence.
        </div>
      </div>
    </div>
  );
}

