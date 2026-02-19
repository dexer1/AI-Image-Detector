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
      {/* Success Header */}
      <div className="bg-emerald-50 rounded-2xl shadow-md p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Analysis Complete</h3>
            <p className="text-gray-600">Image successfully identified</p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="font-medium">New Image</span>
        </button>
      </div>

      {/* Main Results Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Image Preview Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Image</h4>
          <img
            src={imageUrl}
            alt="Analyzed"
            className="w-full h-64 object-cover rounded-lg"
          />
          <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
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

        {/* Confidence Scores Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Category Matches</h4>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {result.category}
                  </span>
                  <span className="text-sm font-semibold text-emerald-600">
                    {result.confidence}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
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

      {/* Additional Info Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-3xl font-bold text-emerald-600">{results.length}</p>
          <p className="text-sm text-gray-600 mt-1">Categories Detected</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-3xl font-bold text-emerald-600">
            {topResult.confidence}%
          </p>
          <p className="text-sm text-gray-600 mt-1">Top Confidence Score</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-3xl font-bold text-emerald-600">&lt;2s</p>
          <p className="text-sm text-gray-600 mt-1">Processing Time</p>
        </div>
      </div>
    </div>
  );
}
