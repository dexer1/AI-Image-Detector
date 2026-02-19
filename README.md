# AI Image Identifier

This project is now deployable as a single Netlify site.
Your trained model runs directly in the browser (no Python server required in production).

## How it works

- Model file: `public/model/model.onnx`
- Runtime: `onnxruntime-web`
- Inference happens in `src/App.tsx`

## Local run

```powershell
cmd /c npm run dev
```

Open `http://127.0.0.1:3000`

## Netlify deploy (single link for teacher)

1. Push your latest code to GitHub.
2. In Netlify, create site from that GitHub repo.
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
4. Deploy.

`netlify.toml` is already configured for SPA routing.

## Railway deploy (if you use Railway UI)

1. Push latest `main`.
2. In Railway, redeploy from GitHub.
3. Ensure it detects Node (not Python).
4. It should run:
   - Build: `npm run build`
   - Start: `npm start`

`requirements.txt` and `Procfile` were removed on purpose so Railway does not try to install TensorFlow.

## Notes

- No backend or API URL is required for deployed usage.
- The model file is bundled as a static asset from `public/model/model.onnx`.
- First prediction may take longer because the model is loaded in the browser.

## Optional: regenerate ONNX model from `.keras`

This was used to convert your model:

```powershell
.\.venv_convert\Scripts\python.exe -c "import tensorflow as tf, tf2onnx; m=tf.keras.models.load_model('ai_noai_model.keras'); m.output_names=[o.name.split(':')[0] for o in m.outputs]; spec=(tf.TensorSpec((None,500,500,3), tf.float32, name='input'),); tf2onnx.convert.from_keras(m, input_signature=spec, opset=13, output_path='public/model/model.onnx'); print('onnx exported')"
```
