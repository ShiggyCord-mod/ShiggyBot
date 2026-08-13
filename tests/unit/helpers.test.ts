import { describe, it, expect } from 'bun:test';
import {
  formatNumber,
  formatDuration,
  truncate,
  capitalize,
  randomInt,
  randomArray,
  chunkArray,
  removeDuplicates,
  isValidNumber,
  isValidString,
  isValidUrl,
} from '../../src/utils/helpers/index.js';

describe('Helper Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(100)).toBe('100');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds to human readable duration', () => {
      expect(formatDuration(1000)).toBe('1s');
      expect(formatDuration(60000)).toBe('1m');
      expect(formatDuration(3600000)).toBe('1h');
      expect(formatDuration(86400000)).toBe('1d');
      expect(formatDuration(90061000)).toBe('1d 1h 1m 1s');
    });
  });

  describe('truncate', () => {
    it('should truncate strings longer than max length', () => {
      expect(truncate('Hello World', 5)).toBe('He...');
      expect(truncate('Hello World', 11)).toBe('Hello World');
      expect(truncate('Hello World', 8, '...')).toBe('Hello...');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter and lowercase rest', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('hELLO')).toBe('Hello');
    });
  });

  describe('randomInt', () => {
    it('should return a random integer within range', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomInt(1, 10);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('randomArray', () => {
    it('should return a random element from array', () => {
      const arr = [1, 2, 3, 4, 5];
      for (let i = 0; i < 100; i++) {
        const result = randomArray(arr);
        expect(arr).toContain(result);
      }
    });
  });

  describe('chunkArray', () => {
    it('should chunk array into smaller arrays', () => {
      expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunkArray([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
      expect(chunkArray([], 2)).toEqual([]);
    });
  });

  describe('removeDuplicates', () => {
    it('should remove duplicate values', () => {
      expect(removeDuplicates([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(removeDuplicates(['a', 'b', 'a'])).toEqual(['a', 'b']);
    });
  });

  describe('isValidNumber', () => {
    it('should validate numbers', () => {
      expect(isValidNumber(123)).toBe(true);
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(-1)).toBe(true);
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber('123')).toBe(false);
    });
  });

  describe('isValidString', () => {
    it('should validate strings', () => {
      expect(isValidString('hello')).toBe(true);
      expect(isValidString('')).toBe(false);
      expect(isValidString(123)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('not-a-url')).toBe(false);
    });
  });
});