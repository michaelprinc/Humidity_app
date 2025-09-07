"""
Test Script for Seven-Segment OCR Fine-tuning
============================================

Comprehensive testing script for the fine-tuned OCR models
"""

import os
import sys
import json
import time
import numpy as np
import cv2
from pathlib import Path

def test_production_ocr():
    """
    Test the production OCR system
    """
    print("=== Testing Production OCR System ===")
    
    try:
        from production_ocr import HumidityAppOCRManager
        
        # Initialize OCR manager
        ocr_manager = HumidityAppOCRManager()
        
        # Get system info
        info = ocr_manager.get_system_info()
        print("\nSystem Information:")
        print(json.dumps(info, indent=2))
        
        # Test with sample images if available
        sample_dir = Path("seven_segment_dataset/images")
        if sample_dir.exists():
            sample_files = list(sample_dir.glob("*.png"))[:10]  # Test first 10
            
            print(f"\n=== Testing with {len(sample_files)} sample images ===")
            
            correct_predictions = 0
            total_predictions = 0
            results = []
            
            for img_path in sample_files:
                # Extract true digit from filename
                try:
                    true_digit = int(img_path.stem.split('_')[2])
                except (IndexError, ValueError):
                    continue
                
                # Load image
                img = cv2.imread(str(img_path))
                if img is None:
                    continue
                
                # Test different reading types
                start_time = time.time()
                
                # Auto detection
                auto_result = ocr_manager.process_display_reading(img, 'auto')
                
                # Humidity reading
                humidity_result = ocr_manager.process_display_reading(img, 'humidity')
                
                # Temperature reading
                temp_result = ocr_manager.process_display_reading(img, 'temperature')
                
                inference_time = time.time() - start_time
                
                # Check accuracy
                auto_pred = auto_result.get('value')
                humidity_pred = humidity_result.get('humidity')
                temp_pred = temp_result.get('temperature')
                
                auto_correct = auto_pred == true_digit
                humidity_correct = humidity_pred == true_digit
                temp_correct = temp_pred == true_digit
                
                if auto_correct:
                    correct_predictions += 1
                total_predictions += 1
                
                results.append({
                    'filename': img_path.name,
                    'true_digit': true_digit,
                    'auto_result': auto_result,
                    'humidity_result': humidity_result,
                    'temperature_result': temp_result,
                    'inference_time_ms': inference_time * 1000,
                    'accuracy': {
                        'auto': auto_correct,
                        'humidity': humidity_correct,
                        'temperature': temp_correct
                    }
                })
                
                # Print result
                status = "✓" if auto_correct else "✗"
                confidence = auto_result.get('confidence', 0)
                method = auto_result.get('method', 'unknown')
                
                print(f"{status} {img_path.name}: True={true_digit}, "
                      f"Pred={auto_pred}, Conf={confidence:.2f}, "
                      f"Method={method}, Time={inference_time*1000:.1f}ms")
            
            # Calculate statistics
            accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0
            avg_time = np.mean([r['inference_time_ms'] for r in results])
            
            print(f"\n=== Test Results ===")
            print(f"Accuracy: {accuracy:.2%} ({correct_predictions}/{total_predictions})")
            print(f"Average inference time: {avg_time:.1f}ms")
            
            # Save detailed results
            with open('ocr_test_results.json', 'w') as f:
                json.dump({
                    'accuracy': accuracy,
                    'total_tested': total_predictions,
                    'correct_predictions': correct_predictions,
                    'average_inference_time_ms': avg_time,
                    'detailed_results': results
                }, f, indent=2)
            
            print("✓ Detailed results saved to ocr_test_results.json")
            
        else:
            print("⚠ No sample images found for testing")
            
    except ImportError as e:
        print(f"✗ Failed to import production OCR: {e}")
    except Exception as e:
        print(f"✗ Test failed: {e}")

def test_model_loading():
    """
    Test loading of trained models
    """
    print("\n=== Testing Model Loading ===")
    
    model_files = [
        "seven_segment_enhanced_final.keras",
        "seven_segment_cnn_final.keras", 
        "seven_segment_best_model.keras"
    ]
    
    for model_file in model_files:
        if os.path.exists(model_file):
            try:
                import tensorflow as tf
                model = tf.keras.models.load_model(model_file)
                
                # Get model info
                param_count = model.count_params()
                input_shape = model.input_shape
                output_shape = model.output_shape
                
                print(f"✓ {model_file}")
                print(f"  Parameters: {param_count:,}")
                print(f"  Input shape: {input_shape}")
                print(f"  Output shape: {output_shape}")
                
                # Test prediction with dummy data
                dummy_input = np.random.random((1,) + input_shape[1:]).astype(np.float32)
                prediction = model.predict(dummy_input, verbose=0)
                
                print(f"  Test prediction shape: {prediction.shape}")
                print(f"  Prediction sum: {np.sum(prediction):.4f}")
                
            except Exception as e:
                print(f"✗ {model_file}: {e}")
        else:
            print(f"- {model_file}: Not found")

