import React from 'react';
import { CheckCircle, RefreshCw } from 'lucide-react';

interface AnalysisResult {
  category: string;
  confidence: number;
  color: string;
}

interface ResultDashboardProps {
  results: AnalysisResult[];
  imageUrl: string;
  onReset: () => void;
}

export function ResultDashboard({ results, imageUrl, onReset }: ResultDashboardProps) {
  const topResult = results[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-6 shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Analysis Complete</h3>
            <p className="text-gray-600">Your image has been checked for AI generation.</p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-emerald-600 transition-colors hover:bg-emerald-50"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="font-medium">New Image</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Image</h4>
          <div className="rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_52%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-4">
            <img
              src={imageUrl}
              alt="Analyzed"
              className="w-full h-48 rounded-xl bg-white object-contain shadow-sm sm:h-56"
            />
          </div>
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Primary Match</span>
              <span className="text-2xl font-bold text-emerald-600">
                {topResult.confidence}%
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {topResult.category}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Category Matches</h4>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className={`space-y-2 rounded-xl border p-4 ${index === 0 ? 'border-emerald-200 bg-emerald-50/70' : 'border-gray-200 bg-gray-50/80'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {result.category}
                  </span>
                  <span className={`text-sm font-semibold ${index === 0 ? 'text-emerald-600' : 'text-gray-700'}`}>
                    {result.confidence}%
                  </span>
                </div>
                <div className="w-full h-2.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${result.confidence}%`,
                      backgroundColor: result.color,
                      transitionDelay: `${index * 100}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-md">
          <p className="text-3xl font-bold text-emerald-600">{results.length}</p>
          <p className="text-sm text-gray-600 mt-1">Results Compared</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-md">
          <p className="text-3xl font-bold text-emerald-600">
            {topResult.confidence}%
          </p>
          <p className="text-sm text-gray-600 mt-1">Top Confidence Score</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-md">
          <p className="text-3xl font-bold text-emerald-600">&lt;2s</p>
          <p className="text-sm text-gray-600 mt-1">Processing Time</p>
        </div>
      </div>
    </div>
  );
}
