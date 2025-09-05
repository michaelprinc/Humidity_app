import React, { useRef, useEffect, useState } from 'react';
import Tesseract from 'tesseract.js';
import { Button } from './ui/button';

/**
 * OcrInput Component
 *
 * Uses the device camera and Tesseract.js to read digital numbers.
 * Performs recognition once per second and shows the latest value.
 * The user can confirm the detected value via a button.
 */
export default function OcrInput({ label, onConfirm }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    let stream;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
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

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      try {
        const result = await Tesseract.recognize(canvas, 'eng', {
          tessedit_char_whitelist: '0123456789.'
        });
        const value = result.data.text.replace(/[^0-9.]/g, '').trim();
        if (value) {
          setPreview(value);
        }
      } catch (err) {
        console.error('OCR error', err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirm = () => {
    const num = parseFloat(preview);
    if (!isNaN(num) && onConfirm) {
      onConfirm(num);
    }
  };

  return (
    <div className="space-y-2">
      <video ref={videoRef} autoPlay playsInline className="w-full rounded-md" />
      <canvas ref={canvasRef} width={200} height={100} className="hidden" />
      <div className="text-center text-lg font-medium">{preview || '...'}</div>
      <Button onClick={handleConfirm} className="w-full">Confirm {label}</Button>
    </div>
  );
}

