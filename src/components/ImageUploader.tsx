import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  disabled?: boolean;
}

export function ImageUploader({ onImageUpload, disabled = false }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (!disabled && files && files[0] && files[0].type.startsWith('image/')) {
        onImageUpload(files[0]);
      }
    },
    [disabled, onImageUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!disabled && files && files[0]) {
        onImageUpload(files[0]);
      }
    },
    [disabled, onImageUpload]
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative bg-white rounded-2xl shadow-md p-12 sm:p-16
          border-2 border-dashed transition-all duration-200
          ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-200 hover:border-emerald-300'
          }
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Upload className="w-8 h-8 text-emerald-600" />
          </div>
          
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            Drop your image here
          </h3>
          <p className="text-gray-600 mb-6">
            or click to browse from your device
          </p>

          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
              <Upload className="w-5 h-5" />
              <span className="font-medium">{disabled ? 'Model Loading...' : 'Choose File'}</span>
            </div>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              disabled={disabled}
              className="hidden"
            />
          </label>

          <p className="text-sm text-gray-500 mt-4">
            Supports JPG, PNG, GIF up to 10MB
          </p>
        </div>
      </div>
    </div>
  );
}
