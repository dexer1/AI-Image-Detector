import base64
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO

import numpy as np
from PIL import Image
import tensorflow as tf

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "ai_noai_model.keras")
IMG_SIZE = (500, 500)
HOST = os.getenv("MODEL_API_HOST", "127.0.0.1")
PORT = int(os.getenv("MODEL_API_PORT", "8000"))


if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")


model = tf.keras.models.load_model(MODEL_PATH)


def _send_json(handler: BaseHTTPRequestHandler, status_code: int, payload: dict) -> None:
    response = json.dumps(payload).encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(response)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(response)


def _preprocess_image(image_base64: str) -> np.ndarray:
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    image_bytes = base64.b64decode(image_base64)
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    image = image.resize(IMG_SIZE)

    image_array = np.asarray(image, dtype=np.float32) / 255.0
    image_array = np.expand_dims(image_array, axis=0)
    return image_array


class PredictionHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:
        _send_json(self, 200, {"ok": True})

    def do_POST(self) -> None:
        if self.path != "/api/predict":
            _send_json(self, 404, {"error": "Route not found."})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            _send_json(self, 400, {"error": "Request body is empty."})
            return

        try:
            body = self.rfile.read(content_length)
            payload = json.loads(body)
            image_base64 = payload.get("imageBase64")

            if not isinstance(image_base64, str) or not image_base64.strip():
                _send_json(self, 400, {"error": "Field 'imageBase64' is required."})
                return

            image_tensor = _preprocess_image(image_base64)

            # Training was done with class folders ai/noai, so sigmoid output maps to noai.
            noai_probability = float(model.predict(image_tensor, verbose=0)[0][0])
            noai_probability = max(0.0, min(1.0, noai_probability))
            ai_probability = 1.0 - noai_probability

            result = {
                "ai_probability": ai_probability,
                "human_probability": noai_probability,
                "predicted_label": "AI Generated" if ai_probability >= noai_probability else "Likely Real",
                "confidence": max(ai_probability, noai_probability),
            }
            _send_json(self, 200, result)
        except json.JSONDecodeError:
            _send_json(self, 400, {"error": "Invalid JSON payload."})
        except Exception as exc:
            _send_json(self, 500, {"error": f"Prediction failed: {exc}"})

    def log_message(self, format: str, *args) -> None:
        return


if __name__ == "__main__":
    print(f"Loading model from: {MODEL_PATH}")
    print(f"Model API listening on http://{HOST}:{PORT}")
    server = ThreadingHTTPServer((HOST, PORT), PredictionHandler)
    server.serve_forever()
