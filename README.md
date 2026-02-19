# Minimalist AI Image Identifier

This is a code bundle for Minimalist AI Image Identifier. The original project is available at https://www.figma.com/design/w1yAnT4pcx25cQHMrDxKTS/Minimalist-AI-Image-Identifier.

## Run the connected app (frontend + your model)

1. Start the Python model API (Terminal 1):

```powershell
.\.venv\Scripts\python.exe api_server.py
```

2. Start the React app (Terminal 2):

```powershell
cmd /c npm run dev
```

3. Open the frontend URL shown by Vite (usually `http://127.0.0.1:3000`).

The frontend sends uploaded images to `http://127.0.0.1:8000/api/predict`, which uses `ai_noai_model.keras` for inference.

## Notes

- Model file path expected by API: `./ai_noai_model.keras`
- The API assumes training class folders were `ai` and `noai` (so model sigmoid output corresponds to `noai` probability).
