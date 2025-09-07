"""
Enhanced Seven-Segment Digit CNN with Transfer Learning
======================================================

Enhanced CNN model using transfer learning for better performance on small dataset
"""

import tensorflow as tf
import keras
import numpy as np
import cv2
import os
import json
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

class EnhancedSevenSegmentCNN:
    def __init__(self, input_shape=(224, 224, 3), num_classes=10):
        """
        Initialize Enhanced Seven-Segment CNN model with transfer learning
        """
        self.input_shape = input_shape
        self.num_classes = num_classes
        self.model = None
        self.history = None
    
    def build_model(self):
        """
        Build enhanced CNN using transfer learning
        """
        # Create base model with MobileNetV2
        base_model = keras.applications.MobileNetV2(
            input_shape=self.input_shape,
            include_top=False,
            weights='imagenet'
        )
        
        # Freeze base model layers initially
        base_model.trainable = False
        
        # Add custom head
        model = keras.Sequential([
            keras.layers.Input(shape=self.input_shape),
            
            # Preprocessing
            keras.layers.Rescaling(1./255),
            
            # Base model
            base_model,
            
            # Custom classification head
            keras.layers.GlobalAveragePooling2D(),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(128, activation='relu'),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.5),
            keras.layers.Dense(64, activation='relu'),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(self.num_classes, activation='softmax')
        ])
        
        self.model = model
        self.base_model = base_model
        return model
    
    def compile_model(self, learning_rate=0.0001):
        """
        Compile model with lower learning rate for transfer learning
        """
        if self.model is None:
            self.build_model()
        
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
    
    def load_dataset(self, dataset_path, validation_split=0.2, test_split=0.1):
        """
        Load and preprocess seven-segment dataset with enhanced preprocessing
        """
        images_dir = os.path.join(dataset_path, 'images')
        
        images = []
        labels = []
        
        print("Loading dataset...")
        for filename in tqdm(os.listdir(images_dir)):
            if filename.endswith('.png'):
                digit = int(filename.split('_')[2])
                
                img_path = os.path.join(images_dir, filename)
                img = cv2.imread(img_path)
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                
                # Enhanced preprocessing for seven-segment displays
                img_processed = self.preprocess_seven_segment(img)
                
                # Resize to input shape
                img_resized = cv2.resize(img_processed, (self.input_shape[1], self.input_shape[0]))
                
                images.append(img_resized)
                labels.append(digit)
        
        images = np.array(images, dtype=np.float32)
        labels = np.array(labels)
        
        print(f"Loaded {len(images)} images with shape {images.shape}")
        print(f"Label distribution: {np.bincount(labels)}")
        
        # Split dataset
        X_temp, X_test, y_temp, y_test = train_test_split(
            images, labels, test_size=test_split, random_state=42, stratify=labels
        )
        
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=validation_split/(1-test_split), 
            random_state=42, stratify=y_temp
        )
        
        print(f"Train set: {len(X_train)} samples")
        print(f"Validation set: {len(X_val)} samples")
        print(f"Test set: {len(X_test)} samples")
        
        return (X_train, y_train), (X_val, y_val), (X_test, y_test)
    
    def preprocess_seven_segment(self, image):
        """
        Specialized preprocessing for seven-segment displays
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
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
        
        # Morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        
        # Convert back to RGB for model
        result = cv2.cvtColor(cleaned, cv2.COLOR_GRAY2RGB)
        
        return result
    
    def create_advanced_augmentation(self):
        """
        Create advanced data augmentation pipeline
        """
        return keras.Sequential([
            keras.layers.RandomRotation(0.05),
            keras.layers.RandomZoom(0.05),
            keras.layers.RandomContrast(0.1),
            keras.layers.RandomBrightness(0.1),
        ])
    
    def train(self, train_data, val_data, epochs=40, batch_size=16):
        """
        Train the model with two-phase approach
        """
        X_train, y_train = train_data
        X_val, y_val = val_data
        
        # Phase 1: Train with frozen base model
        print("Phase 1: Training with frozen base model...")
        
        # Data augmentation
        data_augmentation = self.create_advanced_augmentation()
        
        # Create more augmented data for small dataset
        augmented_X_train = []
        augmented_y_train = []
        
        print("Applying extensive data augmentation...")
        for i in tqdm(range(len(X_train))):
            # Original image
            augmented_X_train.append(X_train[i])
            augmented_y_train.append(y_train[i])
            
            # Create multiple augmented versions for small dataset
            img = np.expand_dims(X_train[i], 0)
            for _ in range(8):  # Create 8 augmented versions
                aug_img = data_augmentation(img)
                augmented_X_train.append(aug_img[0])
                augmented_y_train.append(y_train[i])
        
        X_train_aug = np.array(augmented_X_train)
        y_train_aug = np.array(augmented_y_train)
        
        print(f"Augmented training set: {len(X_train_aug)} samples")
        
        # Callbacks
        callbacks = [
            keras.callbacks.ModelCheckpoint(
                'seven_segment_enhanced_model.keras',
                monitor='val_accuracy',
                save_best_only=True,
                verbose=1
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-8,
                verbose=1
            ),
            keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=12,
                restore_best_weights=True,
                verbose=1
            )
        ]
        
        # Train phase 1
        self.history = self.model.fit(
            X_train_aug, y_train_aug,
            batch_size=batch_size,
            epochs=epochs//2,
            validation_data=(X_val, y_val),
            callbacks=callbacks,
            verbose=1
        )
        
        # Phase 2: Fine-tune with unfrozen layers
        print("\nPhase 2: Fine-tuning with unfrozen layers...")
        
        # Unfreeze the top layers of the base model
        self.base_model.trainable = True
        
        # Freeze all layers except the top 20
        for layer in self.base_model.layers[:-20]:
            layer.trainable = False
        
        # Recompile with lower learning rate for fine-tuning
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.00001),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        # Continue training
        history_2 = self.model.fit(
            X_train_aug, y_train_aug,
            batch_size=batch_size,
            epochs=epochs//2,
            validation_data=(X_val, y_val),
            callbacks=callbacks,
            verbose=1
        )
        
        # Combine histories
        for key in self.history.history.keys():
            self.history.history[key].extend(history_2.history[key])
        
        return self.history
    
    def evaluate_model(self, test_data):
        """
        Evaluate model with detailed metrics
        """
        X_test, y_test = test_data
        
        # Predictions
        y_pred_probs = self.model.predict(X_test, verbose=0)
        y_pred = np.argmax(y_pred_probs, axis=1)
        
        # Classification report
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, zero_division=0))
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        # Plot confusion matrix
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=range(10), yticklabels=range(10))
        plt.title('Enhanced Seven-Segment Digit Recognition')
        plt.xlabel('Predicted')
        plt.ylabel('Actual')
        plt.savefig('enhanced_confusion_matrix.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        # Accuracy by digit
        digit_accuracies = np.where(cm.sum(axis=1) > 0, 
                                   cm.diagonal() / cm.sum(axis=1), 0)
        
        print("\nAccuracy by digit:")
        for digit, acc in enumerate(digit_accuracies):
            print(f"Digit {digit}: {acc:.3f}")
        
        return {
            'accuracy': np.mean(y_test == y_pred),
            'per_digit_accuracy': digit_accuracies,
            'confusion_matrix': cm,
            'predictions': y_pred,
            'probabilities': y_pred_probs
        }
    
    def plot_training_history(self):
        """
        Plot enhanced training history
        """
        if self.history is None:
            print("No training history available")
            return
        
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        
        # Accuracy
        axes[0].plot(self.history.history['accuracy'], label='Training')
        axes[0].plot(self.history.history['val_accuracy'], label='Validation')
        axes[0].axvline(x=len(self.history.history['accuracy'])//2, 
                       color='red', linestyle='--', alpha=0.7, 
                       label='Fine-tuning start')
        axes[0].set_title('Enhanced Model Accuracy')
        axes[0].set_xlabel('Epoch')
        axes[0].set_ylabel('Accuracy')
        axes[0].legend()
        axes[0].grid(True)
        
        # Loss
        axes[1].plot(self.history.history['loss'], label='Training')
        axes[1].plot(self.history.history['val_loss'], label='Validation')
        axes[1].axvline(x=len(self.history.history['loss'])//2, 
                       color='red', linestyle='--', alpha=0.7, 
                       label='Fine-tuning start')
        axes[1].set_title('Enhanced Model Loss')
        axes[1].set_xlabel('Epoch')
        axes[1].set_ylabel('Loss')
        axes[1].legend()
        axes[1].grid(True)
        
        plt.tight_layout()
        plt.savefig('enhanced_training_history.png', dpi=300, bbox_inches='tight')
        plt.show()
    
    def save_model(self, filepath):
        """
        Save the trained model
        """
        if self.model is not None:
            self.model.save(filepath)
            print(f"Enhanced model saved to {filepath}")
    
    def load_model(self, filepath):
        """
        Load a trained model
        """
        self.model = keras.models.load_model(filepath)
        print(f"Enhanced model loaded from {filepath}")


def main():
    """
    Main enhanced training function
    """
    print("Enhanced Seven-Segment CNN Fine-tuning with Transfer Learning")
    print("=" * 60)
    
    # Initialize enhanced model
    model = EnhancedSevenSegmentCNN(input_shape=(224, 224, 3), num_classes=10)
    model.build_model()
    model.compile_model(learning_rate=0.0001)
    
    # Print model summary
    print("\nEnhanced Model Architecture:")
    model.model.summary()
    
    # Load dataset
    dataset_path = "seven_segment_dataset"
    train_data, val_data, test_data = model.load_dataset(dataset_path)
    
    # Train model with two-phase approach
    history = model.train(train_data, val_data, epochs=30, batch_size=8)
    
    # Plot training history
    model.plot_training_history()
    
    # Evaluate model
    print("\nEvaluating enhanced model...")
    results = model.evaluate_model(test_data)
    print(f"\nFinal Test Accuracy: {results['accuracy']:.4f}")
    
    # Save model
    model.save_model("seven_segment_enhanced_final.keras")
    
    # Save results
    results_summary = {
        'test_accuracy': float(results['accuracy']),
        'per_digit_accuracy': results['per_digit_accuracy'].tolist(),
        'model_architecture': 'Enhanced CNN with Transfer Learning',
        'transfer_learning': 'MobileNetV2',
        'training_epochs': len(history.history['loss']),
        'final_val_accuracy': float(history.history['val_accuracy'][-1]),
        'best_val_accuracy': float(max(history.history['val_accuracy']))
    }
    
    with open('enhanced_training_results.json', 'w') as f:
        json.dump(results_summary, f, indent=2)
    
    print("\nEnhanced fine-tuning completed successfully!")
    print(f"Enhanced model saved as: seven_segment_enhanced_final.keras")
    print(f"Results saved as: enhanced_training_results.json")
    
    if results['accuracy'] > 0.8:
        print(f"🎉 Excellent performance: {results['accuracy']:.1%} accuracy!")
    elif results['accuracy'] > 0.6:
        print(f"✓ Good performance: {results['accuracy']:.1%} accuracy")
    else:
        print(f"⚠ Model needs improvement: {results['accuracy']:.1%} accuracy")


if __name__ == "__main__":
    main()
