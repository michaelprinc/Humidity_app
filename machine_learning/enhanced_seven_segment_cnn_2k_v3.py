#!/usr/bin/env python3
"""
Enhanced Seven-Segment CNN - 2K v3
==================================

Goal: Be robust to noise and explicitly model seven-segment structure.

Key changes vs v2:
- Segment-aware multi-task learning: auxiliary head predicts 7 segment on/off.
- Structure-first preprocessing: grayscale + binary + edges channels.
- Conservative, photometric-only augmentations to avoid label drift.
- Small custom CNN with Squeeze-and-Excitation blocks (no new deps).

Author: GitHub Copilot
Date: September 2025
Version: 3.0
"""

import os
import cv2
import json
import numpy as np
from datetime import datetime
from typing import Tuple, Dict, Any

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"


def squeeze_excite_block(x: tf.Tensor, ratio: int = 16, name: str = None) -> tf.Tensor:
    """Squeeze-and-Excitation block to promote informative channels."""
    filters = x.shape[-1]
    se = layers.GlobalAveragePooling2D(name=None if not name else name+"_gap")(x)
    se = layers.Dense(max(filters // ratio, 4), activation="relu", name=None if not name else name+"_fc1")(se)
    se = layers.Dense(filters, activation="sigmoid", name=None if not name else name+"_fc2")(se)
    se = layers.Multiply(name=None if not name else name+"_scale")([x, layers.Reshape((1, 1, filters))(se)])
    return se


class EnhancedSevenSegmentCNN_2K_V3:
    def __init__(self, dataset_path: str | None = None, input_shape: Tuple[int, int, int] = (224, 224, 3)):
        if dataset_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            dataset_path = os.path.join(current_dir, "seven_segment_dataset_2k")
        self.dataset_path = dataset_path
        self.input_shape = input_shape
        self.num_classes = 10
        self.model: tf.keras.Model | None = None
        self.history: Dict[str, Any] | None = None
        self.X_train = self.X_val = self.X_test = None
        self.y_train = self.y_val = self.y_test = None
        self.seg_train = self.seg_val = self.seg_test = None

        print("Enhanced Seven-Segment CNN v3 (2K) — noise-robust & segment-aware")
        print("=" * 78)

    # ----------------------------
    # Data loading and processing
    # ----------------------------
    def _preprocess_and_segments(self, img_bgr: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Preprocess image into 3-channel structure-oriented representation and
        derive 7-segment pseudo-labels via ROI sampling on the binarized image.

        Returns:
            (img_proc, seg_vec)
            img_proc: HxWx3 float32 in [0,1] (gray, binary, edges)
            seg_vec: shape (7,) binary vector [A,B,C,D,E,F,G]
        """
        # Convert BGR->RGB->GRAY
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)

        # CLAHE for contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray_eq = clahe.apply(gray)

        # Gentle denoise
        gray_blur = cv2.GaussianBlur(gray_eq, (3, 3), 0)

        # Adaptive threshold to emphasize segments
        binary = cv2.adaptiveThreshold(
            gray_blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )

        # Canny edges to capture segment boundaries
        edges = cv2.Canny(gray_blur, 50, 150)

        # Resize to model input
        H, W = self.input_shape[:2]
        gray_r = cv2.resize(gray_blur, (W, H), interpolation=cv2.INTER_AREA)
        bin_r = cv2.resize(binary, (W, H), interpolation=cv2.INTER_NEAREST)
        edg_r = cv2.resize(edges, (W, H), interpolation=cv2.INTER_NEAREST)

        # Normalize to [0,1]
        ch0 = gray_r.astype(np.float32) / 255.0
        ch1 = (bin_r > 127).astype(np.float32)  # keep strictly binary
        ch2 = edg_r.astype(np.float32) / 255.0
        img_proc = np.stack([ch0, ch1, ch2], axis=-1)

        # Compute 7-segment pseudo-labels from the resized binary image
        seg_vec = self._compute_segments_from_binary(ch1)
        return img_proc, seg_vec

    def _compute_segments_from_binary(self, bin_img: np.ndarray) -> np.ndarray:
        """Compute seven-segment activation from a binary image.

        Segments order: [A, B, C, D, E, F, G]
        """
        H, W = bin_img.shape
        def roi_mean(y0, y1, x0, x1):
            y0i, y1i = int(H * y0), int(H * y1)
            x0i, x1i = int(W * x0), int(W * x1)
            patch = bin_img[y0i:y1i, x0i:x1i]
            if patch.size == 0:
                return 0.0
            return float(patch.mean())

        # ROIs tuned for centered single digits; conservative widths
        A = roi_mean(0.08, 0.18, 0.22, 0.78)
        B = roi_mean(0.18, 0.45, 0.75, 0.90)
        C = roi_mean(0.55, 0.85, 0.75, 0.90)
        D = roi_mean(0.82, 0.92, 0.22, 0.78)
        E = roi_mean(0.55, 0.85, 0.10, 0.25)
        F = roi_mean(0.18, 0.45, 0.10, 0.25)
        G = roi_mean(0.45, 0.57, 0.22, 0.78)
        vec = np.array([A, B, C, D, E, F, G], dtype=np.float32)
        # Threshold a bit above 0.33 to resist light noise
        return (vec > 0.4).astype(np.float32)

    def load_dataset(self):
        print("Loading 2K dataset with structure-aware preprocessing…")
        images_dir = os.path.join(self.dataset_path, "images")
        if not os.path.isdir(images_dir):
            raise FileNotFoundError(f"Images path not found: {images_dir}")

        X, y, seg = [], [], []
        names = [f for f in os.listdir(images_dir) if f.lower().endswith((".png", ".jpg", ".jpeg"))]
        for fname in names:
            if not fname.startswith("seven_segment_"):
                continue
            try:
                digit = int(fname.split("_")[2])
            except Exception:
                continue
            img_path = os.path.join(images_dir, fname)
            img = cv2.imread(img_path, cv2.IMREAD_COLOR)
            if img is None:
                continue
            proc, seg_vec = self._preprocess_and_segments(img)
            X.append(proc)
            y.append(digit)
            seg.append(seg_vec)

        X = np.asarray(X, dtype=np.float32)
        y = np.asarray(y, dtype=np.int64)
        seg = np.asarray(seg, dtype=np.float32)
        print(f"Loaded {len(X)} samples; X shape {X.shape}, seg labels {seg.shape}")
        if len(X) == 0:
            raise RuntimeError("No images loaded. Check dataset path and naming.")

        # Report label distribution
        uniq, cnt = np.unique(y, return_counts=True)
        print("Label distribution:", dict(zip(uniq.tolist(), cnt.tolist())))
        return X, y, seg

    def split_dataset(self, X, y, seg, test_size=0.1, val_size=0.22):
        print("Splitting into train/val/test…")
        X_tmp, X_test, y_tmp, y_test, seg_tmp, seg_test = train_test_split(
            X, y, seg, test_size=test_size, random_state=42, stratify=y
        )
        X_train, X_val, y_train, y_val, seg_train, seg_val = train_test_split(
            X_tmp, y_tmp, seg_tmp, test_size=val_size, random_state=42, stratify=y_tmp
        )
        self.X_train, self.X_val, self.X_test = X_train, X_val, X_test
        self.y_train, self.y_val, self.y_test = y_train, y_val, y_test
        self.seg_train, self.seg_val, self.seg_test = seg_train, seg_val, seg_test
        print(f"Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")
        return (X_train, y_train, seg_train), (X_val, y_val, seg_val), (X_test, y_test, seg_test)

    # ----------------------------
    # Model
    # ----------------------------
    def build_model(self):
        print("Building custom CNN with SE blocks and auxiliary segment head…")
        inp = keras.Input(shape=self.input_shape)

        # Light denoise conv (acts as learnable smoothing)
        x = layers.Conv2D(32, 5, padding="same", strides=2, use_bias=False)(inp)
        x = layers.BatchNormalization()(x)
        x = layers.ReLU()(x)
        x = layers.MaxPooling2D(2)(x)

        def conv_block(x, filters, name):
            y = layers.Conv2D(filters, 3, padding="same", use_bias=False, name=name+"_c1")(x)
            y = layers.BatchNormalization(name=name+"_bn1")(y)
            y = layers.ReLU(name=name+"_r1")(y)
            y = layers.Conv2D(filters, 3, padding="same", use_bias=False, name=name+"_c2")(y)
            y = layers.BatchNormalization(name=name+"_bn2")(y)
            y = layers.ReLU(name=name+"_r2")(y)
            y = squeeze_excite_block(y, ratio=16, name=name+"_se")
            return layers.MaxPooling2D(2, name=name+"_pool")(y)

        x = conv_block(x, 64, "b1")
        x = conv_block(x, 128, "b2")
        x = conv_block(x, 128, "b3")

        x = layers.Conv2D(256, 3, padding="same", use_bias=False)(x)
        x = layers.BatchNormalization()(x)
        x = layers.ReLU()(x)
        feat = layers.GlobalAveragePooling2D()(x)

        # Digit classification head
        d = layers.Dense(256, activation="relu")(feat)
        d = layers.Dropout(0.35)(d)
        d = layers.Dense(128, activation="relu")(d)
        digit_out = layers.Dense(self.num_classes, activation="softmax", name="digit")(d)

        # Segment activation head (7 sigmoid outputs)
        s = layers.Dense(128, activation="relu")(feat)
        s = layers.Dropout(0.25)(s)
        s = layers.Dense(64, activation="relu")(s)
        seg_out = layers.Dense(7, activation="sigmoid", name="segments")(s)

        model = keras.Model(inputs=inp, outputs=[digit_out, seg_out], name="seven_segment_v3")

        losses = {
            "digit": tf.keras.losses.SparseCategoricalCrossentropy(),
            "segments": tf.keras.losses.BinaryCrossentropy()
        }
        loss_weights = {"digit": 1.0, "segments": 0.4}

        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=3e-4),
            loss=losses,
            loss_weights=loss_weights,
            metrics={"digit": ["accuracy"], "segments": [tf.keras.metrics.AUC(name="auc")]} 
        )

        self.model = model
        model.summary()
        return model

    # ----------------------------
    # Augmentation
    # ----------------------------
    @staticmethod
    def _augment_photometric(image: tf.Tensor, labels: tuple[tf.Tensor, tf.Tensor]):
        # labels tuple: (digit, seg)
        digit, seg = labels
        # Conservative photometric-only augmentations
        image = tf.image.random_brightness(image, max_delta=0.08)
        image = tf.image.random_contrast(image, lower=0.9, upper=1.1)
        # light noise
        noise = tf.random.normal(tf.shape(image), mean=0.0, stddev=0.02)
        image = tf.clip_by_value(image + noise, 0.0, 1.0)
        return image, (digit, seg)

    def _make_datasets(self, batch_size=32):
        train = tf.data.Dataset.from_tensor_slices((self.X_train, (self.y_train, self.seg_train)))
        val = tf.data.Dataset.from_tensor_slices((self.X_val, (self.y_val, self.seg_val)))
        test = tf.data.Dataset.from_tensor_slices((self.X_test, (self.y_test, self.seg_test)))

        train = train.shuffle(len(self.X_train), reshuffle_each_iteration=True)
        train = train.map(self._augment_photometric, num_parallel_calls=tf.data.AUTOTUNE)
        train = train.batch(batch_size).prefetch(tf.data.AUTOTUNE)
        val = val.batch(batch_size).prefetch(tf.data.AUTOTUNE)
        test = test.batch(batch_size).prefetch(tf.data.AUTOTUNE)
        return train, val, test

    # ----------------------------
    # Training / Evaluation
    # ----------------------------
    def train(self, epochs=25, batch_size=32):
        if self.model is None:
            self.build_model()
        train_ds, val_ds, _ = self._make_datasets(batch_size=batch_size)

        # Note: Skipping class weights for multi-output compatibility in this environment

        callbacks = [
            keras.callbacks.ModelCheckpoint(
                "seven_segment_2k_enhanced_v3_model.keras",
                monitor="val_digit_accuracy",
                save_best_only=True,
                mode="max",
                verbose=1,
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor="val_digit_loss", factor=0.5, patience=4, min_lr=1e-6, mode="min", verbose=1
            ),
            keras.callbacks.EarlyStopping(
                monitor="val_digit_accuracy", patience=8, restore_best_weights=True, mode="max", verbose=1
            ),
            keras.callbacks.CSVLogger("enhanced_v3_training_log.csv", append=False),
        ]

        hist = self.model.fit(
            train_ds,
            epochs=epochs,
            validation_data=val_ds,
            callbacks=callbacks,
            verbose=1,
        )

        # Convert history to plain dict
        self.history = {k: [float(v) for v in vals] for k, vals in hist.history.items()}
        # Persist
        with open("enhanced_training_results_v3.json", "w", encoding="utf-8") as f:
            json.dump(self.history, f, indent=2)
        return self.history

    def evaluate(self):
        if self.model is None:
            raise RuntimeError("Model not trained")
        _, _, test_ds = self._make_datasets(batch_size=64)
        # Evaluate classification head
        print("Evaluating v3 model…")
        y_true = self.y_test
        y_prob, _ = self.model.predict(test_ds, verbose=0)
        y_pred = np.argmax(y_prob, axis=1)
        acc = float(np.mean(y_true == y_pred))
        print(f"Test accuracy: {acc:.4f}")
        print("\nClassification Report (digits):")
        print(classification_report(y_true, y_pred, digits=4, zero_division=0))
        cm = confusion_matrix(y_true, y_pred)
        print("Confusion matrix:\n", cm)
        return {"test_accuracy": acc, "y_true": y_true.tolist(), "y_pred": y_pred.tolist()}

    def save(self, filepath: str | None = None):
        if filepath is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = f"seven_segment_2k_enhanced_v3_{timestamp}.keras"
        if self.model is not None:
            self.model.save(filepath)
            print("Saved:", filepath)


def main():
    v3 = EnhancedSevenSegmentCNN_2K_V3()
    try:
        X, y, seg = v3.load_dataset()
        v3.split_dataset(X, y, seg)
        v3.build_model()
        # Keep epochs modest for initial run; adjust upward later
        v3.train(epochs=12, batch_size=32)
        res = v3.evaluate()
        v3.save()
        print("\n== v3 training complete ==")
        print(f"Final test accuracy: {res['test_accuracy']:.4f}")
    except Exception as e:
        print("Error in v3 pipeline:", e)
        import traceback; traceback.print_exc()


if __name__ == "__main__":
    main()
