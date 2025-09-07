#!/usr/bin/env python3
"""
Enhanced Seven-Segment CNN Fine-tuning v2.0 - Optimized for 2K Dataset
========================================================================

This script implements an advanced CNN model for seven-segment digit recognition
using a 2K dataset with enhanced training strategies and improved hyperparameters.

Key improvements in v2.0:
- Better early stopping patience
- Optimized learning rates  
- Improved Phase 2 training
- Enhanced data augmentation
- Better architecture balance

Author: GitHub Copilot
Date: September 2025
Version: 2.0
"""

import os
import cv2
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau, TensorBoard
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
from tqdm import tqdm
import json
from datetime import datetime

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

class EnhancedSevenSegmentCNN_2K_V2:
    """
    Enhanced CNN for seven-segment digit recognition with 2K dataset - Version 2.0
    Optimized for better performance and reliability
    """
    
    def __init__(self, dataset_path=None, input_shape=(224, 224, 3)):
        """
        Initialize the enhanced CNN model v2.0
        
        Args:
            dataset_path (str): Path to the seven_segment_dataset directory
            input_shape (tuple): Input image shape
        """
        # Set default dataset path if not provided
        if dataset_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            dataset_path = os.path.join(current_dir, "seven_segment_dataset_2k")
        
        self.dataset_path = dataset_path
        self.input_shape = input_shape
        self.num_classes = 10
        self.model = None
        self.history = None
        self.X_train = None
        self.X_val = None
        self.X_test = None
        self.y_train = None
        self.y_val = None
        self.y_test = None
        
        # Print initialization info
        print("Enhanced Seven-Segment CNN Fine-tuning v2.0 with 2K Dataset")
        print("=" * 70)
        
    def load_dataset(self):
        """
        Load and preprocess the seven-segment dataset from 2K flat structure
        
        Returns:
            tuple: (X, y) where X is image data and y is labels
        """
        print("Loading 2K dataset...")
        
        images = []
        labels = []
        
        # Check if dataset exists
        images_path = os.path.join(self.dataset_path, "images")
        if not os.path.exists(images_path):
            raise FileNotFoundError(f"Images path not found: {images_path}")
        
        # Load images using tqdm for progress tracking
        filenames = [f for f in os.listdir(images_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        for filename in tqdm(filenames, desc="Loading images"):
            if filename.startswith('seven_segment_'):
                try:
                    # Extract digit from filename: seven_segment_X_XXXX.png
                    digit = int(filename.split('_')[2])
                    if 0 <= digit <= 9:
                        img_path = os.path.join(images_path, filename)
                        
                        # Load and preprocess image
                        img = cv2.imread(img_path)
                        if img is not None:
                            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                            img = cv2.resize(img, self.input_shape[:2])
                            img = img.astype(np.float32) / 255.0
                            
                            images.append(img)
                            labels.append(digit)
                        
                except (ValueError, IndexError) as e:
                    print(f"Error parsing filename {filename}: {e}")
                    continue
        
        # Convert to numpy arrays
        X = np.array(images)
        y = np.array(labels)
        
        print(f"Loaded {len(X)} images with shape {X.shape}")
        
        # Print label distribution
        unique, counts = np.unique(y, return_counts=True)
        label_dist = dict(zip(unique, counts))
        print(f"Label distribution: {label_dist}")
        
        return X, y
    
    def split_dataset(self, X, y, test_size=0.1, val_size=0.22):
        """
        Split dataset into train, validation, and test sets
        
        Args:
            X (np.array): Image data
            y (np.array): Labels
            test_size (float): Proportion for test set
            val_size (float): Proportion for validation set (from remaining data)
        
        Returns:
            tuple: Split datasets
        """
        print("Splitting dataset...")
        
        # First split: separate test set
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        # Second split: separate train and validation
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=val_size, random_state=42, stratify=y_temp
        )
        
        print(f"Train set: {len(X_train)} samples")
        print(f"Validation set: {len(X_val)} samples")
        print(f"Test set: {len(X_test)} samples")
        
        # Store in instance variables
        self.X_train = X_train
        self.X_val = X_val 
        self.X_test = X_test
        self.y_train = y_train
        self.y_val = y_val
        self.y_test = y_test
        
        return X_train, X_val, X_test, y_train, y_val, y_test
    
    def get_augmentation_layer(self):
        """
        Create enhanced data augmentation layer specifically for seven-segment displays
        
        Returns:
            tf.keras.Sequential: Augmentation layer
        """
        def augment_image(image, label):
            # Only apply augmentation during training (80% chance)
            if tf.random.uniform(()) < 0.8:
                # Small rotation using TensorFlow operations
                if tf.random.uniform(()) < 0.3:
                    angle = tf.random.uniform((), -0.1, 0.1)  # Radians for small rotation
                    image = tf.image.rot90(image, k=tf.cast(angle * 4, tf.int32))
                
                # Slight brightness changes
                if tf.random.uniform(()) < 0.3:
                    image = tf.image.random_brightness(image, max_delta=0.1)
                
                # Very subtle noise (displays can have slight variations)
                if tf.random.uniform(()) < 0.2:
                    noise = tf.random.normal(tf.shape(image), mean=0.0, stddev=0.02)
                    image = tf.clip_by_value(image + noise, 0.0, 1.0)
                
                # Gamma correction (lighting variations)
                if tf.random.uniform(()) < 0.4:
                    gamma = tf.random.uniform((), 0.9, 1.1)
                    image = tf.image.adjust_gamma(image, gamma)
            
            # Ensure image values are in [0, 1]
            image = tf.clip_by_value(image, 0.0, 1.0)
            
            return image, label
        
        return augment_image
    
    def build_enhanced_model_v2(self):
        """
        Build enhanced CNN model v2.0 optimized for better performance
        
        Returns:
            Compiled Keras model
        """
        print("Building enhanced CNN model v2.0 for 2K dataset...")
        
        # Create base model with MobileNetV2
        base_model = MobileNetV2(
            input_shape=self.input_shape,
            alpha=1.0,  # Full model for better capacity
            include_top=False,
            weights='imagenet'
        )
        
        # Freeze all layers initially
        base_model.trainable = False
        
        # Build model with enhanced architecture
        model = tf.keras.Sequential([
            # Input normalization
            layers.Rescaling(1./255., input_shape=self.input_shape),
            
            # Base MobileNetV2 model
            base_model,
            
            # Enhanced classification head
            layers.GlobalAveragePooling2D(),
            layers.Dropout(0.2),
            
            # First dense layer with more capacity
            layers.Dense(512, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            
            # Second dense layer 
            layers.Dense(256, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            
            # Third dense layer for better feature learning
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.4),
            
            # Output layer
            layers.Dense(self.num_classes, activation='softmax')
        ])
        
        # Display model architecture
        model.summary()
        
        # Calculate trainable parameters
        trainable_params = sum([np.prod(w.shape) for w in model.trainable_weights])
        print(f"Total params: {model.count_params():,}")
        print(f"Trainable params: {trainable_params:,}")
        
        self.model = model
        return model
    
    def train_enhanced_two_phase_v2(self, epochs_phase1=12, epochs_phase2=8):
        """
        Enhanced two-phase training strategy v2.0 with improved parameters
        
        Args:
            epochs_phase1 (int): Epochs for frozen base training
            epochs_phase2 (int): Epochs for unfrozen fine-tuning
        
        Returns:
            dict: Combined training history
        """
        if self.model is None:
            raise ValueError("Model not built. Call build_enhanced_model_v2() first.")
        
        print("=" * 60)
        print("ENHANCED TWO-PHASE TRAINING v2.0 FOR 2K DATASET")
        print("=" * 60)
        
        # Prepare data with augmentation
        train_ds = tf.data.Dataset.from_tensor_slices((self.X_train, self.y_train))
        train_ds = train_ds.map(self.get_augmentation_layer(), num_parallel_calls=tf.data.AUTOTUNE)
        train_ds = train_ds.batch(32).prefetch(tf.data.AUTOTUNE)
        
        val_ds = tf.data.Dataset.from_tensor_slices((self.X_val, self.y_val))
        val_ds = val_ds.batch(32).prefetch(tf.data.AUTOTUNE)
        
        # ============================================
        # PHASE 1: Train with frozen base model
        # ============================================
        print(f"\\nPhase 1: Training with frozen base model ({epochs_phase1} epochs)...")
        
        # Compile model with higher learning rate for classification head
        self.model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        print(f"Learning rate: {self.model.optimizer.learning_rate.numpy()}")
        
        # Enhanced callbacks for Phase 1
        callbacks_phase1 = [
            ModelCheckpoint(
                'seven_segment_2k_enhanced_v2_model.keras',
                monitor='val_accuracy',
                save_best_only=True,
                mode='max',
                verbose=1
            ),
            EarlyStopping(
                monitor='val_accuracy',
                patience=8,  # More patience for better learning
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=4,  # Slightly more patience
                min_lr=1e-7,
                verbose=1
            )
        ]
        
        # Train Phase 1
        history_phase1 = self.model.fit(
            train_ds,
            epochs=epochs_phase1,
            validation_data=val_ds,
            callbacks=callbacks_phase1,
            verbose=1
        )
        
        # ============================================
        # PHASE 2: Fine-tune with unfrozen layers
        # ============================================
        print(f"\\nPhase 2: Fine-tuning with unfrozen layers ({epochs_phase2} epochs)...")
        
        # Unfreeze the last 50 layers of base model for gradual fine-tuning
        base_model = self.model.layers[1]  # MobileNetV2 is the second layer
        base_model.trainable = True
        
        # Freeze first 100 layers (out of ~150 total)
        for layer in base_model.layers[:100]:
            layer.trainable = False
        
        # Count trainable parameters after unfreezing
        trainable_params = sum([np.prod(w.shape) for w in self.model.trainable_weights])
        print(f"Trainable params after unfreezing: {trainable_params:,}")
        
        # Recompile with much lower learning rate for fine-tuning
        self.model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),  # Very low LR
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        print(f"Learning rate: {self.model.optimizer.learning_rate.numpy()}")
        
        # Enhanced callbacks for Phase 2
        callbacks_phase2 = [
            ModelCheckpoint(
                'seven_segment_2k_enhanced_v2_model.keras',
                monitor='val_accuracy',
                save_best_only=True,
                mode='max',
                verbose=1
            ),
            EarlyStopping(
                monitor='val_accuracy',
                patience=6,  # Reasonable patience for fine-tuning
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.3,  # More aggressive LR reduction
                patience=3,
                min_lr=1e-8,
                verbose=1
            )
        ]
        
        # Train Phase 2
        history_phase2 = self.model.fit(
            train_ds,
            epochs=epochs_phase2,
            validation_data=val_ds,
            callbacks=callbacks_phase2,
            verbose=1
        )
        
        print("\\nTraining completed!")
        
        # Combine histories with safe key handling
        combined_history = {}
        
        # Get all unique keys from both histories
        all_keys = set(history_phase1.history.keys()) | set(history_phase2.history.keys())
        
        for key in all_keys:
            combined_history[key] = []
            
            # Add Phase 1 data if key exists
            if key in history_phase1.history:
                combined_history[key].extend(history_phase1.history[key])
            else:
                # Pad with placeholder values if key doesn't exist in Phase 1
                combined_history[key].extend([0.0] * len(history_phase1.history.get('loss', [])))
            
            # Add Phase 2 data if key exists
            if key in history_phase2.history:
                combined_history[key].extend(history_phase2.history[key])
            else:
                # Pad with placeholder values if key doesn't exist in Phase 2
                combined_history[key].extend([0.0] * len(history_phase2.history.get('loss', [])))
        
        self.history = combined_history
        return combined_history
    
    def evaluate_model(self):
        """
        Evaluate the trained model on test set
        
        Returns:
            dict: Evaluation metrics
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train_enhanced_two_phase_v2() first.")
        
        print("Evaluating enhanced 2K model v2.0...")
        
        # Evaluate on test set
        test_loss, test_accuracy = self.model.evaluate(self.X_test, self.y_test, verbose=0)
        
        # Get predictions
        y_pred = self.model.predict(self.X_test, verbose=0)
        y_pred_classes = np.argmax(y_pred, axis=1)
        
        print(f"Test Accuracy: {test_accuracy:.4f}")
        print(f"Test Loss: {test_loss:.4f}")
        
        # Classification report
        print("\\nClassification Report:")
        print(classification_report(self.y_test, y_pred_classes))
        
        # Accuracy by digit
        print("\\nAccuracy by digit:")
        for digit in range(10):
            digit_mask = self.y_test == digit
            if np.sum(digit_mask) > 0:
                digit_accuracy = np.mean(y_pred_classes[digit_mask] == digit)
                print(f"digit_{digit}: {digit_accuracy:.3f}")
        
        return {
            'test_accuracy': test_accuracy,
            'test_loss': test_loss,
            'y_true': self.y_test,
            'y_pred': y_pred_classes
        }
    
    def save_model(self, filepath=None):
        """
        Save the trained model
        
        Args:
            filepath (str): Path to save the model
        """
        if filepath is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = f"seven_segment_2k_enhanced_v2_{timestamp}.keras"
        
        if self.model is not None:
            self.model.save(filepath)
            print(f"Model saved to: {filepath}")
        else:
            print("No model to save. Train the model first.")

def main():
    """
    Main training pipeline for enhanced seven-segment CNN v2.0
    """
    # Initialize the enhanced CNN v2.0
    cnn = EnhancedSevenSegmentCNN_2K_V2()
    
    try:
        # Load dataset
        X, y = cnn.load_dataset()
        
        # Split dataset
        cnn.split_dataset(X, y)
        
        # Build enhanced model v2.0
        cnn.build_enhanced_model_v2()
        
        # Train with enhanced two-phase approach v2.0
        history = cnn.train_enhanced_two_phase_v2(epochs_phase1=12, epochs_phase2=8)
        
        # Evaluate model
        results = cnn.evaluate_model()
        
        # Save the final model
        cnn.save_model()
        
        print("\\n" + "="*60)
        print("ENHANCED 2K TRAINING v2.0 COMPLETED SUCCESSFULLY!")
        print("="*60)
        print(f"Final Test Accuracy: {results['test_accuracy']:.4f}")
        
    except Exception as e:
        print(f"Error during training: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
