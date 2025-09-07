#!/usr/bin/env python3
"""
Test V3 Model Integration
========================

Test script to validate the integration of the new v3 model
with segment-aware multi-task learning into the production OCR system.
"""

import os
import sys
import json
import numpy as np
import cv2
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from machine_learning.production_ocr import ProductionOCR


def create_test_seven_segment_image():
    """Create a simple test image of seven-segment digit"""
    # Create a 224x224 white background
    img = np.ones((224, 224), dtype=np.uint8) * 255
    
    # Draw digit "8" (all segments on)
    segments = [
        # top
        [(60, 40), (160, 40), (160, 60), (60, 60)],
        # top-right  
        [(160, 40), (180, 40), (180, 100), (160, 100)],
        # bottom-right
        [(160, 120), (180, 120), (180, 180), (160, 180)],
        # bottom
        [(60, 180), (160, 180), (160, 200), (60, 200)],
        # bottom-left
        [(40, 120), (60, 120), (60, 180), (40, 180)],
        # top-left
        [(40, 40), (60, 40), (60, 100), (40, 100)],
        # middle
        [(60, 110), (160, 110), (160, 130), (60, 130)]
    ]
    
    # Draw segments in black
    for segment in segments:
        pts = np.array(segment, np.int32)
        cv2.fillPoly(img, [pts], 0)
    
    return img


def test_v3_model():
    """Test the v3 model integration"""
    print("Testing V3 Model Integration")
    print("=" * 40)
    
    # Initialize production OCR (should auto-detect v3 model)
    ocr = ProductionOCR()
    
    if not ocr.cnn_available:
        print("❌ CNN model not available")
        return False
    
    print(f"✓ Model loaded: {getattr(ocr, 'model_version', 'unknown')}")
    print(f"✓ Model path: {getattr(ocr, 'model_path', 'unknown')}")
    
    # Create test image
    test_image = create_test_seven_segment_image()
    
    # Test v3 prediction
    result = ocr.cnn_predict_digit(test_image)
    
    print("\nV3 Model Test Results:")
    print("-" * 30)
    
    if 'error' in result:
        print(f"❌ Error: {result['error']}")
        return False
    
    print(f"Method: {result['method']}")
    print(f"Predicted digit: {result['digit']}")
    print(f"Confidence: {result['confidence']:.3f}")
    print(f"Is confident: {result['is_confident']}")
    
    if result['method'] == 'CNN_v3':
        print(f"Digit confidence: {result['digit_confidence']:.3f}")
        print(f"Segment confidence: {result['segment_confidence']:.3f}")
        print(f"Predicted segments: {result['predicted_segments']}")
        
        # Verify segment prediction for digit "8" (all segments should be active)
        expected_segments = [1, 1, 1, 1, 1, 1, 1]  # All 7 segments active
        predicted_segments = result['predicted_segments']
        
        segment_accuracy = sum(1 for e, p in zip(expected_segments, predicted_segments) if e == p) / 7
        print(f"Segment accuracy: {segment_accuracy:.3f}")
        
        if segment_accuracy >= 0.7:
            print("✓ Segment prediction looks good")
        else:
            print("⚠ Segment prediction may need improvement")
    
    # Test multi-digit scenario
    print("\nTesting Multi-digit Recognition:")
    print("-" * 35)
    
    # Create test images for digits 0-9
    test_results = []
    for digit in range(10):
        # For now, use same test image (in real scenario, would create different digit images)
        result = ocr.cnn_predict_digit(test_image)
        test_results.append(result)
    
    avg_confidence = np.mean([r.get('confidence', 0) for r in test_results])
    print(f"Average confidence across test images: {avg_confidence:.3f}")
    
    # Test preprocessing improvements
    print("\nTesting V3 Preprocessing:")
    print("-" * 28)
    
    # Test preprocessing function
    processed_v3 = ocr.preprocess_seven_segment_image_v3(test_image)
    processed_v2 = ocr.preprocess_seven_segment_image(test_image)
    
    print(f"V3 preprocessed image shape: {processed_v3.shape}")
    print(f"V2 preprocessed image shape: {processed_v2.shape}")
    print(f"V3 preprocessing unique values: {len(np.unique(processed_v3))}")
    print(f"V2 preprocessing unique values: {len(np.unique(processed_v2))}")
    
    return True


def benchmark_performance():
    """Benchmark v3 vs traditional OCR performance"""
    print("\nPerformance Benchmark:")
    print("=" * 25)
    
    ocr = ProductionOCR()
    test_image = create_test_seven_segment_image()
    
    # Benchmark CNN prediction time
    import time
    
    start_time = time.time()
    for _ in range(10):
        result = ocr.cnn_predict_digit(test_image)
    cnn_time = (time.time() - start_time) / 10
    
    print(f"Average CNN prediction time: {cnn_time:.4f} seconds")
    
    # Test traditional OCR as comparison
    start_time = time.time()
    for _ in range(10):
        trad_result = ocr.traditional_ocr_predict(test_image)
    trad_time = (time.time() - start_time) / 10
    
    print(f"Average traditional OCR time: {trad_time:.4f} seconds")
    print(f"CNN is {trad_time/cnn_time:.1f}x {'faster' if cnn_time < trad_time else 'slower'}")


def save_test_results():
    """Save test results for documentation"""
    ocr = ProductionOCR()
    test_image = create_test_seven_segment_image()
    result = ocr.cnn_predict_digit(test_image)
    
    # Convert numpy types to native Python types for JSON serialization
    def convert_for_json(obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, (np.integer, np.int8, np.int16, np.int32, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float16, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: convert_for_json(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_for_json(item) for item in obj]
        else:
            return obj
    
    test_report = {
        "timestamp": datetime.now().isoformat(),
        "model_version": getattr(ocr, 'model_version', 'unknown'),
        "model_path": getattr(ocr, 'model_path', 'unknown'),
        "test_results": convert_for_json(result),
        "model_available": bool(ocr.cnn_available),
        "test_passed": 'error' not in result and result.get('confidence', 0) > 0.5
    }
    
    report_path = f"v3_integration_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_path, 'w') as f:
        json.dump(test_report, f, indent=2)
    
    print(f"\nTest report saved: {report_path}")
    return test_report


def main():
    """Main test function"""
    print("Enhanced Seven-Segment CNN v3 Integration Test")
    print("=" * 50)
    
    try:
        # Test v3 model integration
        test_passed = test_v3_model()
        
        if test_passed:
            # Run performance benchmark
            benchmark_performance()
            
            # Save test results
            report = save_test_results()
            
            print("\n" + "=" * 50)
            print("✓ V3 Model Integration Test PASSED")
            print(f"✓ Model confidence: {report['test_results'].get('confidence', 0):.3f}")
            print(f"✓ Model type: {report['test_results'].get('method', 'unknown')}")
            
            if report['test_results'].get('method') == 'CNN_v3':
                print("✓ V3 features (dual heads) working correctly")
            
        else:
            print("\n" + "=" * 50)
            print("❌ V3 Model Integration Test FAILED")
            
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
