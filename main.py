import os
import sys

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SCRIPT_DIR, "dataset")
TRAIN_PATH = os.path.join(DATA_PATH, "train")
TEST_PATH = os.path.join(DATA_PATH, "test")
MODEL_PATH = os.path.join(SCRIPT_DIR, "ai_noai_model.keras")
BEST_MODEL_PATH = os.path.join(SCRIPT_DIR, "ai_noai_model_best.keras")

IMG_SIZE = (32, 32)
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "128"))
EPOCHS = int(os.getenv("EPOCHS", "15"))
AUTOTUNE = tf.data.AUTOTUNE


def ensure_dataset_structure() -> None:
    if not os.path.exists(DATA_PATH):
        os.makedirs(os.path.join(TRAIN_PATH, "fake"), exist_ok=True)
        os.makedirs(os.path.join(TRAIN_PATH, "real"), exist_ok=True)
        os.makedirs(os.path.join(TEST_PATH, "fake"), exist_ok=True)
        os.makedirs(os.path.join(TEST_PATH, "real"), exist_ok=True)
        print(
            f"Created {DATA_PATH} with train/test splits and 'fake'/'real' class folders. "
            "Add images and run the script again."
        )
        raise SystemExit(0)

    expected_dirs = [
        os.path.join(TRAIN_PATH, "fake"),
        os.path.join(TRAIN_PATH, "real"),
        os.path.join(TEST_PATH, "fake"),
        os.path.join(TEST_PATH, "real"),
    ]
    missing_dirs = [path for path in expected_dirs if not os.path.isdir(path)]
    if missing_dirs:
        missing_list = "\n".join(missing_dirs)
        raise FileNotFoundError(f"Missing dataset folders:\n{missing_list}")


def load_dataset(directory: str, shuffle: bool) -> tf.data.Dataset:
    return tf.keras.utils.image_dataset_from_directory(
        directory,
        labels="inferred",
        label_mode="binary",
        color_mode="rgb",
        batch_size=BATCH_SIZE,
        image_size=IMG_SIZE,
        shuffle=shuffle,
        interpolation="nearest",
    )


def build_model() -> tf.keras.Model:
    return models.Sequential(
        [
            layers.Input(shape=(IMG_SIZE[0], IMG_SIZE[1], 3)),
            layers.Rescaling(1.0 / 255.0),
            layers.RandomFlip("horizontal"),
            layers.RandomTranslation(0.08, 0.08),
            layers.Conv2D(32, 3, padding="same", activation="relu"),
            layers.MaxPooling2D(),
            layers.Conv2D(64, 3, padding="same", activation="relu"),
            layers.MaxPooling2D(),
            layers.Conv2D(128, 3, padding="same", activation="relu"),
            layers.GlobalAveragePooling2D(),
            layers.Dropout(0.25),
            layers.Dense(64, activation="relu"),
            layers.Dense(1, activation="sigmoid"),
        ]
    )


def evaluate_predictions(
    model: tf.keras.Model, dataset: tf.data.Dataset
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    probabilities = model.predict(dataset, verbose=0).reshape(-1)
    predicted_labels = (probabilities >= 0.5).astype(np.int32)
    true_labels = np.concatenate([labels.numpy().reshape(-1) for _, labels in dataset]).astype(np.int32)
    return probabilities, predicted_labels, true_labels


def print_classification_metrics(
    predicted_labels: np.ndarray, true_labels: np.ndarray, class_names: list[str]
) -> None:
    confusion = tf.math.confusion_matrix(true_labels, predicted_labels, num_classes=2).numpy()
    tn, fp, fn, tp = confusion.ravel()

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1_score = (
        2 * precision * recall / (precision + recall)
        if (precision + recall)
        else 0.0
    )

    print("Confusion matrix:")
    print(f"  true_{class_names[0]} predicted_{class_names[0]}: {tn}")
    print(f"  true_{class_names[0]} predicted_{class_names[1]}: {fp}")
    print(f"  true_{class_names[1]} predicted_{class_names[0]}: {fn}")
    print(f"  true_{class_names[1]} predicted_{class_names[1]}: {tp}")
    print(f"Precision ({class_names[1]}): {precision:.4f}")
    print(f"Recall ({class_names[1]}): {recall:.4f}")
    print(f"F1 score ({class_names[1]}): {f1_score:.4f}")


def main() -> None:
    ensure_dataset_structure()

    train_dataset = load_dataset(TRAIN_PATH, shuffle=True)
    test_dataset = load_dataset(TEST_PATH, shuffle=False)

    class_names = train_dataset.class_names
    print(f"Detected classes: {class_names}")

    train_dataset = train_dataset.cache().prefetch(AUTOTUNE)
    test_dataset = test_dataset.cache().prefetch(AUTOTUNE)

    model = build_model()
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )
    print(model.summary())

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=3,
            restore_best_weights=True,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=2,
            min_lr=1e-5,
        ),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=BEST_MODEL_PATH,
            monitor="val_accuracy",
            mode="max",
            save_best_only=True,
        ),
    ]

    history = model.fit(
        train_dataset,
        epochs=EPOCHS,
        validation_data=test_dataset,
        callbacks=callbacks,
        verbose=2,
    )

    final_train_accuracy = history.history["accuracy"][-1]
    final_val_accuracy = history.history["val_accuracy"][-1]
    print(f"Final train accuracy: {final_train_accuracy:.4f}")
    print(f"Final validation accuracy: {final_val_accuracy:.4f}")

    _, predicted_labels, true_labels = evaluate_predictions(model, test_dataset)
    print_classification_metrics(predicted_labels, true_labels, class_names)

    model.save(MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")
    print(f"Best model saved to {BEST_MODEL_PATH}")


if __name__ == "__main__":
    main()
