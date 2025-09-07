#!/usr/bin/env python3
"""
OCR Model Comparison Script
===========================

This script compares the performance of different seven-segment OCR models:
- Original 100-image model
- Enhanced 2K-image model
- Production system integration

Purpose: Validate improvements and prepare for production deployment
"""

import os
import sys
import json
import numpy as np
import cv2
import time
from pathlib import Path
import tensorflow as tf
from tqdm import tqdm
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelComparator:
    """
    Compare performance of different OCR models
    """
    
    def __init__(self):
        self.models = {}
        self.test_images = []
        self.test_labels = []
        
    def load_models(self):
        """Load all available models for comparison"""
        print("Loading available models...")
        
        model_files = [
            ("original_100", "seven_segment_enhanced_model.keras"),
            ("enhanced_2k", "seven_segment_2k_enhanced_model.keras"),
            ("enhanced_2k_final", "seven_segment_2k_final.keras"),
            ("baseline", "seven_segment_best_model.keras")
        ]
        
        for name, filename in model_files:
            if os.path.exists(filename):
                try:
                    model = tf.keras.models.load_model(filename)
                    self.models[name] = {
                        'model': model,
                        'filename': filename,
                        'input_shape': model.input_shape[1:],
                        'params': model.count_params()
                    }
                    print(f"✓ Loaded {name}: {filename}")
                except Exception as e:
                    print(f"✗ Failed to load {name}: {e}")
            else:
                print(f"✗ Model not found: {filename}")
        
        if not self.models:
            raise ValueError("No models found for comparison!")
        
        return len(self.models)
    
    def load_test_dataset(self, test_path: str = "seven_segment_dataset_2k/images", num_samples: int = 100):
        """
        Load test dataset for comparison
        
        Args:
            test_path: Path to test images
            num_samples: Number of samples to test (for speed)
        """
        print(f"Loading test dataset from {test_path}...")
        
        dataset_dir = Path(test_path)
        if not dataset_dir.exists():
            # Fallback to original dataset
            dataset_dir = Path("seven_segment_dataset/images")
            if not dataset_dir.exists():
                raise ValueError("No test dataset found!")
        
        # Load sample images from each digit
        images = []
        labels = []
        
        for digit in range(10):
            digit_files = list(dataset_dir.glob(f"seven_segment_{digit}_*.png"))
            
            # Take sample from each digit
            sample_count = min(num_samples // 10, len(digit_files))
            selected_files = digit_files[:sample_count]
            
            for img_path in selected_files:
                try:
                    img = cv2.imread(str(img_path))
                    if img is not None:
                        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                        images.append(img)
                        labels.append(digit)
                except Exception as e:
                    logger.warning(f"Failed to load {img_path}: {e}")
        
        self.test_images = images
        self.test_labels = labels
        
        print(f"Loaded {len(images)} test images")
        return len(images)
    
    def preprocess_image(self, image: np.ndarray, target_shape: tuple) -> np.ndarray:
        """
        Preprocess image for model input
        
        Args:
            image: Input image
            target_shape: Target shape (height, width, channels)
            
        Returns:
            Preprocessed image
        """
        # Resize to target shape
        resized = cv2.resize(image, (target_shape[1], target_shape[0]))
        
        # Normalize to [0, 1]
        normalized = resized.astype(np.float32) / 255.0
        
        return normalized
    
    def test_model(self, model_name: str, model_info: dict) -> dict:
        """
        Test a single model on the test dataset
        
        Args:
            model_name: Name of the model
            model_info: Model information dictionary
            
        Returns:
            Test results dictionary
        """
        print(f"\nTesting {model_name}...")
        
        model = model_info['model']
        input_shape = model_info['input_shape']
        
        predictions = []
        confidences = []
        inference_times = []
        
        for i, (image, true_label) in enumerate(tqdm(zip(self.test_images, self.test_labels), 
                                                   total=len(self.test_images),
                                                   desc=f"Testing {model_name}")):
            try:
                # Preprocess image
                processed_image = self.preprocess_image(image, input_shape)
                
                # Add batch dimension
                batch_input = np.expand_dims(processed_image, axis=0)
                
                # Measure inference time
                start_time = time.time()
                prediction = model.predict(batch_input, verbose=0)
                inference_time = (time.time() - start_time) * 1000  # ms
                
                # Get results
                predicted_digit = int(np.argmax(prediction[0]))
                confidence = float(np.max(prediction[0]))
                
                predictions.append(predicted_digit)
                confidences.append(confidence)
                inference_times.append(inference_time)
                
            except Exception as e:
                logger.error(f"Error testing image {i} with {model_name}: {e}")
                predictions.append(-1)  # Error indicator
                confidences.append(0.0)
                inference_times.append(0.0)
        
        # Calculate metrics
        correct_predictions = sum(1 for pred, true in zip(predictions, self.test_labels) if pred == true)
        accuracy = correct_predictions / len(self.test_labels)
        
        # Per-digit accuracy
        digit_accuracy = {}
        for digit in range(10):
            digit_mask = [i for i, label in enumerate(self.test_labels) if label == digit]
            if digit_mask:
                digit_correct = sum(1 for i in digit_mask if predictions[i] == digit)
                digit_accuracy[f'digit_{digit}'] = digit_correct / len(digit_mask)
        
        results = {
            'model_name': model_name,
            'filename': model_info['filename'],
            'total_params': model_info['params'],
            'input_shape': input_shape,
            'test_samples': len(self.test_labels),
            'accuracy': accuracy,
            'avg_confidence': np.mean(confidences),
            'avg_inference_time_ms': np.mean(inference_times),
            'digit_accuracy': digit_accuracy,
            'predictions': predictions,
            'confidences': confidences,
            'inference_times': inference_times
        }
        
        print(f"  Accuracy: {accuracy:.1%}")
        print(f"  Avg Confidence: {np.mean(confidences):.3f}")
        print(f"  Avg Inference Time: {np.mean(inference_times):.1f}ms")
        
        return results
    
    def compare_models(self) -> dict:
        """
        Compare all loaded models
        
        Returns:
            Comparison results dictionary
        """
        print("\n" + "="*60)
        print("MODEL COMPARISON RESULTS")
        print("="*60)
        
        all_results = []
        
        for model_name, model_info in self.models.items():
            results = self.test_model(model_name, model_info)
            all_results.append(results)
        
        # Create comparison summary
        comparison = {
            'test_dataset_size': len(self.test_labels),
            'models_tested': len(all_results),
            'results': all_results,
            'summary': self.create_summary(all_results)
        }
        
        self.print_comparison_table(all_results)
        
        return comparison
    
    def create_summary(self, results: list) -> dict:
        """Create comparison summary"""
        if not results:
            return {}
        
        # Find best performing model
        best_accuracy = max(r['accuracy'] for r in results)
        best_model = next(r for r in results if r['accuracy'] == best_accuracy)
        
        # Find fastest model
        fastest_time = min(r['avg_inference_time_ms'] for r in results)
        fastest_model = next(r for r in results if r['avg_inference_time_ms'] == fastest_time)
        
        return {
            'best_accuracy': {
                'model': best_model['model_name'],
                'accuracy': best_accuracy,
                'confidence': best_model['avg_confidence']
            },
            'fastest_inference': {
                'model': fastest_model['model_name'],
                'time_ms': fastest_time
            },
            'accuracy_improvement': {
                'best_vs_worst': best_accuracy - min(r['accuracy'] for r in results),
                'improvement_factor': best_accuracy / min(r['accuracy'] for r in results)
            }
        }
    
    def print_comparison_table(self, results: list):
        """Print formatted comparison table"""
        print("\nModel Performance Comparison:")
        print("-" * 80)
        print(f"{'Model':<20} {'Accuracy':<10} {'Confidence':<12} {'Time (ms)':<10} {'Params':<10}")
        print("-" * 80)
        
        for result in sorted(results, key=lambda x: x['accuracy'], reverse=True):
            print(f"{result['model_name']:<20} "
                  f"{result['accuracy']:<10.1%} "
                  f"{result['avg_confidence']:<12.3f} "
                  f"{result['avg_inference_time_ms']:<10.1f} "
                  f"{result['total_params']:<10,}")
        
        print("-" * 80)
    
    def save_results(self, comparison: dict, filename: str = "model_comparison_results.json"):
        """Save comparison results to file"""
        with open(filename, 'w') as f:
            json.dump(comparison, f, indent=2, default=str)
        print(f"\nComparison results saved to: {filename}")


def main():
    """Main comparison function"""
    print("OCR Model Performance Comparison")
    print("="*40)
    
    # Initialize comparator
    comparator = ModelComparator()
    
    # Load models
    try:
        num_models = comparator.load_models()
        print(f"\nLoaded {num_models} models for comparison")
    except Exception as e:
        print(f"Error loading models: {e}")
        return
    
    # Load test dataset
    try:
        num_samples = comparator.load_test_dataset(num_samples=50)  # Quick test
        print(f"Loaded {num_samples} test samples")
    except Exception as e:
        print(f"Error loading test dataset: {e}")
        return
    
    # Run comparison
    comparison = comparator.compare_models()
    
    # Save results
    comparator.save_results(comparison)
    
    # Print final summary
    print("\n" + "="*60)
    print("COMPARISON SUMMARY")
    print("="*60)
    
    summary = comparison['summary']
    if summary:
        print(f"🏆 Best Accuracy: {summary['best_accuracy']['model']} "
              f"({summary['best_accuracy']['accuracy']:.1%})")
        print(f"⚡ Fastest Inference: {summary['fastest_inference']['model']} "
              f"({summary['fastest_inference']['time_ms']:.1f}ms)")
        print(f"📈 Improvement: {summary['accuracy_improvement']['improvement_factor']:.1f}x better")


if __name__ == "__main__":
    main()
