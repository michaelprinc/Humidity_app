"""
Seven-Segment OCR Integration for Humidity App
=============================================

Integration module that provides trained CNN model inference
for enhanced seven-segment digit recognition in the Humidity app.
"""

import tensorflow as tf
import numpy as np
import cv2
import os
import json
from typing import Dict, List, Tuple, Optional

class SevenSegmentOCR:
    """
    Production-ready OCR class for seven-segment digit recognition
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize OCR with trained model
        
        Args:
            model_path: Path to trained model file
        """
        self.model = None
        self.input_shape = (300, 200, 3)
        self.confidence_threshold = 0.7
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def load_model(self, model_path: str):
        """
        Load trained CNN model
        """
        try:
            self.model = tf.keras.models.load_model(model_path)
            print(f"✓ Seven-segment OCR model loaded from {model_path}")
        except Exception as e:
            print(f"✗ Error loading model: {e}")
            raise
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for model inference
        
        Args:
            image: Input image (BGR or RGB)
            
        Returns:
            Preprocessed image ready for model
        """
        # Convert BGR to RGB if needed
        if len(image.shape) == 3 and image.shape[2] == 3:
            if image[0, 0, 0] == image[0, 0, 2]:  # Simple check for BGR vs RGB
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize to model input size
        resized = cv2.resize(image, (self.input_shape[1], self.input_shape[0]))
        
        # Ensure 3 channels
        if len(resized.shape) == 2:
            resized = cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)
        
        # Normalize to [0, 1]
        normalized = resized.astype(np.float32) / 255.0
        
        # Add batch dimension
        batched = np.expand_dims(normalized, axis=0)
        
        return batched
    
    def enhance_seven_segment_image(self, image: np.ndarray) -> np.ndarray:
        """
        Apply specific preprocessing for seven-segment displays
        
        Args:
            image: Input image
            
        Returns:
            Enhanced image
        """
        # Convert to grayscale for processing
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image.copy()
        
        # Apply CLAHE for better contrast
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
        
        # Adaptive thresholding
        binary = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Morphological operations to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        
        # Convert back to RGB
        result = cv2.cvtColor(cleaned, cv2.COLOR_GRAY2RGB)
        
        return result
    
    def predict_digit(self, image: np.ndarray, enhance: bool = True) -> Dict:
        """
        Predict single digit from image
        
        Args:
            image: Input image containing seven-segment digit
            enhance: Whether to apply seven-segment specific enhancement
            
        Returns:
            Dictionary with prediction results
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        try:
            # Enhance image if requested
            if enhance:
                processed_image = self.enhance_seven_segment_image(image)
            else:
                processed_image = image
            
            # Preprocess for model
            model_input = self.preprocess_image(processed_image)
            
            # Get prediction
            prediction = self.model.predict(model_input, verbose=0)
            probabilities = prediction[0]
            
            # Get results
            predicted_digit = int(np.argmax(probabilities))
            confidence = float(np.max(probabilities))
            
            # Sort all probabilities
            sorted_indices = np.argsort(probabilities)[::-1]
            top_predictions = [
                {
                    'digit': int(idx),
                    'confidence': float(probabilities[idx])
                }
                for idx in sorted_indices[:3]  # Top 3 predictions
            ]
            
            return {
                'digit': predicted_digit,
                'confidence': confidence,
                'is_confident': confidence >= self.confidence_threshold,
                'top_predictions': top_predictions,
                'all_probabilities': probabilities.tolist()
            }
            
        except Exception as e:
            return {
                'digit': None,
                'confidence': 0.0,
                'is_confident': False,
                'error': str(e)
            }
    
    def predict_number_sequence(self, images: List[np.ndarray], 
                              enhance: bool = True) -> Dict:
        """
        Predict sequence of digits (e.g., temperature reading like 23.5)
        
        Args:
            images: List of images containing individual digits
            enhance: Whether to apply seven-segment specific enhancement
            
        Returns:
            Dictionary with sequence prediction results
        """
        if not images:
            return {'number': None, 'confidence': 0.0, 'digits': []}
        
        digit_results = []
        total_confidence = 0.0
        
        for i, img in enumerate(images):
            result = self.predict_digit(img, enhance=enhance)
            digit_results.append(result)
            
            if result.get('confidence', 0) > 0:
                total_confidence += result['confidence']
        
        # Average confidence
        avg_confidence = total_confidence / len(images) if images else 0.0
        
        # Build number string
        number_str = ""
        for result in digit_results:
            if result.get('digit') is not None:
                number_str += str(result['digit'])
            else:
                number_str += "?"
        
        # Try to convert to float if it looks like a number
        try:
            if '?' not in number_str and len(number_str) > 0:
                # Handle decimal point (assume it's after first 2 digits for temperature)
                if len(number_str) >= 3:
                    number_value = float(number_str[:2] + '.' + number_str[2:])
                else:
                    number_value = float(number_str)
            else:
                number_value = None
        except ValueError:
            number_value = None
        
        return {
            'number': number_value,
            'number_string': number_str,
            'confidence': avg_confidence,
            'is_confident': avg_confidence >= self.confidence_threshold,
            'digit_results': digit_results
        }
    
    def set_confidence_threshold(self, threshold: float):
        """
        Set confidence threshold for predictions
        
        Args:
            threshold: Confidence threshold (0.0 to 1.0)
        """
        self.confidence_threshold = max(0.0, min(1.0, threshold))
    
    def benchmark_model(self, test_images_dir: str) -> Dict:
        """
        Benchmark model performance on test images
        
        Args:
            test_images_dir: Directory containing test images
            
        Returns:
            Performance metrics
        """
        if not os.path.exists(test_images_dir):
            return {'error': 'Test directory not found'}
        
        results = []
        correct_predictions = 0
        total_predictions = 0
        
        for filename in os.listdir(test_images_dir):
            if filename.endswith(('.png', '.jpg', '.jpeg')):
                # Extract true label from filename if possible
                if 'seven_segment_' in filename:
                    try:
                        true_digit = int(filename.split('_')[2])
                        
                        # Load and predict
                        img_path = os.path.join(test_images_dir, filename)
                        img = cv2.imread(img_path)
                        
                        prediction = self.predict_digit(img)
                        predicted_digit = prediction.get('digit')
                        
                        if predicted_digit is not None:
                            is_correct = predicted_digit == true_digit
                            if is_correct:
                                correct_predictions += 1
                            
                            results.append({
                                'filename': filename,
                                'true_digit': true_digit,
                                'predicted_digit': predicted_digit,
                                'confidence': prediction.get('confidence', 0),
                                'correct': is_correct
                            })
                            
                            total_predictions += 1
                        
                    except (ValueError, IndexError):
                        continue
        
        accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0
        
        return {
            'accuracy': accuracy,
            'correct_predictions': correct_predictions,
            'total_predictions': total_predictions,
            'detailed_results': results
        }


