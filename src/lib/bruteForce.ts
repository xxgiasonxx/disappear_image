import type { ImageDataTyped, StegoConfig } from '@lib/types';

function isSolidColor(image: ImageDataTyped): boolean {
  const p = image.pixels;
  if (p.length < 8) return true;
  const r0 = p[0], g0 = p[1], b0 = p[2], a0 = p[3];
  const step = Math.max(1, Math.floor(image.width * image.height / 100));
  for (let i = 0; i < image.width * image.height; i += step) {
    const idx = i * 4;
    if (Math.abs(p[idx] - r0) > 3 || Math.abs(p[idx + 1] - g0) > 3 ||
        Math.abs(p[idx + 2] - b0) > 3 || Math.abs(p[idx + 3] - a0) > 3) {
      return false;
    }
  }
  return true;
}

function zeroMean(base: number, strength: number, isEven: boolean): number {
  const fullDark  = Math.max(0, 2 * base - 255);
  const fullLight = Math.min(255, 2 * base);
  const dark  = base + (fullDark  - base) * strength;
  const light = base + (fullLight - base) * strength;
  return Math.round(isEven ? light : dark);
}

export function hideImageBruteForce(
  coverImage: ImageDataTyped,
  secretImage: ImageDataTyped,
  config: StegoConfig
): ImageDataTyped {
  const { width: srcW, height: srcH, pixels: srcPixels } = coverImage;
  const { width: secW, height: secH, pixels: secPixels } = secretImage;
  const { targetWidth, targetHeight, strength } = config;

  const outputPixels = new Uint8ClampedArray(srcPixels);
  const scaleX = srcW / targetWidth;
  const scaleY = srcH / targetHeight;

  // Pre-compute global average of carrier image (used as fallback when a block is fully secret)
  let globalR = 0, globalG = 0, globalB = 0;
  for (let i = 0; i < srcW * srcH; i++) {
    const idx = i * 4;
    globalR += srcPixels[idx];
    globalG += srcPixels[idx + 1];
    globalB += srcPixels[idx + 2];
  }
  const pixelCount = srcW * srcH;
  globalR = Math.round(globalR / pixelCount);
  globalG = Math.round(globalG / pixelCount);
  globalB = Math.round(globalB / pixelCount);

  const solid = isSolidColor(secretImage);

  let avgLum = 128;
  if (!solid) {
    let totalLum = 0;
    for (let i = 0; i < secW * secH; i++) {
      const idx = i * 4;
      totalLum += (secPixels[idx] + secPixels[idx + 1] + secPixels[idx + 2]) / 3;
    }
    avgLum = totalLum / (secW * secH);
  }
  const isWhiteBackground = avgLum > 128;
  const isBlackBackground = avgLum <= 128;

  // When secretImage is solid color (black/white mode), use carrier image luminance to determine secret pixels
  const isSecretPixel = (px: number, py: number): boolean => {
    const secX = Math.max(0, Math.min(secW - 1, Math.floor((px / srcW) * secW)));
    const secY = Math.max(0, Math.min(secH - 1, Math.floor((py / srcH) * secH)));
    const sIdx = (secY * secW + secX) * 4;
    const lum = (secPixels[sIdx] + secPixels[sIdx + 1] + secPixels[sIdx + 2]) / 3;

    if (solid) {
      // Black mode: treat bright pixels in carrier image as secret (light text on dark background)
      // White mode: treat dark pixels in carrier image as secret (dark text on light background)
      const carrierIdx = (py * srcW + px) * 4;
      const carrierLum = (srcPixels[carrierIdx] + srcPixels[carrierIdx + 1] + srcPixels[carrierIdx + 2]) / 3;
      if (isBlackBackground) {
        return carrierLum > 128; // Light pixels are secret in black mode (white text)
      } else {
        return carrierLum <= 128; // Dark pixels are secret in white mode (black text)
      }
    }
    return isWhiteBackground ? lum < 128 : lum > 128;
  };

  for (let ty = 0; ty < targetHeight; ty++) {
    for (let tx = 0; tx < targetWidth; tx++) {
      const sx0 = Math.floor(tx * scaleX);
      const sy0 = Math.floor(ty * scaleY);
      const sx1 = Math.min(srcW, Math.floor((tx + 1) * scaleX));
      const sy1 = Math.min(srcH, Math.floor((ty + 1) * scaleY));
      if (sx1 <= sx0 || sy1 <= sy0) continue;

      let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
      for (let y = sy0; y < sy1; y++) {
        for (let x = sx0; x < sx1; x++) {
          if (isSecretPixel(x, y)) continue;
          const idx = (y * srcW + x) * 4;
          bgR += srcPixels[idx];
          bgG += srcPixels[idx + 1];
          bgB += srcPixels[idx + 2];
          bgCount++;
        }
      }
      if (bgCount === 0) {
        // Block is fully secret: fallback to global carrier average
        bgR = globalR;
        bgG = globalG;
        bgB = globalB;
      } else {
        bgR = Math.round(bgR / bgCount);
        bgG = Math.round(bgG / bgCount);
        bgB = Math.round(bgB / bgCount);
      }

      let hasSecret = false;
      for (let y = sy0; y < sy1 && !hasSecret; y++) {
        for (let x = sx0; x < sx1; x++) {
          if (isSecretPixel(x, y)) { hasSecret = true; break; }
        }
      }
      if (!hasSecret) continue;

      for (let y = sy0; y < sy1; y++) {
        for (let x = sx0; x < sx1; x++) {
          if (!isSecretPixel(x, y)) continue;
          const isEven = ((x + y) % 2 === 0);
          const idx = (y * srcW + x) * 4;
          outputPixels[idx]     = zeroMean(bgR, strength, isEven);
          outputPixels[idx + 1] = zeroMean(bgG, strength, isEven);
          outputPixels[idx + 2] = zeroMean(bgB, strength, isEven);
        }
      }
    }
  }

  return {
    width: srcW,
    height: srcH,
    pixels: outputPixels,
  };
}