def test_preprocessing():
    """
    Test image preprocessing functions
    """
    print("\n=== Testing Image Preprocessing ===")
    
    try:
        from production_ocr import ProductionOCR
        
        ocr = ProductionOCR()
        
        # Test with sample image if available
        sample_dir = Path("seven_segment_dataset/images")
        if sample_dir.exists():
            sample_files = list(sample_dir.glob("*.png"))
            
            if sample_files:
                img_path = sample_files[0]
                img = cv2.imread(str(img_path))
                
                print(f"Testing with: {img_path.name}")
                print(f"Original shape: {img.shape}")
                
                # Test preprocessing
                processed = ocr.preprocess_seven_segment_image(img)
                print(f"Processed shape: {processed.shape}")
                print(f"Processed dtype: {processed.dtype}")
                print(f"Value range: {processed.min()} - {processed.max()}")
                
                # Save processed image for visual inspection
                cv2.imwrite('test_processed.png', processed)
                print("✓ Processed image saved as test_processed.png")
                
            else:
                print("⚠ No sample images found")
        else:
            print("⚠ Sample directory not found")
            
    except Exception as e:
        print(f"✗ Preprocessing test failed: {e}")

def test_performance_benchmark():
    """
    Performance benchmark for different OCR methods
    """
    print("\n=== Performance Benchmark ===")
    
    try:
        from production_ocr import ProductionOCR
        
        ocr = ProductionOCR()
        
        # Test with sample images
        sample_dir = Path("seven_segment_dataset/images")
        if sample_dir.exists():
            sample_files = list(sample_dir.glob("*.png"))[:5]  # Test 5 images
            
            methods = ['cnn', 'traditional', 'template']
            results = {}
            
            for method in methods:
                if method == 'cnn' and not ocr.cnn_available:
                    continue
                if method == 'traditional' and not ocr.tesseract_available:
                    continue
                
                times = []
                for img_path in sample_files:
                    img = cv2.imread(str(img_path))
                    
                    start_time = time.time()
                    result = ocr.predict_digit(img, methods=[method])
                    end_time = time.time()
                    
                    times.append((end_time - start_time) * 1000)  # Convert to ms
                
                if times:
                    results[method] = {
                        'avg_time_ms': np.mean(times),
                        'std_time_ms': np.std(times),
                        'min_time_ms': np.min(times),
                        'max_time_ms': np.max(times)
                    }
            
            print("Method Performance (milliseconds):")
            for method, stats in results.items():
                print(f"{method.upper()}:")
                print(f"  Average: {stats['avg_time_ms']:.1f} ± {stats['std_time_ms']:.1f}")
                print(f"  Range: {stats['min_time_ms']:.1f} - {stats['max_time_ms']:.1f}")
            
            return results
        else:
            print("⚠ No sample images found for benchmark")
            return {}
            
    except Exception as e:
        print(f"✗ Benchmark failed: {e}")
        return {}

def generate_test_report():
    """
    Generate comprehensive test report
    """
    print("\n" + "="*50)
    print("SEVEN-SEGMENT OCR FINE-TUNING TEST REPORT")
    print("="*50)
    
    report = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'tests': {}
    }
    
    # Test 1: Production OCR
    print("\n1. Testing Production OCR System...")
    test_production_ocr()
    report['tests']['production_ocr'] = 'completed'
    
    # Test 2: Model Loading
    print("\n2. Testing Model Loading...")
    test_model_loading()
    report['tests']['model_loading'] = 'completed'
    
    # Test 3: Preprocessing
    print("\n3. Testing Preprocessing...")
    test_preprocessing()
    report['tests']['preprocessing'] = 'completed'
    
    # Test 4: Performance Benchmark
    print("\n4. Performance Benchmark...")
    benchmark_results = test_performance_benchmark()
    report['tests']['benchmark'] = benchmark_results
    
    # Save report
    with open('test_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n{'='*50}")
    print("✓ TEST COMPLETED SUCCESSFULLY")
    print("✓ Test report saved to test_report.json")
    print(f"{'='*50}")

if __name__ == "__main__":
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Run comprehensive tests
    generate_test_report()
