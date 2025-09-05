import React, { useRef, useEffect, useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { Button } from './ui/button';

/**
 * Enhanced OcrInput Component
 *
 * Uses the device camera and Tesseract.js to read digital numbers with resizable crop area.
 * Features:
 * - Resizable crop overlay for precise text selection
 * - Real-time preview of detected text
 * - Improved OCR accuracy by analyzing only the selected region
 * - Touch/mouse-friendly crop area adjustment
 */
export default function OcrInput({ label, onConfirm }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [preview, setPreview] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState(null);
  
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
            width: { ideal: 1280 },
            height: { ideal: 720 }
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

  // OCR processing with cropped area
  const performOCR = useCallback(async () => {
    if (!videoRef.current || !cropCanvasRef.current || !videoLoaded || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const video = videoRef.current;
      const canvas = cropCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Calculate actual crop dimensions
      const videoRect = video.getBoundingClientRect();
      const scaleX = video.videoWidth / videoRect.width;
      const scaleY = video.videoHeight / videoRect.height;
      
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
      
      // Enhance image for better OCR
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Apply contrast enhancement
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const enhanced = avg > 128 ? 255 : 0; // Binary threshold
        data[i] = data[i + 1] = data[i + 2] = enhanced;
      }
      ctx.putImageData(imageData, 0, 0);
      
      // Run OCR on cropped and enhanced image
      const result = await Tesseract.recognize(canvas, 'eng', {
        tessedit_char_whitelist: '0123456789.',
        tessedit_pageseg_mode: '8', // Single word mode
        tessedit_ocr_engine_mode: '2' // LSTM mode
      });
      
      const detectedText = result.data.text.replace(/[^0-9.]/g, '').trim();
      if (detectedText && /^\d*\.?\d+$/.test(detectedText)) {
        setPreview(detectedText);
      }
    } catch (err) {
      console.error('OCR error', err);
    } finally {
      setIsProcessing(false);
    }
  }, [cropArea, videoLoaded, isProcessing]);

  // Auto-OCR every 2 seconds
  useEffect(() => {
    if (!videoLoaded) return;
    
    const interval = setInterval(performOCR, 2000);
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
    if (!isNaN(num) && onConfirm) {
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
            
            {/* Crop area border */}
            <div
              className="absolute border-2 border-green-400 bg-transparent pointer-events-auto cursor-move"
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
              <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-green-400 border border-white rounded-full cursor-se-resize pointer-events-auto"
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
                <div className="w-6 h-0.5 bg-green-400"></div>
                <div className="absolute w-0.5 h-6 bg-green-400"></div>
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
          <div className="text-2xl font-mono font-bold text-green-600 min-h-8">
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 mr-2"></div>
                Processing...
              </div>
            ) : (
              preview || 'Position crop area over the number'
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
            disabled={!preview || isProcessing}
          >
            Confirm {label}
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          Drag the green box to position it over the number. Use the corner handle to resize.
        </div>
      </div>
    </div>
  );
}

