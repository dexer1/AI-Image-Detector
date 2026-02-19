import os
import sys
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.preprocessing.image import ImageDataGenerator

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SCRIPT_DIR, 'dataset')
IMG_SIZE = (500, 500)
BATCH_SIZE = 4 
EPOCHS = 20

if not os.path.exists(DATA_PATH):
    os.makedirs(os.path.join(DATA_PATH, 'ai'), exist_ok=True)
    os.makedirs(os.path.join(DATA_PATH, 'noai'), exist_ok=True)
    print(f"Створено {DATA_PATH} з підпапками 'ai' та 'noai'. Додайте зображення і запустіть знову.")
    exit()
datagen = ImageDataGenerator(
    rescale=1./255,          
    rotation_range=40,       
    width_shift_range=0.2,    
    height_shift_range=0.2,   
    shear_range=0.2,          
    zoom_range=0.2,           
    horizontal_flip=True,    
    fill_mode='nearest',
    validation_split=0.2      
)

train_generator = datagen.flow_from_directory(
    DATA_PATH,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary',
    subset='training'
)
validation_generator = datagen.flow_from_directory(
    DATA_PATH,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary',
    subset='validation'
)
base_model = tf.keras.applications.MobileNetV2(
    input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
    include_top=False,
    weights='imagenet',
    pooling='avg'
)
base_model.trainable = False

model = models.Sequential([
    base_model,
    layers.Dropout(0.2),
    layers.Dense(1, activation='sigmoid')
])


model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
    loss='binary_crossentropy',
    metrics=['accuracy']
)
print(model.summary())

history = model.fit(
    train_generator,
    epochs=EPOCHS,
    validation_data=validation_generator
)

model.save('ai_noai_model.keras')
print("Модель збережено в ai_noai_model.keras")
