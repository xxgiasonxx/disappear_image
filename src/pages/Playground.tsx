import { useState, useCallback, useRef } from 'react';
import { useXProcessor } from '@/hooks/useXProcessor';
import { useBruteForceProcessor } from '@/hooks/useBruteForceProcessor';
import { validateImageFile } from '@lib/imageUtils';

type AlgorithmType = 'analytical' | 'brute-force';

export function Playground() {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('analytical');
  
  const { status, result, error, processImage, reset } = useXProcessor();
  const bruteForce = useBruteForceProcessor();
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeStatus = algorithm === 'brute-force' ? bruteForce.status : status;
  const activeResult = algorithm === 'brute-force' ? bruteForce.result : result;
  const activeError = algorithm === 'brute-force' ? bruteForce.error : error;
  const activeProcessImage = algorithm === 'brute-force' ? bruteForce.processImage : processImage;
  const activeReset = algorithm === 'brute-force' ? bruteForce.reset : reset;

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setProcessingError(validationError);
      return;
    }

    setProcessingError(null);
    setOriginalName(file.name);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    await activeProcessImage(file);
  }, [activeProcessImage]);

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

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDownload = useCallback(() => {
    if (!activeResult?.blob) return;

    const url = URL.createObjectURL(activeResult.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `playground-${algorithm}-${originalName.replace(/\.[^/.]+$/, '')}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeResult, originalName, algorithm]);

  const handleReset = useCallback(() => {
    activeReset();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setOriginalName('');
    setProcessingError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [activeReset, previewUrl]);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold text-center mb-2">Playground</h1>
      <p className="text-center text-gray-400 mb-8">抗重採樣隱寫術實驗區</p>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Upload Area */}
          <div className="space-y-6">
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">上傳圖片</h2>
              
              {activeStatus === 'idle' && !previewUrl && (
                <label className="block cursor-pointer">
                  <div
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
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
                        className="w-16 h-16 mx-auto text-gray-400"
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
                        <p className="text-lg font-medium text-gray-700">
                          點擊或拖曳上傳圖片
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          支援 JPEG, PNG, WebP (最大 10MB)
                        </p>
                      </div>
                    </div>
                  </div>
                </label>
              )}

              {processingError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{processingError}</p>
                </div>
              )}

              {previewUrl && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-auto object-contain max-h-64 mx-auto"
                    />
                  </div>
                  <button
                    onClick={handleReset}
                    className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    重新上傳
                  </button>
                </div>
              )}
            </div>

            {/* Algorithm Selection */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">選擇演算法</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                    algorithm === 'analytical'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setAlgorithm('analytical')}
                >
                  優化解 (Analytical)
                  <span className="block text-xs mt-1 opacity-75">快速</span>
                </button>
                <button
                  className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                    algorithm === 'brute-force'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setAlgorithm('brute-force')}
                >
                  暴力解 (Brute Force)
                  <span className="block text-xs mt-1 opacity-75">完整搜索</span>
                </button>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                暴力解會嘗試所有 40 種 (8 scale × 5 colors) 參數組合，確保找到最優解
              </p>
            </div>
          </div>

          {/* Right Column - Result */}
          <div className="space-y-6">
            {activeStatus === 'processing' && (
              <div className="border rounded-lg p-12 text-center">
                <div className="loading loading-spinner loading-lg text-blue-600 mx-auto"></div>
                <p className="mt-4 text-lg text-gray-700">
                  {algorithm === 'brute-force' ? '暴力解處理中...' : '處理中...'}
                </p>
                <p className="text-sm text-gray-500">
                  {algorithm === 'brute-force' 
                    ? '正在遍歷 40 種參數組合，請稍候'
                    : '正在進行色彩量化與棋盤格處理'}
                </p>
              </div>
            )}

            {activeStatus === 'error' && activeError && (
              <div className="border rounded-lg p-6 bg-red-50 border-red-200">
                <div className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-red-700">處理失敗: {activeError}</span>
                </div>
              </div>
            )}

            {activeStatus === 'done' && activeResult && (
              <div className="space-y-6">
                {activeResult.sizeInMB && (
                  <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                    <p className="text-green-700">
                      檔案大小: {activeResult.sizeInMB} MB | 
                      方法: {algorithm === 'brute-force' ? '暴力解' : '優化解'}
                    </p>
                  </div>
                )}

                <div className="border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">處理結果</h2>
                    <div className="space-x-2">
                      <button
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        onClick={handleDownload}
                      >
                        下載圖片
                      </button>
                    </div>
                  </div>

                  {activeResult.previewUrl && (
                    <div
                      className="border rounded-lg overflow-hidden"
                      style={{
                        backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                      }}
                    >
                      <img
                        src={activeResult.previewUrl}
                        alt="Processed"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  )}

                  <p className="mt-4 text-sm text-gray-600">
                    棋盤格背景表示透明區域
                  </p>
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">效果說明</h3>
                  <div className="space-y-3 text-gray-700">
                    <p>
                      <strong className="text-blue-600">棋盤格原理：</strong>
                      原圖像素與透明像素交錯排列
                    </p>
                    <p>
                      <strong className="text-blue-600">縮放效果：</strong>
                      當 X 平台進行縮圖時，相鄰的透明與原圖像素會被平均化，導致圖片看起來模糊或消失
                    </p>
                    <p>
                      <strong className="text-blue-600">原圖效果：</strong>
                      點擊放大後，由於取樣點剛好落在原圖像素上，可以正常顯示
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeStatus === 'idle' && !previewUrl && (
              <div className="border rounded-lg p-12 text-center">
                <p className="text-gray-400">上傳圖片以開始處理</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}