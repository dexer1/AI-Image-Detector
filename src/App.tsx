import React, { useEffect, useState } from 'react';
import * as ort from 'onnxruntime-web';
import { Upload, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from './components/ImageUploader';
import { ProgressBar } from './components/ProgressBar';
import { ResultDashboard } from './components/ResultDashboard';

interface AnalysisResult {
  key: 'ai' | 'real';
  category: string;
  confidence: number;
  color: string;
}

interface ImageHistoryItem {
  id: number;
  imageUrl: string;
  category: string;
  confidence: number;
  analyzedAt: string;
}

const MODEL_PATH = '/model/model.onnx';
const MODEL_IMAGE_SIZE = 500;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getCategoryLabel(
  key: 'ai' | 'real',
  confidence: number,
  gap: number
): string {
  const baseLabel = key === 'ai' ? 'AI Generated' : 'Real Image';
  const isDefinite = confidence >= 80 || gap >= 25;
  return `${isDefinite ? 'Definitely' : 'Likely'} ${baseLabel}`;
}

function preprocessImage(bitmap: ImageBitmap): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = MODEL_IMAGE_SIZE;
  canvas.height = MODEL_IMAGE_SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create image processing context.');
  }

  ctx.drawImage(bitmap, 0, 0, MODEL_IMAGE_SIZE, MODEL_IMAGE_SIZE);
  const imageData = ctx.getImageData(0, 0, MODEL_IMAGE_SIZE, MODEL_IMAGE_SIZE);

  const rgb = new Float32Array(MODEL_IMAGE_SIZE * MODEL_IMAGE_SIZE * 3);
  for (let src = 0, dst = 0; src < imageData.data.length; src += 4) {
    rgb[dst++] = imageData.data[src] / 255;
    rgb[dst++] = imageData.data[src + 1] / 255;
    rgb[dst++] = imageData.data[src + 2] / 255;
  }

  return rgb;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image to data URL.'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [session, setSession] = useState<ort.InferenceSession | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      try {
        const modelSession = await ort.InferenceSession.create(MODEL_PATH, {
          executionProviders: ['wasm'],
        });

        if (!isMounted) return;
        setSession(modelSession);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error
            ? `Model load failed: ${error.message}`
            : 'Model load failed. Make sure /model/model.onnx is deployed.'
        );
      } finally {
        if (isMounted) {
          setIsModelLoading(false);
        }
      }
    };

    loadModel();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('aiImageHistory');
      if (stored) {
        const parsed: ImageHistoryItem[] = JSON.parse(stored);
        setImageHistory(parsed.slice(0, 10));
      }
    } catch {
      // ignore malformed localStorage
    }
  }, []);

  const handleImageUpload = async (file: File) => {
    if (!session) {
      setErrorMessage('Model is not ready yet. Please wait a moment and try again.');
      return;
    }

    const imageUrl = await fileToDataUrl(file);
    setUploadedImage(imageUrl);
    setResults(null);
    setErrorMessage(null);
    setIsScanning(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= 92) return prev;
        return prev + 2.5;
      });
    }, 50);

    try {
      const bitmap = await createImageBitmap(file);
      const inputData = preprocessImage(bitmap);
      bitmap.close();

      const inputTensor = new ort.Tensor('float32', inputData, [1, MODEL_IMAGE_SIZE, MODEL_IMAGE_SIZE, 3]);
      const output = await session.run({ [session.inputNames[0]]: inputTensor });
      const outputTensor = output[session.outputNames[0]];

      if (!outputTensor || !outputTensor.data || outputTensor.data.length === 0) {
        throw new Error('Model returned empty output.');
      }

      const noAiProbability = clamp01(Number(outputTensor.data[0]));
      const aiProbability = clamp01(1 - noAiProbability);

      const aiConfidence = Number((aiProbability * 100).toFixed(1));
      const realConfidence = Number((noAiProbability * 100).toFixed(1));
      const confidenceGap = Math.abs(aiConfidence - realConfidence);

      const sortedResults = [
        {
          key: 'ai' as const,
          category: getCategoryLabel('ai', aiConfidence, confidenceGap),
          confidence: aiConfidence,
          color: '#10b981',
        },
        {
          key: 'real' as const,
          category: getCategoryLabel('real', realConfidence, confidenceGap),
          confidence: realConfidence,
          color: '#cbd5e1',
        },
      ].sort((a, b) => b.confidence - a.confidence);

      setResults(sortedResults);
      setShowPopup(true);
      setProgress(100);

      const newHistoryItem: ImageHistoryItem = {
        id: Date.now(),
        imageUrl,
        category: sortedResults[0].category,
        confidence: sortedResults[0].confidence,
        analyzedAt: new Date().toLocaleString(),
      };

      setImageHistory((prevHistory) => {
        const nextHistory = [newHistoryItem, ...prevHistory].slice(0, 10);
        localStorage.setItem('aiImageHistory', JSON.stringify(nextHistory));
        return nextHistory;
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Prediction failed: ${error.message}`
          : 'Prediction failed. Please try another image.'
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
    setShowPopup(false);
    setErrorMessage(null);
    setIsScanning(false);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">AI Image Detector</h1>
            </div>
            <p className="hidden md:block text-sm text-gray-500">Upload an image and detect whether it is AI-generated.</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="text-center mb-12 sm:mb-14">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
            Detect AI in Images
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload an image to check if it was generated by AI.
          </p>
          {isModelLoading && (
            <p className="text-sm text-emerald-700 mt-4">Loading local ML model...</p>
          )}
        </div>

        {errorMessage && (
          <div className="max-w-3xl mx-auto mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {!uploadedImage && <ImageUploader onImageUpload={handleImageUpload} disabled={isModelLoading || !session} />}

        {!uploadedImage && imageHistory.length > 0 && (
          <section className="max-w-6xl mx-auto mt-12">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xl font-bold text-gray-900">Recent Analyses</h2>
              <button
                onClick={() => {
                  setImageHistory([]);
                  localStorage.removeItem('aiImageHistory');
                }}
                className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
              >
                Clear History
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {imageHistory.map((item) => (
                <div key={item.id} className="group relative flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="aspect-video w-full overflow-hidden bg-gray-50 relative">
                    <img src={item.imageUrl} alt={`History ${item.id}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 truncate" title={item.category}>{item.category}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.category.includes('AI') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{Math.round(item.confidence)}%</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-auto">{item.analyzedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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

        {results && uploadedImage && !isScanning && !showPopup && (
          <ResultDashboard
            results={results}
            imageUrl={uploadedImage}
            onReset={handleReset}
          />
        )}

        {showPopup && results && uploadedImage && !isScanning && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center py-6">
              <div className="w-full max-w-4xl rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
                    Analysis Result
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-gray-900">Final Prediction</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Review the uploaded image and the model's confidence scores in one place.
                  </p>
                </div>
                <button
                  onClick={() => setShowPopup(false)}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-gray-200 px-5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Close
                </button>
              </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
                  <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-gray-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <div className="flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-sm">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Uploaded Image</p>
                        <p className="text-xs text-gray-500">Preview used for this detection</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Ready
                      </span>
                    </div>
                    <div className="bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_48%)] p-4 sm:p-5">
                      <img
                        src={uploadedImage}
                        alt="Analyzed image preview"
                        className="h-[180px] w-full rounded-[20px] bg-white object-contain shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:h-[240px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-6 text-gray-900 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                            Top Result
                          </p>
                          <h4 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
                            {results[0]?.category}
                          </h4>
                          <p className="mt-2 max-w-xl text-sm text-gray-600">
                            This is the strongest prediction from the current model.
                          </p>
                        </div>
                        <div className="inline-flex min-w-[120px] flex-col rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-right shadow-sm">
                          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
                            Confidence
                          </span>
                          <span className="mt-1 text-4xl font-bold text-emerald-600">
                            {Math.round(results[0]?.confidence ?? 0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Score Breakdown
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        {results.map((result, index) => (
                          <div
                            key={index}
                            className={`rounded-2xl border p-4 transition-all ${
                              index === 0
                                ? 'border-emerald-200 bg-emerald-50 shadow-sm'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-base font-semibold text-gray-900">{result.category}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">
                                  {index === 0 ? 'Primary match' : 'Secondary match'}
                                </p>
                              </div>
                              <span className={`text-lg font-bold ${index === 0 ? 'text-emerald-600' : 'text-gray-700'}`}>
                                {result.confidence}%
                              </span>
                            </div>
                            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white shadow-inner">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${result.confidence}%`,
                                  background: index === 0
                                    ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                                    : 'linear-gradient(90deg, #94a3b8 0%, #cbd5e1 100%)',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        onClick={() => setShowPopup(false)}
                        className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Back to Results
                      </button>
                      <button
                        onClick={() => { setShowPopup(false); handleReset(); }}
                        className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
                      >
                        New Analysis
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Detection</h3>
              <p className="text-gray-600">
                See the result in seconds with a quick AI image check.
              </p>
            </div>
          </div>
        )}
      </main>

      <div className="h-10" />
    </div>
  );
}
