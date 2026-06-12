export interface ImageLoadResult {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  dataUrl: string;
}

export function loadImageToPixels(file: File): Promise<ImageLoadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve({
          pixels: imageData.data,
          width: img.width,
          height: img.height,
          dataUrl: canvas.toDataURL('image/png'),
        });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function loadImageUrl(url: string): Promise<ImageLoadResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve({
        pixels: imageData.data,
        width: img.width,
        height: img.height,
        dataUrl: canvas.toDataURL('image/png'),
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

export function pixelsToDataUrl(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function generateSecretPattern(
  width: number,
  height: number
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const cx = width / 2;
      const cy = height / 2;
      const inCircle = (x - cx) ** 2 + (y - cy) ** 2 < (width / 4) ** 2;
      const inCrossH = Math.abs(y - cy) < height / 8;
      const inCrossV = Math.abs(x - cx) < width / 8;

      if (inCircle || inCrossH || inCrossV) {
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
      } else {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
      }
      pixels[idx + 3] = 255;
    }
  }

  return pixels;
}

export function generateTestPattern(
  width: number,
  height: number
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);
      const brightness = Math.max(0, Math.min(255, 255 * (1 - dist / maxDist)));

      const checkSize = 8;
      const isCheck = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
      const value = isCheck ? Math.min(255, brightness + 30) : brightness;

      pixels[idx] = value;
      pixels[idx + 1] = value;
      pixels[idx + 2] = value;
      pixels[idx + 3] = 255;
    }
  }

  return pixels;
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return '檔案大小必須小於 10MB';
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return '僅支援 JPEG、PNG、WebP 格式';
  }

  return null;
}