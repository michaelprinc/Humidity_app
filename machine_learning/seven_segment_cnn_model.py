"""
Seven-Segment Digit CNN Model for OCR Fine-tuning
=================================================

Specialized CNN model for recognizing seven-segment display digits
optimized for low contrast, noisy, and realistic conditions.
"""

import tensorflow as tf
import keras
from keras import layers
import numpy as np
import cv2
import os
import json
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm
import albumentations as A

class SevenSegmentCNN:
    def __init__(self, input_shape=(300, 200, 3), num_classes=10):
        """
        Initialize Seven-Segment CNN model
        
        Args:
            input_shape: Input image dimensions (height, width, channels)
            num_classes: Number of digit classes (0-9)
        """
        self.input_shape = input_shape
        self.num_classes = num_classes
        self.model = None
        self.history = None
        
        # Data augmentation pipeline for realistic conditions
        self.augmentation = A.Compose([
            A.GaussNoise(var_limit=(10.0, 50.0), p=0.3),
            A.MotionBlur(blur_limit=3, p=0.2),
            A.RandomBrightnessContrast(
                brightness_limit=0.2, 
                contrast_limit=0.2, 
                p=0.4
            ),
            A.GaussianBlur(blur_limit=3, p=0.2),
            A.Perspective(scale=(0.02, 0.05), p=0.3),
            A.GridDistortion(num_steps=5, distort_limit=0.1, p=0.2),
            A.RandomShadow(p=0.2)
        ])
    
    def build_model(self):
        """
        Build specialized CNN architecture for seven-segment digits
        """
        model = keras.Sequential([
            # Input preprocessing
            layers.Input(shape=self.input_shape),
            layers.Rescaling(1./255),
            
            # Feature extraction blocks optimized for seven-segment patterns
            # Block 1: Edge detection
            layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
            layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
            layers.MaxPooling2D((2, 2)),
            layers.BatchNormalization(),
            layers.Dropout(0.25),
            
            # Block 2: Segment pattern recognition
            layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
            layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
            layers.MaxPooling2D((2, 2)),
            layers.BatchNormalization(),
            layers.Dropout(0.25),
            
            # Block 3: Complex feature combinations
            layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
            layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
            layers.MaxPooling2D((2, 2)),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            
            # Block 4: High-level features
            layers.Conv2D(256, (3, 3), activation='relu', padding='same'),
            layers.Conv2D(256, (3, 3), activation='relu', padding='same'),
            layers.MaxPooling2D((2, 2)),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            
            # Global feature aggregation
            layers.GlobalAveragePooling2D(),
            
            # Classification head
            layers.Dense(512, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.5),
            
            layers.Dense(256, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            
            layers.Dense(self.num_classes, activation='softmax')
        ])
        
        self.model = model
        return model
    
    def compile_model(self, learning_rate=0.001):
        """
        Compile model with appropriate optimizer and loss
        """
        if self.model is None:
            self.build_model()
        
        optimizer = keras.optimizers.Adam(
            learning_rate=learning_rate,
            beta_1=0.9,
            beta_2=0.999,
            epsilon=1e-7
        )
        
        self.model.compile(
            optimizer=optimizer,
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy', 'top_2_accuracy']
        )
    
    def load_dataset(self, dataset_path, validation_split=0.2, test_split=0.1):
        """
        Load and preprocess seven-segment dataset
        
        Args:
            dataset_path: Path to dataset directory
            validation_split: Fraction for validation set
            test_split: Fraction for test set
        """
        images_dir = os.path.join(dataset_path, 'images')
        
        # Load images and labels
        images = []
        labels = []
        
        print("Loading dataset...")
        for filename in tqdm(os.listdir(images_dir)):
            if filename.endswith('.png'):
                # Extract label from filename: seven_segment_DIGIT_variant.png
                digit = int(filename.split('_')[2])
                
                # Load and preprocess image
                img_path = os.path.join(images_dir, filename)
                img = cv2.imread(img_path)
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                img = cv2.resize(img, (self.input_shape[1], self.input_shape[0]))
                
                images.append(img)
                labels.append(digit)
        
        images = np.array(images)
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
    
    def augment_batch(self, batch_x, batch_y):
        """
        Apply data augmentation to a batch
        """
        augmented_x = []
        
        for img in batch_x:
            # Apply augmentation
            if np.random.random() > 0.3:  # 70% chance of augmentation
                augmented = self.augmentation(image=img.astype(np.uint8))
                augmented_x.append(augmented['image'].astype(np.float32))
            else:
                augmented_x.append(img.astype(np.float32))
        
        return np.array(augmented_x), batch_y
    
    def create_data_generator(self, X, y, batch_size=32, shuffle=True, augment=True):
        """
        Create data generator with augmentation
        """
        dataset = tf.data.Dataset.from_tensor_slices((X, y))
        
        if shuffle:
            dataset = dataset.shuffle(buffer_size=len(X))
        
        dataset = dataset.batch(batch_size)
        
        if augment:
            dataset = dataset.map(
                lambda x, y: tf.py_function(
                    self.augment_batch, 
                    [x, y], 
                    [tf.float32, tf.int64]
                ),
                num_parallel_calls=tf.data.AUTOTUNE
            )
        
        dataset = dataset.prefetch(tf.data.AUTOTUNE)
        return dataset
    
    def train(self, train_data, val_data, epochs=50, batch_size=32):
        """
        Train the model with advanced callbacks
        """
        X_train, y_train = train_data
        X_val, y_val = val_data
        
        # Create data generators
        train_gen = self.create_data_generator(X_train, y_train, batch_size, augment=True)
        val_gen = self.create_data_generator(X_val, y_val, batch_size, augment=False, shuffle=False)
        
        # Callbacks
        callbacks = [
            keras.callbacks.ModelCheckpoint(
                'seven_segment_best_model.h5',
                monitor='val_accuracy',
                save_best_only=True,
                verbose=1
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-7,
                verbose=1
            ),
            keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True,
                verbose=1
            )
        ]
        
        # Train model
        print("Starting training...")
        self.history = self.model.fit(
            train_gen,
            epochs=epochs,
            validation_data=val_gen,
            callbacks=callbacks,
            verbose=1
        )
        
        return self.history
    
    def evaluate_model(self, test_data):
        """
        Comprehensive model evaluation
        """
        X_test, y_test = test_data
        
        # Predictions
        y_pred_probs = self.model.predict(X_test)
        y_pred = np.argmax(y_pred_probs, axis=1)
        
        # Classification report
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred))
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        # Plot confusion matrix
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=range(10), yticklabels=range(10))
        plt.title('Confusion Matrix - Seven-Segment Digit Recognition')
        plt.xlabel('Predicted')
        plt.ylabel('Actual')
        plt.savefig('confusion_matrix.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        # Accuracy by digit
        digit_accuracies = cm.diagonal() / cm.sum(axis=1)
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
        Plot training history
        """
        if self.history is None:
            print("No training history available")
            return
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # Accuracy
        axes[0, 0].plot(self.history.history['accuracy'], label='Training')
        axes[0, 0].plot(self.history.history['val_accuracy'], label='Validation')
        axes[0, 0].set_title('Model Accuracy')
        axes[0, 0].set_xlabel('Epoch')
        axes[0, 0].set_ylabel('Accuracy')
        axes[0, 0].legend()
        axes[0, 0].grid(True)
        
        # Loss
        axes[0, 1].plot(self.history.history['loss'], label='Training')
        axes[0, 1].plot(self.history.history['val_loss'], label='Validation')
        axes[0, 1].set_title('Model Loss')
        axes[0, 1].set_xlabel('Epoch')
        axes[0, 1].set_ylabel('Loss')
        axes[0, 1].legend()
        axes[0, 1].grid(True)
        
        # Top-2 Accuracy
        if 'top_2_accuracy' in self.history.history:
            axes[1, 0].plot(self.history.history['top_2_accuracy'], label='Training')
            axes[1, 0].plot(self.history.history['val_top_2_accuracy'], label='Validation')
            axes[1, 0].set_title('Top-2 Accuracy')
            axes[1, 0].set_xlabel('Epoch')
            axes[1, 0].set_ylabel('Top-2 Accuracy')
            axes[1, 0].legend()
            axes[1, 0].grid(True)
        
        # Learning Rate
        if 'lr' in self.history.history:
            axes[1, 1].plot(self.history.history['lr'])
            axes[1, 1].set_title('Learning Rate')
            axes[1, 1].set_xlabel('Epoch')
            axes[1, 1].set_ylabel('Learning Rate')
            axes[1, 1].set_yscale('log')
            axes[1, 1].grid(True)
        
        plt.tight_layout()
        plt.savefig('training_history.png', dpi=300, bbox_inches='tight')
        plt.show()
    
    def save_model(self, filepath):
        """
        Save the trained model
        """
        if self.model is not None:
            self.model.save(filepath)
            print(f"Model saved to {filepath}")
    
    def load_model(self, filepath):
        """
        Load a trained model
        """
        self.model = keras.models.load_model(filepath)
        print(f"Model loaded from {filepath}")
    
    def predict_single(self, image_path):
        """
        Predict single image with confidence scores
        """
        if self.model is None:
            raise ValueError("Model not loaded or trained")
        
        # Load and preprocess image
        img = cv2.imread(image_path)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (self.input_shape[1], self.input_shape[0]))
        img = np.expand_dims(img, axis=0)
        
        # Predict
        prediction = self.model.predict(img)
        predicted_digit = np.argmax(prediction[0])
        confidence = np.max(prediction[0])
        
        return {
            'digit': predicted_digit,
            'confidence': confidence,
            'all_probabilities': prediction[0]
        }


def main():
    """
    Main training function
    """
    print("Seven-Segment CNN Fine-tuning Started")
    print("=" * 50)
    
    # Initialize model
    model = SevenSegmentCNN(input_shape=(300, 200, 3), num_classes=10)
    model.build_model()
    model.compile_model(learning_rate=0.001)
    
    # Print model summary
    print("\nModel Architecture:")
    model.model.summary()
    
    # Load dataset
    dataset_path = "seven_segment_dataset"
    train_data, val_data, test_data = model.load_dataset(dataset_path)
    
    # Train model
    history = model.train(train_data, val_data, epochs=50, batch_size=16)
    
    # Plot training history
    model.plot_training_history()
    
    # Evaluate model
    print("\nEvaluating model...")
    results = model.evaluate_model(test_data)
    print(f"\nFinal Test Accuracy: {results['accuracy']:.4f}")
    
    # Save model
    model.save_model("seven_segment_cnn_final.h5")
    
    # Save results
    results_summary = {
        'test_accuracy': float(results['accuracy']),
        'per_digit_accuracy': results['per_digit_accuracy'].tolist(),
        'model_architecture': 'Custom CNN for Seven-Segment Digits',
        'training_epochs': len(history.history['loss']),
        'final_val_accuracy': float(history.history['val_accuracy'][-1])
    }
    
    with open('training_results.json', 'w') as f:
        json.dump(results_summary, f, indent=2)
    
    print("\nFine-tuning completed successfully!")
    print(f"Model saved as: seven_segment_cnn_final.h5")
    print(f"Results saved as: training_results.json")


if __name__ == "__main__":
    main()
