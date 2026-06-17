import { useState, useCallback, useRef } from 'react';
import { useXProcessor } from '@/hooks/useXProcessor';
import { validateImageFile } from '@lib/imageUtils';

export function XToolPage() {
  const { status, result, error, processImage, reset } = useXProcessor();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    setOriginalName(file.name);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    await processImage(file);
  }, [processImage]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDownload = useCallback(() => {
    if (!result?.blob) return;

    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `x-tool-${originalName.replace(/\.[^/.]+$/, '')}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, [result, originalName]);

  const handleReset = useCallback(() => {
    reset();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setOriginalName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [reset, previewUrl]);

  return (
    <div className="min-h-screen bg-base-100">
      <header className="bg-base-200 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-primary">
            X Tool - 縮放消失點
          </h1>
          <p className="mt-2 text-base-content/70">
            上傳圖片，產生 X 平台專用的透明棋盤格圖片 (自動壓縮至 1MB 以內)
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {(status === 'idle' && !result) && (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              isDragging ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="space-y-4">
              <svg
                className="w-16 h-16 mx-auto text-base-content"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div>
                <p className="text-lg font-medium text-base-content">
                  點擊或拖曳上傳圖片
                </p>
                <p className="text-sm text-base-content/70 mt-1">
                  支援 JPEG, PNG, WebP (最大 10MB). 自動壓縮至 1MB 以內
                </p>
              </div>
            </div>
          </div>
        )}

        {status === 'processing' && (
          <div className="text-center py-12">
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <p className="mt-4 text-lg text-base-content">處理中...</p>
            <p className="text-sm text-base-content/70">正在進行色彩量化與棋盤格處理</p>
          </div>
        )}

        {status === 'error' && (
          <div className="alert alert-error max-w-md mx-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>處理失敗: {error}</span>
          </div>
        )}

        {status === 'done' && result && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-base-content">處理結果</h2>
              <div className="space-x-2">
                <button className="btn btn-primary" onClick={handleDownload}>
                  下載圖片
                </button>
                <button className="btn btn-ghost" onClick={handleReset}>
                  重新上傳
                </button>
              </div>
            </div>

            {result.sizeInMB && (
              <div className="alert alert-success">
                <span>檔案大小: {result.sizeInMB} MB (已壓縮至 1MB 以內)</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {previewUrl && (
                <div className="card bg-base-200 shadow-xl">
                  <div className="card-body">
                    <h3 className="card-title text-base-content">原始圖片</h3>
                    <div className="rounded-lg overflow-hidden">
                      <img
                        src={previewUrl}
                        alt="Original"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                    {result.width && result.height && (
                      <p className="text-sm text-base-content/70">
                        {result.width} x {result.height} px
                      </p>
                    )}
                  </div>
                </div>
              )}

              {result.previewUrl && (
                <div className="card bg-base-200 shadow-xl">
                  <div className="card-body">
                    <h3 className="card-title text-base-content">X 平台處理結果</h3>
                    <div
                      className="rounded-lg overflow-hidden"
                      style={{
                        backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                      }}
                    >
                      <img
                        src={result.previewUrl}
                        alt="Processed"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                    <p className="text-sm text-base-content/70">
                      棋盤格背景表示透明區域
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-base-content">效果說明</h3>
                <div className="space-y-2 text-base-content/80">
                  <p>
                    <strong className="text-primary">棋盤格原理：</strong>
                    原圖像素與透明像素交錯排列
                  </p>
                  <p>
                    <strong className="text-primary">縮放效果：</strong>
                    當 X 平台進行縮圖時，相鄰的透明與原圖像素會被平均化，導致圖片看起來模糊或消失
                  </p>
                  <p>
                    <strong className="text-primary">原圖效果：</strong>
                    點擊放大後，由於取樣點剛好落在原圖像素上，可以正常顯示
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
