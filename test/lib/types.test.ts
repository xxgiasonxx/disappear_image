import { describe, it, expect } from 'vitest';
import {
  PLATFORM_CONFIGS,
  DEFAULT_PIXEL_CONFIG,
} from '@/lib/types';

describe('types.ts', () => {
  describe('PLATFORM_CONFIGS', () => {
    it('contains Discord config', () => {
      expect(PLATFORM_CONFIGS.discord).toBeDefined();
      expect(PLATFORM_CONFIGS.discord.name).toBe('Discord');
      expect(PLATFORM_CONFIGS.discord.maxWidth).toBe(500);
      expect(PLATFORM_CONFIGS.discord.maxHeight).toBe(500);
      expect(PLATFORM_CONFIGS.discord.kernel).toBe('bicubic');
    });

    it('contains LINE config', () => {
      expect(PLATFORM_CONFIGS.line).toBeDefined();
      expect(PLATFORM_CONFIGS.line.name).toBe('LINE');
      expect(PLATFORM_CONFIGS.line.maxWidth).toBe(1200);
      expect(PLATFORM_CONFIGS.line.maxHeight).toBe(1200);
      expect(PLATFORM_CONFIGS.line.kernel).toBe('bilinear');
    });

    it('contains Twitter config', () => {
      expect(PLATFORM_CONFIGS.twitter).toBeDefined();
      expect(PLATFORM_CONFIGS.twitter.name).toBe('X (Twitter)');
      expect(PLATFORM_CONFIGS.twitter.maxWidth).toBe(1200);
      expect(PLATFORM_CONFIGS.twitter.maxHeight).toBe(675);
      expect(PLATFORM_CONFIGS.twitter.kernel).toBe('bicubic');
    });

    it('contains Custom config', () => {
      expect(PLATFORM_CONFIGS.custom).toBeDefined();
      expect(PLATFORM_CONFIGS.custom.name).toBe('Custom');
      expect(PLATFORM_CONFIGS.custom.kernel).toBe('lanczos');
    });

    it('all configs have required properties', () => {
      const requiredProps = ['name', 'maxWidth', 'maxHeight', 'kernel', 'quality'];
      Object.values(PLATFORM_CONFIGS).forEach((config) => {
        requiredProps.forEach((prop) => {
          expect(config).toHaveProperty(prop);
        });
        expect(typeof config.quality).toBe('number');
        expect(config.quality).toBeGreaterThan(0);
        expect(config.quality).toBeLessThanOrEqual(1);
      });
    });

    it('quality values are valid', () => {
      Object.values(PLATFORM_CONFIGS).forEach((config) => {
        expect(config.quality).toBeGreaterThan(0);
        expect(config.quality).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('DEFAULT_PIXEL_CONFIG', () => {
    it('has required properties', () => {
      expect(DEFAULT_PIXEL_CONFIG).toHaveProperty('density');
      expect(DEFAULT_PIXEL_CONFIG).toHaveProperty('minBrightness');
      expect(DEFAULT_PIXEL_CONFIG).toHaveProperty('maxBrightness');
      expect(DEFAULT_PIXEL_CONFIG).toHaveProperty('colorMode');
    });

    it('has valid density', () => {
      expect(DEFAULT_PIXEL_CONFIG.density).toBeGreaterThan(0);
      expect(DEFAULT_PIXEL_CONFIG.density).toBeLessThan(1);
    });

    it('has valid brightness range', () => {
      expect(DEFAULT_PIXEL_CONFIG.minBrightness).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_PIXEL_CONFIG.maxBrightness).toBeLessThanOrEqual(255);
      expect(DEFAULT_PIXEL_CONFIG.minBrightness).toBeLessThan(DEFAULT_PIXEL_CONFIG.maxBrightness);
    });

    it('has valid colorMode', () => {
      expect(['grayscale', 'chromatic']).toContain(DEFAULT_PIXEL_CONFIG.colorMode);
    });
  });
});