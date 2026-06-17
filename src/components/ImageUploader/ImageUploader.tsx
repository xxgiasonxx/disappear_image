import { useRef, useState, useCallback } from 'react';
import { validateFileSize } from '@utils/validation';
import type { ImageDataTyped } from '@lib/types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ImageUploaderProps {
  onImageLoaded?: (imageData: ImageDataTyped, dataUrl: string) => void;
}

export function ImageUploader({ onImageLoaded }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    if (!validateFileSize(file)) {
      setError('File size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Failed to create canvas context');
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        onImageLoaded?.(
          {
            width: img.width,
            height: img.height,
            pixels: imageData.data,
          },
          dataUrl
        );
      };

      img.onerror = () => {
        setError('Failed to load image');
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsDataURL(file);
  }, [onImageLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragging
          ? 'border-primary bg-primary/10'
          : 'border-base-300 hover:border-primary/50'
      } ${error ? 'border-error' : ''}`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />

      <div className="space-y-2">
        <svg
          className="w-12 h-12 mx-auto text-base-content"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 16v-1a2 2 0 012-2h8a2 2 0 012 2v1m-4 4V5"
          />
        </svg>

        <p className="text-base-content">
          Drop an image here or click to select
        </p>
        <p className="text-sm text-base-content/60">
          JPEG, PNG, WebP up to 10MB
        </p>
      </div>

      {error && (
        <p className="mt-4 text-sm text-error">{error}</p>
      )}
    </div>
  );
}