class HumidityAppOCRIntegration:
    """
    High-level integration class for Humidity App
    """
    
    def __init__(self, model_path: str = "seven_segment_cnn_final.h5"):
        """
        Initialize OCR integration for Humidity App
        """
        self.ocr = SevenSegmentOCR()
        self.model_path = os.path.join(
            os.path.dirname(__file__), 
            model_path
        )
        
        # Try to load model
        if os.path.exists(self.model_path):
            self.ocr.load_model(self.model_path)
            self.is_ready = True
        else:
            print(f"⚠ Model not found at {self.model_path}")
            print("  Train the model first using seven_segment_cnn_model.py")
            self.is_ready = False
    
    def process_humidity_reading(self, image: np.ndarray) -> Dict:
        """
        Process humidity reading from seven-segment display
        
        Args:
            image: Image containing humidity reading
            
        Returns:
            Processed result with humidity value and confidence
        """
        if not self.is_ready:
            return {
                'humidity': None,
                'confidence': 0.0,
                'error': 'OCR model not ready'
            }
        
        result = self.ocr.predict_digit(image, enhance=True)
        
        # Validate humidity range (0-100%)
        if result.get('digit') is not None:
            humidity_value = result['digit']
            if 0 <= humidity_value <= 100:
                return {
                    'humidity': humidity_value,
                    'confidence': result.get('confidence', 0),
                    'is_confident': result.get('is_confident', False),
                    'method': 'CNN Seven-Segment OCR'
                }
        
        return {
            'humidity': None,
            'confidence': result.get('confidence', 0),
            'error': 'Invalid humidity reading',
            'raw_result': result
        }
    
    def process_temperature_reading(self, image: np.ndarray) -> Dict:
        """
        Process temperature reading from seven-segment display
        
        Args:
            image: Image containing temperature reading
            
        Returns:
            Processed result with temperature value and confidence
        """
        if not self.is_ready:
            return {
                'temperature': None,
                'confidence': 0.0,
                'error': 'OCR model not ready'
            }
        
        result = self.ocr.predict_digit(image, enhance=True)
        
        # Validate temperature range (-50 to 100°C)
        if result.get('digit') is not None:
            temp_value = result['digit']
            if -50 <= temp_value <= 100:
                return {
                    'temperature': temp_value,
                    'confidence': result.get('confidence', 0),
                    'is_confident': result.get('is_confident', False),
                    'method': 'CNN Seven-Segment OCR'
                }
        
        return {
            'temperature': None,
            'confidence': result.get('confidence', 0),
            'error': 'Invalid temperature reading',
            'raw_result': result
        }
    
    def get_model_info(self) -> Dict:
        """
        Get information about loaded model
        """
        if not self.is_ready:
            return {'status': 'not_ready', 'model_path': self.model_path}
        
        return {
            'status': 'ready',
            'model_path': self.model_path,
            'input_shape': self.ocr.input_shape,
            'confidence_threshold': self.ocr.confidence_threshold,
            'model_summary': str(self.ocr.model.summary() if self.ocr.model else 'Not available')
        }


# Example usage and testing
if __name__ == "__main__":
    # Test integration
    integration = HumidityAppOCRIntegration()
    
    print("OCR Integration Status:")
    print(json.dumps(integration.get_model_info(), indent=2))
    
    if integration.is_ready:
        print("\n✓ Seven-Segment OCR ready for Humidity App integration")
    else:
        print("\n✗ Seven-Segment OCR not ready - train model first")
