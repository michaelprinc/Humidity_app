# OCR Indoor Input Guide

This guide describes how to add OCR-based indoor temperature and humidity input to the Humidity app.

## 1. Install OCR Library

The feature uses [Tesseract.js](https://github.com/naptha/tesseract.js) for optical character recognition.

```bash
npm install tesseract.js
```

## 2. Create OCR Input Component

`src/components/OcrInput.jsx` implements camera access and OCR processing. It:

- Opens the device camera (preferring the rear camera on mobile).
- Captures a frame every second.
- Runs Tesseract.js to extract numeric values.
- Displays the latest detected value and allows the user to confirm it.

## 3. Integrate into IndoorTemperature Component

The `IndoorTemperature` component now supports a new data source named `ocr`.

- Added a **Camera OCR** option to the data source selector.
- Added state to manage OCR scanning stages (temperature → humidity → done).
- Created `renderOcrView` to handle the scanning workflow and update the stored indoor values when finished.
- Imports the new `OcrInput` component and `Camera` icon.

## 4. Usage

1. Choose **Camera OCR** from the indoor temperature source menu.
2. Point the camera at the temperature reading; the detected value updates every second.
3. Confirm the temperature, then scan and confirm the humidity value.
4. The confirmed values populate the indoor readings for the app.

## 5. Notes

- The OCR model runs entirely in the browser, so no network connection is required after initial load.
- Ensure adequate lighting and alignment for best results.
- The component can be extended to add retry or manual adjustment options if needed.

