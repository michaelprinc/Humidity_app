"""
Production OCR Integration for Humidity App
==========================================

Production-ready integration of fine-tuned CNN model for seven-segment digit recognition
in the Humidity App with fallback to traditional OCR methods.
"""

import os
import sys
import json
import numpy as np
import cv2
from typing import Dict, List, Optional, Tuple
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProductionOCR:
    """
    Production OCR system with CNN model and traditional OCR fallback
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize production OCR system
        
        Args:
            model_path: Path to trained CNN model (auto-detects v3 if not specified)
        """
        self.cnn_model = None
        self.cnn_available = False
        self.confidence_threshold = 0.5
        
        # Auto-detect v3 model if no path specified
        if model_path is None:
            current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            # Try v3 model first
            v3_model_path = os.path.join(current_dir, "seven_segment_2k_enhanced_v3_model.keras")
            if os.path.exists(v3_model_path):
                model_path = v3_model_path
                logger.info("Auto-detected v3 model")
            else:
                # Fallback to v2 model
                v2_model_path = os.path.join(current_dir, "seven_segment_2k_enhanced_v2_model.keras")
                if os.path.exists(v2_model_path):
                    model_path = v2_model_path
                    logger.info("Using v2 model as fallback")
        
        # Try to load CNN model
        if model_path and os.path.exists(model_path):
            try:
                import tensorflow as tf
                self.cnn_model = tf.keras.models.load_model(model_path)
                self.cnn_available = True
                self.model_path = model_path
                # Detect model version
                self.model_version = "v3" if "v3" in model_path else "v2"
                logger.info(f"✓ CNN model loaded: {model_path} ({self.model_version})")
            except Exception as e:
                logger.warning(f"⚠ Failed to load CNN model: {e}")
                logger.info("Falling back to traditional OCR methods")
        
        # Initialize traditional OCR as fallback
        try:
            import pytesseract
            self.tesseract_available = True
            logger.info("✓ Tesseract OCR available as fallback")
        except ImportError:
            self.tesseract_available = False
            logger.warning("⚠ Tesseract not available")
    
    def preprocess_seven_segment_image(self, image: np.ndarray) -> np.ndarray:
        """
        Specialized preprocessing for seven-segment displays (v2 model)
        
        Args:
            image: Input image
            
        Returns:
            Preprocessed image
        """
        # Convert to grayscale if needed
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
        
        return cleaned
    
    def preprocess_seven_segment_image_v3(self, image: np.ndarray) -> np.ndarray:
        """
        Enhanced preprocessing for seven-segment displays (v3 model)
        Structure-first preprocessing: grayscale + binary + edges channels
        
        Args:
            image: Input image
            
        Returns:
            Preprocessed image optimized for v3 model
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image.copy()
        
        # Enhanced contrast with CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Conservative gaussian blur for noise reduction
        blurred = cv2.GaussianBlur(enhanced, (3, 3), 0.5)
        
        # Adaptive thresholding for binary representation
        binary = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 15, 2
        )
        
        # Edge detection for structure awareness
        edges = cv2.Canny(blurred, 50, 150)
        
        # Morphological operations for segment cleaning
        kernel_rect = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 3))
        kernel_ellipse = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        
        # Clean binary image
        binary_cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_rect)
        binary_cleaned = cv2.morphologyEx(binary_cleaned, cv2.MORPH_OPEN, kernel_ellipse)
        
        # Combine features for v3 model input
        # Use binary as primary channel for segment structure
        return binary_cleaned
    
    def cnn_predict_digit(self, image: np.ndarray) -> Dict:
        """
        Predict digit using CNN model (supports both v2 and v3 architectures)
        
        Args:
            image: Input image containing seven-segment digit
            
        Returns:
            Prediction result dictionary
        """
        if not self.cnn_available:
            return {'error': 'CNN model not available'}
        
        try:
            # Preprocess image with enhanced pipeline for v3
            processed = self.preprocess_seven_segment_image_v3(image)
            
            # Convert to RGB for model input
            rgb_image = cv2.cvtColor(processed, cv2.COLOR_GRAY2RGB)
            
            # Resize to model input size (224x224 for enhanced model)
            resized = cv2.resize(rgb_image, (224, 224))
            
            # Normalize and add batch dimension
            model_input = np.expand_dims(resized.astype(np.float32) / 255.0, axis=0)
            
            # Get prediction from v3 model (has dual heads)
            prediction = self.cnn_model.predict(model_input, verbose=0)
            
            # Handle v3 model output (digit head + segments head)
            if isinstance(prediction, list) and len(prediction) == 2:
                # V3 model with dual heads
                digit_probs = prediction[0][0]  # digit classification head
                segment_probs = prediction[1][0]  # segment activation head
                
                # Get digit prediction
                predicted_digit = int(np.argmax(digit_probs))
                digit_confidence = float(np.max(digit_probs))
                
                # Analyze segment consistency for additional confidence
                segment_binary = (segment_probs > 0.5).astype(int)
                segment_confidence = np.mean(np.abs(segment_probs - 0.5) + 0.5)
                
                # Combined confidence using both heads
                combined_confidence = 0.7 * digit_confidence + 0.3 * segment_confidence
                
                return {
                    'method': 'CNN_v3',
                    'digit': predicted_digit,
                    'confidence': float(combined_confidence),
                    'digit_confidence': digit_confidence,
                    'segment_confidence': float(segment_confidence),
                    'is_confident': combined_confidence >= self.confidence_threshold,
                    'digit_probabilities': digit_probs.tolist(),
                    'segment_activations': segment_probs.tolist(),
                    'predicted_segments': segment_binary.tolist()
                }
            else:
                # V2 model or single head
                probabilities = prediction[0] if isinstance(prediction, list) else prediction[0]
                predicted_digit = int(np.argmax(probabilities))
                confidence = float(np.max(probabilities))
                
                return {
                    'method': 'CNN_v2',
                    'digit': predicted_digit,
                    'confidence': confidence,
                    'is_confident': confidence >= self.confidence_threshold,
                    'all_probabilities': probabilities.tolist()
                }
            
        except Exception as e:
            logger.error(f"CNN prediction failed: {e}")
            return {'error': str(e)}
    
    def traditional_ocr_predict(self, image: np.ndarray) -> Dict:
        """
        Predict using traditional OCR methods
        
        Args:
            image: Input image
            
        Returns:
            Prediction result dictionary
        """
        if not self.tesseract_available:
            return {'error': 'Traditional OCR not available'}
        
        try:
            import pytesseract
            
            # Preprocess image
            processed = self.preprocess_seven_segment_image(image)
            
            # OCR configuration for digits only
            config = '--oem 3 --psm 10 -c tessedit_char_whitelist=0123456789'
            
            # Get text
            text = pytesseract.image_to_string(processed, config=config).strip()
            
            # Validate result
            if text.isdigit() and len(text) == 1:
                digit = int(text)
                # Simple confidence based on image quality
                confidence = 0.6  # Traditional OCR gets moderate confidence
                
                return {
                    'method': 'Traditional_OCR',
                    'digit': digit,
                    'confidence': confidence,
                    'is_confident': confidence >= self.confidence_threshold,
                    'raw_text': text
                }
            else:
                return {
                    'method': 'Traditional_OCR',
                    'error': f'Invalid OCR result: {text}'
                }
                
        except Exception as e:
            logger.error(f"Traditional OCR failed: {e}")
            return {'error': str(e)}
    
    def template_matching_predict(self, image: np.ndarray) -> Dict:
        """
        Basic template matching as last resort
        
        Args:
            image: Input image
            
        Returns:
            Prediction result dictionary
        """
        try:
            # Preprocess image
            processed = self.preprocess_seven_segment_image(image)
            
            # Simple pattern matching based on white pixel distribution
            # This is a very basic implementation
            h, w = processed.shape
            
            # Divide into 7 segments (approximate positions for seven-segment display)
            segments = {
                'top': processed[0:h//4, w//4:3*w//4],
                'top_right': processed[0:h//2, 3*w//4:w],
                'top_left': processed[0:h//2, 0:w//4],
                'middle': processed[h//3:2*h//3, w//4:3*w//4],
                'bottom_right': processed[h//2:h, 3*w//4:w],
                'bottom_left': processed[h//2:h, 0:w//4],
                'bottom': processed[3*h//4:h, w//4:3*w//4]
            }
            
            # Check which segments are "on" (have significant white pixels)
            segment_states = {}
            for name, segment in segments.items():
                white_ratio = np.sum(segment == 255) / segment.size
                segment_states[name] = white_ratio > 0.3  # Threshold for "on"
            
            # Pattern matching for digits 0-9
            patterns = {
                0: ['top', 'top_right', 'top_left', 'bottom_right', 'bottom_left', 'bottom'],
                1: ['top_right', 'bottom_right'],
                2: ['top', 'top_right', 'middle', 'bottom_left', 'bottom'],
                3: ['top', 'top_right', 'middle', 'bottom_right', 'bottom'],
                4: ['top_left', 'top_right', 'middle', 'bottom_right'],
                5: ['top', 'top_left', 'middle', 'bottom_right', 'bottom'],
                6: ['top', 'top_left', 'middle', 'bottom_left', 'bottom_right', 'bottom'],
                7: ['top', 'top_right', 'bottom_right'],
                8: ['top', 'top_right', 'top_left', 'middle', 'bottom_right', 'bottom_left', 'bottom'],
                9: ['top', 'top_right', 'top_left', 'middle', 'bottom_right', 'bottom']
            }
            
            # Find best match
            best_digit = None
            best_score = 0
            
            for digit, pattern in patterns.items():
                score = 0
                for segment in pattern:
                    if segment_states.get(segment, False):
                        score += 1
                
                # Penalize for extra segments
                for segment, state in segment_states.items():
                    if state and segment not in pattern:
                        score -= 0.5
                
                if score > best_score:
                    best_score = score
                    best_digit = digit
            
            if best_digit is not None and best_score > 0:
                confidence = min(0.5, best_score / 7)  # Low confidence for template matching
                return {
                    'method': 'Template_Matching',
                    'digit': best_digit,
                    'confidence': confidence,
                    'is_confident': False,  # Template matching is never highly confident
                    'segment_states': segment_states
                }
            else:
                return {
                    'method': 'Template_Matching',
                    'error': 'No pattern match found'
                }
                
        except Exception as e:
            logger.error(f"Template matching failed: {e}")
            return {'error': str(e)}
    
    def predict_digit(self, image: np.ndarray, methods: List[str] = None) -> Dict:
        """
        Predict digit using multiple methods with fallback
        
        Args:
            image: Input image containing seven-segment digit
            methods: List of methods to try ['cnn', 'traditional', 'template']
            
        Returns:
            Best prediction result
        """
        if methods is None:
            methods = ['cnn', 'traditional', 'template']
        
        results = []
        
        for method in methods:
            if method == 'cnn' and self.cnn_available:
                result = self.cnn_predict_digit(image)
                if 'digit' in result:
                    results.append(result)
                    
            elif method == 'traditional' and self.tesseract_available:
                result = self.traditional_ocr_predict(image)
                if 'digit' in result:
                    results.append(result)
                    
            elif method == 'template':
                result = self.template_matching_predict(image)
                if 'digit' in result:
                    results.append(result)
        
        # Select best result based on confidence
        if results:
            best_result = max(results, key=lambda x: x.get('confidence', 0))
            best_result['all_methods'] = results
            return best_result
        else:
            return {
                'error': 'All methods failed',
                'methods_tried': methods
            }
    
    def process_humidity_reading(self, image: np.ndarray) -> Dict:
        """
        Process humidity reading with validation
        
        Args:
            image: Image containing humidity reading
            
        Returns:
            Processed humidity result
        """
        result = self.predict_digit(image)
        
        if 'digit' in result:
            humidity = result['digit']
            
            # Validate humidity range (typically 0-100%)
            if 0 <= humidity <= 100:
                return {
                    'humidity': humidity,
                    'confidence': result.get('confidence', 0),
                    'method': result.get('method', 'unknown'),
                    'is_confident': result.get('is_confident', False),
                    'valid': True
                }
            else:
                return {
                    'humidity': humidity,
                    'confidence': result.get('confidence', 0),
                    'method': result.get('method', 'unknown'),
                    'is_confident': False,
                    'valid': False,
                    'error': f'Humidity {humidity}% out of valid range (0-100%)'
                }
        else:
            return {
                'humidity': None,
                'confidence': 0,
                'valid': False,
                'error': result.get('error', 'Recognition failed')
            }
    
    def process_temperature_reading(self, image: np.ndarray) -> Dict:
        """
        Process temperature reading with validation
        
        Args:
            image: Image containing temperature reading
            
        Returns:
            Processed temperature result
        """
        result = self.predict_digit(image)
        
        if 'digit' in result:
            temperature = result['digit']
            
            # Validate temperature range (typically -40 to 80°C for most sensors)
            if -40 <= temperature <= 80:
                return {
                    'temperature': temperature,
                    'confidence': result.get('confidence', 0),
                    'method': result.get('method', 'unknown'),
                    'is_confident': result.get('is_confident', False),
                    'valid': True
                }
            else:
                return {
                    'temperature': temperature,
                    'confidence': result.get('confidence', 0),
                    'method': result.get('method', 'unknown'),
                    'is_confident': False,
                    'valid': False,
                    'error': f'Temperature {temperature}°C out of valid range (-40 to 80°C)'
                }
        else:
            return {
                'temperature': None,
                'confidence': 0,
                'valid': False,
                'error': result.get('error', 'Recognition failed')
            }
    
    def get_status(self) -> Dict:
        """
        Get status of available OCR methods
        
        Returns:
            Status dictionary
        """
        return {
            'cnn_available': self.cnn_available,
            'traditional_ocr_available': self.tesseract_available,
            'template_matching_available': True,
            'confidence_threshold': self.confidence_threshold,
            'preferred_method': 'CNN' if self.cnn_available else 'Traditional' if self.tesseract_available else 'Template'
        }


class HumidityAppOCRManager:
    """
    High-level OCR manager for Humidity App
    """
    
    def __init__(self):
        """
        Initialize OCR manager with auto-detection of available models
        """
        self.ocr = None
        self.model_paths = [
            "seven_segment_2k_enhanced_model.keras",  # NEW: 2K dataset model (best)
            "seven_segment_2k_final.keras",           # NEW: 2K dataset final
            "seven_segment_enhanced_model.keras",     # Original enhanced model  
            "seven_segment_enhanced_final.keras",
            "seven_segment_cnn_final.keras",
            "seven_segment_best_model.keras"
        ]
        
        # Try to find and load best available model
        for model_path in self.model_paths:
            if os.path.exists(model_path):
                try:
                    self.ocr = ProductionOCR(model_path)
                    logger.info(f"✓ Loaded OCR with model: {model_path}")
                    break
                except Exception as e:
                    logger.warning(f"⚠ Failed to load model {model_path}: {e}")
        
        # Fallback to no-model OCR
        if self.ocr is None:
            self.ocr = ProductionOCR()
            logger.info("✓ Initialized OCR without CNN model (fallback mode)")
    
    def process_display_reading(self, image: np.ndarray, reading_type: str = 'auto') -> Dict:
        """
        Process reading from display
        
        Args:
            image: Image containing display reading
            reading_type: Type of reading ('humidity', 'temperature', 'auto')
            
        Returns:
            Processed reading result
        """
        if reading_type == 'humidity':
            return self.ocr.process_humidity_reading(image)
        elif reading_type == 'temperature':
            return self.ocr.process_temperature_reading(image)
        else:
            # Auto-detect based on value range
            digit_result = self.ocr.predict_digit(image)
            
            if 'digit' in digit_result:
                value = digit_result['digit']
                
                # Heuristic: values 0-50 more likely humidity, 51-100 could be either
                if 0 <= value <= 100:
                    return {
                        'value': value,
                        'confidence': digit_result.get('confidence', 0),
                        'method': digit_result.get('method', 'unknown'),
                        'is_confident': digit_result.get('is_confident', False),
                        'suggested_type': 'humidity' if value <= 50 else 'either',
                        'valid': True
                    }
                else:
                    return {
                        'value': value,
                        'confidence': digit_result.get('confidence', 0),
                        'method': digit_result.get('method', 'unknown'),
                        'is_confident': False,
                        'valid': False,
                        'error': f'Value {value} out of expected range'
                    }
            else:
                return {
                    'value': None,
                    'confidence': 0,
                    'valid': False,
                    'error': digit_result.get('error', 'Recognition failed')
                }
    
    def get_system_info(self) -> Dict:
        """
        Get system information
        
        Returns:
            System info dictionary
        """
        return {
            'ocr_status': self.ocr.get_status() if self.ocr else {'error': 'OCR not initialized'},
            'available_models': [p for p in self.model_paths if os.path.exists(p)],
            'python_version': sys.version,
            'opencv_version': cv2.__version__
        }


# Example usage and testing
if __name__ == "__main__":
    # Initialize OCR manager
    ocr_manager = HumidityAppOCRManager()
    
    print("=== Humidity App OCR System ===")
    print(json.dumps(ocr_manager.get_system_info(), indent=2))
    
    # Test with sample images if available
    sample_dir = "seven_segment_dataset/images"
    if os.path.exists(sample_dir):
        sample_files = [f for f in os.listdir(sample_dir) if f.endswith('.png')][:5]
        
        print(f"\n=== Testing with {len(sample_files)} sample images ===")
        
        for filename in sample_files:
            true_digit = int(filename.split('_')[2])
            img_path = os.path.join(sample_dir, filename)
            
            # Load image
            img = cv2.imread(img_path)
            
            # Test reading
            result = ocr_manager.process_display_reading(img, 'auto')
            
            predicted = result.get('value')
            confidence = result.get('confidence', 0)
            method = result.get('method', 'unknown')
            
            status = "✓" if predicted == true_digit else "✗"
            print(f"{status} {filename}: True={true_digit}, Pred={predicted}, Conf={confidence:.2f}, Method={method}")
    
    print("\n✓ OCR system ready for Humidity App integration")
