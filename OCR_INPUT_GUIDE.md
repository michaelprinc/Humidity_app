# Enhanced OCR Indoor Input Guide

This guide describes the enhanced OCR-based indoor temperature and humidity input with resizable crop area for improved accuracy.

## 1. Install OCR Library

The feature uses [Tesseract.js](https://github.com/naptha/tesseract.js) for optical character recognition.

```bash
npm install tesseract.js
```

## 2. Enhanced OCR Input Component

`src/components/OcrInput.jsx` implements camera access and OCR processing with the following improvements:

### Key Features:
- **Resizable Crop Area**: Interactive green overlay for precise number selection
- **Touch/Mouse Support**: Drag to move, corner handle to resize crop area
- **Image Enhancement**: Automatic contrast adjustment for better OCR accuracy  
- **Real-time Preview**: Live detection with 2-second intervals
- **Manual Scan**: On-demand scanning with "Scan Now" button
- **LSTM OCR Mode**: Uses advanced recognition engine for better accuracy

### Technical Improvements:
- Higher resolution camera input (1280x720 ideal)
- Binary threshold image processing for cleaner text
- Single word OCR mode (PSM 8) for number detection
- Cropped region analysis to reduce processing time
- Enhanced error handling and loading states

## 3. Integration with IndoorTemperature Component

The `IndoorTemperature` component supports OCR as a data source:

- Added a **Camera OCR** option to the data source selector
- OCR scanning workflow: temperature → humidity → done
- Uses the enhanced `OcrInput` component with crop area functionality
- Automatically updates indoor readings when scanning is complete

## 4. Usage Instructions

### Basic Workflow:
1. Choose **Camera OCR** from the indoor temperature source menu
2. **Position the crop area**: Drag the green box over the temperature display
3. **Resize if needed**: Use the corner handle to adjust the crop area size
4. **Wait for detection**: The app scans automatically every 2 seconds
5. **Manual scan**: Click "Scan Now" for immediate processing
6. **Confirm temperature**: Click "Confirm" when the correct value appears
7. **Repeat for humidity**: Follow the same process for humidity reading

### Crop Area Controls:
- **Move**: Drag anywhere inside the green box
- **Resize**: Drag the corner handle (bottom-right)
- **Visual feedback**: Crosshair shows center of crop area
- **Real-time preview**: Dark overlay shows excluded areas

### Tips for Best Results:
- Position crop area tightly around the number (exclude surrounding text/symbols)
- Ensure good lighting on the display
- Keep camera steady during scanning
- Clean displays work better than dirty/scratched ones
- Use landscape orientation for better crop control

## 5. Technical Notes

### OCR Enhancements:
- **Image preprocessing**: Binary threshold conversion for cleaner recognition
- **Optimized parameters**: Single word mode (PSM 8) with LSTM engine
- **Character filtering**: Only allows digits and decimal points
- **Validation**: Ensures detected text matches number format

### Performance Optimizations:
- Only processes the cropped region (faster than full frame)
- 2-second intervals to balance accuracy and responsiveness  
- Background processing doesn't block UI interactions
- Automatic memory management for canvas operations

### Browser Compatibility:
- Works on modern browsers with camera access
- Touch-friendly controls for mobile devices
- Responsive design adapts to different screen sizes
- Fallback handling for camera permission issues

## 6. Troubleshooting

### Common Issues:
- **No detection**: Make crop area smaller, improve lighting
- **Wrong numbers**: Position crop more precisely over target digit
- **Slow performance**: Ensure good device performance, close other apps
- **Camera not working**: Check browser permissions, try refreshing page

### Development Testing:
Use `test-enhanced-ocr.jsx` for isolated testing of the OCR functionality without the full app context.

