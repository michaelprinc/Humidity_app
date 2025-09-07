"""
Simplified Seven-Segment Digit CNN Model for OCR Fine-tuning
============================================================

Simplified CNN model for seven-segment digit recognition compatible with Keras 3.x
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

class SimpleSevenSegmentCNN:
    def __init__(self, input_shape=(300, 200, 3), num_classes=10):
        """
        Initialize Seven-Segment CNN model
        """
        self.input_shape = input_shape
        self.num_classes = num_classes
        self.model = None
        self.history = None
    
    def build_model(self):
        """
        Build CNN architecture for seven-segment digits
        """
        model = keras.Sequential([
            keras.layers.Input(shape=self.input_shape),
            
            # Preprocessing
            keras.layers.Rescaling(1./255),
            
            # Convolutional layers
            keras.layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
            keras.layers.MaxPooling2D((2, 2)),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.25),
            
            keras.layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
            keras.layers.MaxPooling2D((2, 2)),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.25),
            
            keras.layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
            keras.layers.MaxPooling2D((2, 2)),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.3),
            
            keras.layers.Conv2D(256, (3, 3), activation='relu', padding='same'),
            keras.layers.GlobalAveragePooling2D(),
            
            # Dense layers
            keras.layers.Dense(512, activation='relu'),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.5),
            
            keras.layers.Dense(256, activation='relu'),
            keras.layers.Dropout(0.3),
            
            keras.layers.Dense(self.num_classes, activation='softmax')
        ])
        
        self.model = model
        return model
    
    def compile_model(self, learning_rate=0.001):
        """
        Compile model
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
        Load and preprocess seven-segment dataset
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
                img = cv2.resize(img, (self.input_shape[1], self.input_shape[0]))
                
                images.append(img)
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
    
    def train(self, train_data, val_data, epochs=50, batch_size=16):
        """
        Train the model
        """
        X_train, y_train = train_data
        X_val, y_val = val_data
        
        # Data augmentation
        data_augmentation = keras.Sequential([
            keras.layers.RandomRotation(0.1),
            keras.layers.RandomZoom(0.1),
            keras.layers.RandomContrast(0.2)
        ])
        
        # Augment training data
        augmented_X_train = []
        augmented_y_train = []
        
        print("Applying data augmentation...")
        for i in tqdm(range(len(X_train))):
            # Original image
            augmented_X_train.append(X_train[i])
            augmented_y_train.append(y_train[i])
            
            # Augmented versions
            img = np.expand_dims(X_train[i], 0)
            for _ in range(2):  # Create 2 augmented versions
                aug_img = data_augmentation(img)
                augmented_X_train.append(aug_img[0])
                augmented_y_train.append(y_train[i])
        
        X_train_aug = np.array(augmented_X_train)
        y_train_aug = np.array(augmented_y_train)
        
        print(f"Augmented training set: {len(X_train_aug)} samples")
        
        # Callbacks
        callbacks = [
            keras.callbacks.ModelCheckpoint(
                'seven_segment_best_model.keras',
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
            X_train_aug, y_train_aug,
            batch_size=batch_size,
            epochs=epochs,
            validation_data=(X_val, y_val),
            callbacks=callbacks,
            verbose=1
        )
        
        return self.history
    
    def evaluate_model(self, test_data):
        """
        Evaluate model
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
        
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        
        # Accuracy
        axes[0].plot(self.history.history['accuracy'], label='Training')
        axes[0].plot(self.history.history['val_accuracy'], label='Validation')
        axes[0].set_title('Model Accuracy')
        axes[0].set_xlabel('Epoch')
        axes[0].set_ylabel('Accuracy')
        axes[0].legend()
        axes[0].grid(True)
        
        # Loss
        axes[1].plot(self.history.history['loss'], label='Training')
        axes[1].plot(self.history.history['val_loss'], label='Validation')
        axes[1].set_title('Model Loss')
        axes[1].set_xlabel('Epoch')
        axes[1].set_ylabel('Loss')
        axes[1].legend()
        axes[1].grid(True)
        
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


def main():
    """
    Main training function
    """
    print("Seven-Segment CNN Fine-tuning Started")
    print("=" * 50)
    
    # Initialize model
    model = SimpleSevenSegmentCNN(input_shape=(300, 200, 3), num_classes=10)
    model.build_model()
    model.compile_model(learning_rate=0.001)
    
    # Print model summary
    print("\nModel Architecture:")
    model.model.summary()
    
    # Load dataset - Updated to use 2K samples
    dataset_path = "seven_segment_dataset_2k"  # Rozšířený dataset s 2000 vzorky
    train_data, val_data, test_data = model.load_dataset(dataset_path)
    
    # Train model
    history = model.train(train_data, val_data, epochs=30, batch_size=8)
    
    # Plot training history
    model.plot_training_history()
    
    # Evaluate model
    print("\nEvaluating model...")
    results = model.evaluate_model(test_data)
    print(f"\nFinal Test Accuracy: {results['accuracy']:.4f}")
    
    # Save model - Updated filename for 2K dataset
    model.save_model("seven_segment_cnn_2k_final.keras")
    
    # Save results
    results_summary = {
        'test_accuracy': float(results['accuracy']),
        'per_digit_accuracy': results['per_digit_accuracy'].tolist(),
        'model_architecture': 'Simple CNN for Seven-Segment Digits',
        'training_epochs': len(history.history['loss']),
        'final_val_accuracy': float(history.history['val_accuracy'][-1])
    }
    
    with open('training_results.json', 'w') as f:
        json.dump(results_summary, f, indent=2)
    
    print("\nFine-tuning completed successfully!")
    print(f"Model saved as: seven_segment_cnn_2k_final.keras")
    print(f"Results saved as: training_results.json")


if __name__ == "__main__":
    main()
