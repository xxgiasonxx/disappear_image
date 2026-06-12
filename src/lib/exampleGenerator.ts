import type { ImageDataTyped } from '@lib/types';

export function generateCoverImage(width: number, height: number): ImageDataTyped {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const value = 128 + Math.sin(x * 0.1) * 25 + Math.cos(y * 0.1) * 25 + (Math.random() - 0.5) * 20;
      pixels[idx] = Math.max(100, Math.min(200, value));
      pixels[idx + 1] = Math.max(100, Math.min(200, value));
      pixels[idx + 2] = Math.max(100, Math.min(200, value));
      pixels[idx + 3] = 255;
    }
  }
  return { width, height, pixels };
}

export function generateSecretImage(width: number, height: number): ImageDataTyped {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 0;
    pixels[i + 1] = 0;
    pixels[i + 2] = 0;
    pixels[i + 3] = 255;
  }
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const text = 'TAP';
  const fontSize = Math.floor(Math.min(width, height) * 0.4);
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, centerX, centerY);
    const imageData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = imageData.data[i];
    }
  }
  return { width, height, pixels };
}
