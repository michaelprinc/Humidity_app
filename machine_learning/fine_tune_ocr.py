"""
Fine-tuning Script for Seven-Segment OCR Model
==============================================

Execute fine-tuning process for seven-segment digit recognition
using the generated dataset in seven_segment_dataset/images.
"""

import os
import sys
import json
import time
from datetime import datetime
import tensorflow as tf

# Add current directory to path for imports
sys.path.append(os.path.dirname(__file__))

from seven_segment_cnn_model import SevenSegmentCNN
from ocr_integration import HumidityAppOCRIntegration

def check_tensorflow_gpu():
    """
    Check TensorFlow GPU configuration
    """
    print("TensorFlow Configuration:")
    print(f"  Version: {tf.__version__}")
    print(f"  GPU Available: {tf.config.list_physical_devices('GPU')}")
    
    # Configure GPU memory growth if available
    gpus = tf.config.experimental.list_physical_devices('GPU')
    if gpus:
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            print(f"  GPU memory growth enabled for {len(gpus)} GPU(s)")
        except RuntimeError as e:
            print(f"  GPU configuration error: {e}")
    else:
        print("  Running on CPU")

def verify_dataset(dataset_path):
    """
    Verify dataset structure and content
    """
    print(f"\nVerifying dataset at: {dataset_path}")
    
    images_dir = os.path.join(dataset_path, "images")
    annotations_dir = os.path.join(dataset_path, "annotations")
    summary_file = os.path.join(dataset_path, "dataset_summary.json")
    
    # Check directories
    if not os.path.exists(images_dir):
        raise FileNotFoundError(f"Images directory not found: {images_dir}")
    
    if not os.path.exists(summary_file):
        raise FileNotFoundError(f"Dataset summary not found: {summary_file}")
    
    # Load and verify summary
    with open(summary_file, 'r', encoding='utf-8') as f:
        summary = json.load(f)
    
    print(f"  Total samples: {summary.get('total_samples', 'Unknown')}")
    print(f"  Samples per digit: {summary.get('samples_per_digit', 'Unknown')}")
    print(f"  Image dimensions: {summary.get('image_dimensions', 'Unknown')}")
    print(f"  Generation date: {summary.get('generation_date', 'Unknown')}")
    
    # Count actual files
    image_files = [f for f in os.listdir(images_dir) if f.endswith('.png')]
    print(f"  Actual image files: {len(image_files)}")
    
    # Verify digit distribution
    digit_counts = {}
    for filename in image_files:
        if filename.startswith('seven_segment_'):
            try:
                digit = int(filename.split('_')[2])
                digit_counts[digit] = digit_counts.get(digit, 0) + 1
            except (IndexError, ValueError):
                continue
    
    print(f"  Digit distribution: {dict(sorted(digit_counts.items()))}")
    
    return len(image_files)

