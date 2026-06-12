import { useState, useCallback } from 'react';
import type { StegoConfig, AlgorithmType, InterpolationKernel, TargetPlatform } from '@lib/types';
import { PLATFORM_CONFIGS } from '@lib/types';
import { downsampleImage, calculateTargetSize } from '@lib/interpolation';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { loadImageToPixels, pixelsToDataUrl } from '@lib/imageUtils';

function createImageState(pixels: Uint8ClampedArray, width: number, height: number) {
  return { pixels, width, height, dataUrl: pixelsToDataUrl(pixels, width, height) };
}

export function Playground() {
  const [carrierImage, setCarrierImage] = useState<{ pixels: Uint8ClampedArray; width: number; height: number; dataUrl: string } | null>(null);
  const [secretImage, setSecretImage] = useState<{ pixels: Uint8ClampedArray; width: number; height: number; dataUrl: string } | null>(null);
  const [secretSource, setSecretSource] = useState<'upload' | 'black' | 'white'>('upload');

  const [targetPlatform, setTargetPlatform] = useState<TargetPlatform>('discord');
  const [activeTier, setActiveTier] = useState<string>('2048');
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('analytical');
  const [interpolationKernel, setInterpolationKernel] = useState<InterpolationKernel>('bilinear');
  const [strength, setStrength] = useState(1.0);
  const [tileSize, setTileSize] = useState(128);
  
  const [error, setError] = useState<string | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);

  const { processImage, status, progress, result, elapsedTime, cancelProcessing } = useImageProcessor();

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: 'carrier' | 'secret') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError(`${type === 'carrier' ? '載體' : '祕密'}圖片必須小於 10MB`);
      return;
    }

    try {
      setError(null);
      const result = await loadImageToPixels(file);
      const state = createImageState(result.pixels, result.width, result.height);
      if (type === 'carrier') {
        setCarrierImage(state);
      } else {
        setSecretImage(state);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入圖片失敗');
    }
  }, []);

  // Helper: generate solid color secret image matching carrier dimensions
  const getSecretImage = useCallback(() => {
    if (!carrierImage) return null;

    if (secretSource === 'upload') {
      return secretImage;
    }

    const pixels = new Uint8ClampedArray(carrierImage.width * carrierImage.height * 4);
    const value = secretSource === 'black' ? 0 : 255;
    for (let i = 0; i < carrierImage.width * carrierImage.height; i++) {
      pixels[i * 4] = value;
      pixels[i * 4 + 1] = value;
      pixels[i * 4 + 2] = value;
      pixels[i * 4 + 3] = 255;
    }
    return { pixels, width: carrierImage.width, height: carrierImage.height };
  }, [carrierImage, secretImage, secretSource]);

  // Process image
  const handleProcess = useCallback(async () => {
    if (!carrierImage) {
      setError('請上傳載體圖片');
      return;
    }

    const currentSecret = getSecretImage();
    if (!currentSecret) {
      setError('請上傳祕密圖片');
      return;
    }

    setError(null);
    setThumbnailDataUrl(null);

    const targetSize = targetPlatform === 'custom'
      ? { width: 500, height: 500 }
      : calculateTargetSize(
          carrierImage.width,
          carrierImage.height,
          targetPlatform === 'twitter'
            ? { ...PLATFORM_CONFIGS.twitter, maxEdge: Number(activeTier) }
            : PLATFORM_CONFIGS[targetPlatform]
        );

    const config: StegoConfig = {
      interpolationKernel,
      targetWidth: targetSize.width,
      targetHeight: targetSize.height,
      strength,
      tileSize,
      overlap: Math.floor(tileSize / 4),
    };

    try {
      const processedResult = await processImage(
        algorithm,
        { pixels: carrierImage.pixels, width: carrierImage.width, height: carrierImage.height },
        { pixels: currentSecret.pixels, width: currentSecret.width, height: currentSecret.height },
        config
      );

      const thumb = downsampleImage(
        processedResult.pixels,
        processedResult.width,
        processedResult.height,
        config.targetWidth,
        config.targetHeight,
        interpolationKernel
      );
      setThumbnailDataUrl(pixelsToDataUrl(thumb.pixels, config.targetWidth, config.targetHeight));
    } catch (err) {
      setError(err instanceof Error ? err.message : '處理失敗');
    }
  }, [carrierImage, getSecretImage, algorithm, interpolationKernel, strength, tileSize, targetPlatform, activeTier, processImage]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const dataUrl = pixelsToDataUrl(result.pixels, result.width, result.height);
    const link = document.createElement('a');
    link.download = 'processed-image.png';
    link.href = dataUrl;
    link.click();
  }, [result]);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold text-center mb-2">Playground</h1>
      <p className="text-center text-gray-600 mb-8">上傳圖片，體驗抗重採樣隱寫術</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">載體圖片 (Cover)</h2>
            <label className="block cursor-pointer">
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${carrierImage ? 'border-green-500' : 'border-gray-300 hover:border-gray-400'}`}>
                {carrierImage ? (
                  <img src={carrierImage.dataUrl} alt="Carrier" className="max-h-48 mx-auto object-contain" />
                ) : (
                  <div className="space-y-2">
                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 16v-1a2 2 0 012-2h8a2 2 0 012 2v1m-4 4V5" />
                    </svg>
                    <p className="text-gray-600">點擊或拖曳上傳載體圖片</p>
                    <p className="text-sm text-gray-400">JPEG, PNG, WebP up to 10MB</p>
                  </div>
                )}
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleUpload(e, 'carrier')} />
            </label>
            {carrierImage && (
              <p className="mt-2 text-sm text-gray-600 text-center">尺寸: {carrierImage.width} × {carrierImage.height}</p>
            )}
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">祕密圖片 (Secret)</h2>

            {/* Three-way selector */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                className={`py-2 px-3 rounded-lg text-sm transition-colors ${secretSource === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setSecretSource('upload')}
              >
                上傳圖片
              </button>
              <button
                className={`py-2 px-3 rounded-lg text-sm transition-colors ${secretSource === 'black' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setSecretSource('black')}
              >
                黑底
              </button>
              <button
                className={`py-2 px-3 rounded-lg text-sm transition-colors ${secretSource === 'white' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setSecretSource('white')}
              >
                白底
              </button>
            </div>

            {/* Upload area (shown only when 'upload' is selected) */}
            {secretSource === 'upload' && (
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${secretImage ? 'border-blue-500' : 'border-gray-300 hover:border-gray-400'}`}>
                  {secretImage ? (
                    <img src={secretImage.dataUrl} alt="Secret" className="max-h-32 mx-auto object-contain" />
                  ) : (
                    <div className="space-y-2">
                      <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <p className="text-gray-600">點擊或拖曳上傳祕密圖片</p>
                      <p className="text-sm text-gray-400">黑色區域 = 要隱藏，白色 = 保留</p>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleUpload(e, 'secret')} />
              </label>
            )}

            {/* Preview for black/white solid color */}
            {secretSource === 'black' && (
              <div className="border-2 border-dashed rounded-lg p-8 text-center bg-black">
                <p className="text-white text-sm">使用黑色作為祕密圖片</p>
                <p className="text-gray-400 text-xs mt-1">隱藏暗色區域</p>
              </div>
            )}
            {secretSource === 'white' && (
              <div className="border-2 border-dashed rounded-lg p-8 text-center bg-white">
                <p className="text-gray-800 text-sm">使用白色作為祕密圖片</p>
                <p className="text-gray-400 text-xs mt-1">隱藏亮色區域</p>
              </div>
            )}

            {secretImage && secretSource === 'upload' && (
              <p className="mt-2 text-sm text-gray-600 text-center">尺寸: {secretImage.width} × {secretImage.height}</p>
            )}
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">設定參數</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-2">目標平台</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['discord', 'line', 'twitter', 'custom'] as TargetPlatform[]).map((platform) => (
                    <button
                      key={platform}
                      className={`py-2 px-3 rounded-lg text-sm transition-colors ${targetPlatform === platform ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={() => {
                        setTargetPlatform(platform);
                        if (platform === 'twitter') {
                          setActiveTier('1200');
                        }
                      }}
                    >
                      {platform === 'discord' && 'Discord'}
                      {platform === 'line' && 'LINE'}
                      {platform === 'twitter' && 'X (Twitter)'}
                      {platform === 'custom' && 'Custom'}
                    </button>
                  ))}
                </div>

                {/* Tier selection for X */}
                {targetPlatform === 'twitter' && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 block mb-1.5">圖片品質檔位</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { key: '680', label: 'Small', desc: '680px' },
                        { key: '1200', label: 'Medium', desc: '1200px' },
                        { key: '2048', label: 'Large', desc: '2048px' },
                      ]).map((tier) => (
                        <button
                          key={tier.key}
                          className={`py-2 px-2 rounded-lg text-sm transition-colors ${activeTier === tier.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                          onClick={() => setActiveTier(tier.key)}
                        >
                          <div className="font-medium">{tier.label}</div>
                          <div className="text-xs opacity-75">{tier.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target size display */}
                {carrierImage && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>原始尺寸:</span>
                        <span className="font-mono">{carrierImage.width} × {carrierImage.height}</span>
                      </div>
                      {(() => {
                        const config = PLATFORM_CONFIGS[targetPlatform];
                        const maxEdge = targetPlatform === 'twitter'
                          ? Number(activeTier)
                          : config.maxEdge || Infinity;
                        const targetSize = calculateTargetSize(
                          carrierImage.width,
                          carrierImage.height,
                          { ...config, maxEdge }
                        );
                        const willScale = targetSize.width < carrierImage.width || targetSize.height < carrierImage.height;
                        return (
                          <>
                            <div className="flex justify-between">
                              <span>目標尺寸 ({config.name}):</span>
                              <span className="font-mono">
                                {targetSize.width} × {targetSize.height}
                                {willScale && (
                                  <span className="text-blue-600 ml-1">(↓{(carrierImage.width / targetSize.width).toFixed(1)}x)</span>
                                )}
                              </span>
                            </div>
                            {!willScale && (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">⚠️</span>
                                  <span className="text-sm font-medium">不會縮放</span>
                                </div>
                                <p className="text-xs mt-1 text-yellow-700">
                                  原始圖片小於目標平台最大尺寸，不會觸發平台縮放。
                                  請改用較小的圖片品質檔位以觸發縮放。
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">演算法</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`py-2 px-3 rounded-lg text-sm transition-colors ${algorithm === 'brute-force' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => setAlgorithm('brute-force')}
                  >
                    暴力解 (Brute Force)
                  </button>
                  <button
                    className={`py-2 px-3 rounded-lg text-sm transition-colors ${algorithm === 'analytical' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => setAlgorithm('analytical')}
                  >
                    優化解 (Analytical)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">插值核</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bilinear', 'bicubic', 'lanczos'] as InterpolationKernel[]).map((kernel) => (
                    <button
                      key={kernel}
                      className={`py-2 px-3 rounded-lg text-sm transition-colors ${interpolationKernel === kernel ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={() => setInterpolationKernel(kernel)}
                    >
                      {kernel === 'bilinear' && 'Bilinear'}
                      {kernel === 'bicubic' && 'Bicubic'}
                      {kernel === 'lanczos' && 'Lanczos'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">強度: {strength.toFixed(1)}</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">分塊大小: {tileSize}px</label>
                <input
                  type="range"
                  min="32"
                  max="256"
                  step="16"
                  value={tileSize}
                  onChange={(e) => setTileSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <button
              className="flex-1 py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleProcess}
              disabled={status === 'processing' || !carrierImage || (secretSource === 'upload' && !secretImage)}
            >
              {status === 'processing' ? '處理中...' : '開始處理'}
            </button>
            {status === 'processing' && (
              <button
                className="py-3 px-4 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                onClick={cancelProcessing}
              >
                取消
              </button>
            )}
          </div>

          {status === 'processing' && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-blue-600 h-4 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-sm text-gray-600">進度: {progress}%</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {status === 'done' && elapsedTime > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700">處理完成！耗時: {(elapsedTime / 1000).toFixed(2)} 秒</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">處理結果</h2>
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    onClick={handleDownload}
                  >
                    下載圖片
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={pixelsToDataUrl(result.pixels, result.width, result.height)}
                    alt="Processed"
                    className="w-full max-h-96 object-contain"
                  />
                </div>
              </div>

              {thumbnailDataUrl && (
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">縮圖預覽 (縮放後)</h3>
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <img src={thumbnailDataUrl} alt="Thumbnail" className="w-full max-h-48 object-contain" />
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    縮圖後，祕密圖案與背景融合，肉眼難以察覺差異。
                  </p>
                </div>
              )}
            </div>
          )}

          {!result && status === 'idle' && (
            <div className="border rounded-lg p-12 text-center">
              <p className="text-gray-400">上傳圖片並點擊「開始處理」以查看結果</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
