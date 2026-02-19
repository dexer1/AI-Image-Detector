import React, { useState } from 'react';
import { Upload, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from './components/ImageUploader';
import { ProgressBar } from './components/ProgressBar';
import { ResultDashboard } from './components/ResultDashboard';

interface AnalysisResult {
  category: string;
  confidence: number;
  color: string;
}

interface PredictionResponse {
  ai_probability: number;
  human_probability: number;
}

const MODEL_API_URL = 'http://127.0.0.1:8000/api/predict';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImageUpload = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setResults(null);
    setErrorMessage(null);
    setIsScanning(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        return prev + 2.5;
      });
    }, 50);

    try {
      const imageBase64 = await fileToDataUrl(file);
      const response = await fetch(MODEL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!response.ok) {
        throw new Error(`Prediction request failed with status ${response.status}.`);
      }

      const prediction: PredictionResponse = await response.json();
      const aiConfidence = Number((prediction.ai_probability * 100).toFixed(1));
      const humanConfidence = Number((prediction.human_probability * 100).toFixed(1));

      setResults(
        [
          { category: 'AI Generated', confidence: aiConfidence, color: '#10b981' },
          { category: 'Likely Real', confidence: humanConfidence, color: '#cbd5e1' },
        ].sort((a, b) => b.confidence - a.confidence)
      );
      setProgress(100);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${error.message} Make sure the Python model API is running on http://127.0.0.1:8000.`
          : 'Prediction failed. Make sure the Python model API is running on http://127.0.0.1:8000.'
      );
      setUploadedImage(null);
      setProgress(0);
    } finally {
      clearInterval(interval);
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setResults(null);
    setErrorMessage(null);
    setIsScanning(false);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">AI Image Identifier</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="text-center mb-12 sm:mb-14">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
            Identify Anything
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload an image and let our AI analyze and identify objects, scenes, and categories with precision.
          </p>
        </div>

        {errorMessage && (
          <div className="max-w-3xl mx-auto mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {!uploadedImage && <ImageUploader onImageUpload={handleImageUpload} />}

        {isScanning && uploadedImage && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <img
                src={uploadedImage}
                alt="Uploaded"
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
              <ProgressBar progress={progress} />
            </div>
          </div>
        )}

        {results && uploadedImage && !isScanning && (
          <ResultDashboard
            results={results}
            imageUrl={uploadedImage}
            onReset={handleReset}
          />
        )}

        {!uploadedImage && (
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mt-16 sm:mt-20 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-7 hover:shadow-lg transition-shadow border border-gray-100">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Upload</h3>
              <p className="text-gray-600">
                Simply drag and drop your images or click to browse from your device.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-7 hover:shadow-lg transition-shadow border border-gray-100">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Accurate Results</h3>
              <p className="text-gray-600">
                Get detailed confidence scores and multiple category predictions.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-7 hover:shadow-lg transition-shadow border border-gray-100">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Analysis</h3>
              <p className="text-gray-600">
                Watch as our AI processes your image and identifies patterns instantly.
              </p>
            </div>
          </div>
        )}
      </main>

      <div className="h-10" />
    </div>
  );
}