def main():
    """
    Main fine-tuning execution
    """
    print("Seven-Segment OCR Fine-tuning")
    print("=" * 50)
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check TensorFlow configuration
    check_tensorflow_gpu()
    
    # Dataset path
    dataset_path = os.path.join(os.path.dirname(__file__), "seven_segment_dataset")
    
    # Verify dataset
    try:
        num_images = verify_dataset(dataset_path)
        if num_images == 0:
            raise ValueError("No images found in dataset")
    except Exception as e:
        print(f"❌ Dataset verification failed: {e}")
        return False
    
    # Initialize model
    print(f"\n🔧 Initializing Seven-Segment CNN Model...")
    model = SevenSegmentCNN(input_shape=(300, 200, 3), num_classes=10)
    
    # Build and compile model
    model.build_model()
    model.compile_model(learning_rate=0.001)
    
    print(f"✓ Model initialized with {model.model.count_params():,} parameters")
    
    # Load dataset
    print(f"\n📊 Loading dataset...")
    try:
        train_data, val_data, test_data = model.load_dataset(
            dataset_path, 
            validation_split=0.2, 
            test_split=0.1
        )
        print("✓ Dataset loaded successfully")
    except Exception as e:
        print(f"❌ Dataset loading failed: {e}")
        return False
    
    # Training configuration
    training_config = {
        'epochs': 50,
        'batch_size': 16,
        'initial_lr': 0.001
    }
    
    print(f"\n🚀 Starting training with configuration:")
    for key, value in training_config.items():
        print(f"  {key}: {value}")
    
    # Start training
    start_time = time.time()
    
    try:
        history = model.train(
            train_data, 
            val_data, 
            epochs=training_config['epochs'],
            batch_size=training_config['batch_size']
        )
        
        training_time = time.time() - start_time
        print(f"\n✓ Training completed in {training_time:.1f} seconds")
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        return False
    
    # Plot training history
    print(f"\n📈 Generating training plots...")
    try:
        model.plot_training_history()
        print("✓ Training plots saved")
    except Exception as e:
        print(f"⚠ Plot generation failed: {e}")
    
    # Evaluate model
    print(f"\n📊 Evaluating model on test set...")
    try:
        results = model.evaluate_model(test_data)
        test_accuracy = results['accuracy']
        print(f"✓ Test accuracy: {test_accuracy:.4f}")
        
        # Check if accuracy is acceptable
        if test_accuracy < 0.8:
            print(f"⚠ Warning: Test accuracy {test_accuracy:.4f} is below 80%")
        elif test_accuracy > 0.95:
            print(f"🎉 Excellent: Test accuracy {test_accuracy:.4f} is above 95%")
        else:
            print(f"✓ Good: Test accuracy {test_accuracy:.4f} is acceptable")
            
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
        return False
    
    # Save model
    model_filename = "seven_segment_cnn_final.h5"
    print(f"\n💾 Saving model as {model_filename}...")
    try:
        model.save_model(model_filename)
        print("✓ Model saved successfully")
    except Exception as e:
        print(f"❌ Model saving failed: {e}")
        return False
    
    # Create detailed results report
    results_report = {
        'timestamp': datetime.now().isoformat(),
        'dataset': {
            'path': dataset_path,
            'total_images': num_images,
            'train_samples': len(train_data[0]),
            'val_samples': len(val_data[0]),
            'test_samples': len(test_data[0])
        },
        'model': {
            'architecture': 'Custom CNN for Seven-Segment Digits',
            'input_shape': model.input_shape,
            'total_parameters': int(model.model.count_params()),
            'trainable_parameters': int(sum([tf.keras.backend.count_params(w) 
                                            for w in model.model.trainable_weights]))
        },
        'training': {
            'epochs_completed': len(history.history['loss']),
            'batch_size': training_config['batch_size'],
            'training_time_seconds': training_time,
            'final_train_accuracy': float(history.history['accuracy'][-1]),
            'final_val_accuracy': float(history.history['val_accuracy'][-1]),
            'best_val_accuracy': float(max(history.history['val_accuracy']))
        },
        'evaluation': {
            'test_accuracy': float(test_accuracy),
            'per_digit_accuracy': results['per_digit_accuracy'].tolist(),
            'confusion_matrix': results['confusion_matrix'].tolist()
        },
        'files_created': [
            model_filename,
            'training_history.png',
            'confusion_matrix.png',
            'training_results.json'
        ]
    }
    
    # Save detailed report
    report_filename = f"fine_tuning_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_filename, 'w') as f:
        json.dump(results_report, f, indent=2)
    
    print(f"✓ Detailed report saved as {report_filename}")
    
    # Test integration
    print(f"\n🔗 Testing OCR integration...")
    try:
        integration = HumidityAppOCRIntegration(model_filename)
        if integration.is_ready:
            print("✓ OCR integration ready for Humidity App")
            
            # Test with a sample if available
            sample_images = [f for f in os.listdir(os.path.join(dataset_path, "images")) 
                           if f.endswith('.png')][:5]
            
            if sample_images:
                print(f"  Testing with {len(sample_images)} sample images...")
                correct = 0
                for img_file in sample_images:
                    try:
                        digit = int(img_file.split('_')[2])
                        img_path = os.path.join(dataset_path, "images", img_file)
                        import cv2
                        img = cv2.imread(img_path)
                        result = integration.ocr.predict_digit(img)
                        if result.get('digit') == digit:
                            correct += 1
                    except:
                        continue
                
                print(f"  Sample test accuracy: {correct}/{len(sample_images)} = {correct/len(sample_images)*100:.1f}%")
        else:
            print("❌ OCR integration failed to initialize")
            
    except Exception as e:
        print(f"⚠ Integration test failed: {e}")
    
    # Final summary
    print(f"\n{'='*50}")
    print(f"🎯 FINE-TUNING COMPLETED SUCCESSFULLY")
    print(f"{'='*50}")
    print(f"📈 Final Results:")
    print(f"  • Test Accuracy: {test_accuracy:.1%}")
    print(f"  • Training Time: {training_time:.1f}s")
    print(f"  • Model Size: {model.model.count_params():,} parameters")
    print(f"  • Model File: {model_filename}")
    print(f"📁 Generated Files:")
    for filename in results_report['files_created'] + [report_filename]:
        print(f"  • {filename}")
    
    print(f"\n🚀 Model is ready for integration into Humidity App!")
    print(f"End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
