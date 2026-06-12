import { describe, it, expect } from 'vitest';
import {
  SparseMatrix,
  dotProduct,
  vectorAdd,
  vectorSubtract,
  vectorScale,
  preconditionedConjugateGradient,
} from '@/lib/solver';

describe('solver.ts', () => {
  describe('SparseMatrix', () => {
    it('initializes with correct dimensions', () => {
      const matrix = new SparseMatrix(10, 10);
      expect(matrix.numRows).toBe(10);
      expect(matrix.numCols).toBe(10);
    });

    it('sets and gets values correctly', () => {
      const matrix = new SparseMatrix(5, 5);
      matrix.set(1, 2, 3.5);
      expect(matrix.get(1, 2)).toBe(3.5);
      expect(matrix.get(0, 0)).toBe(0);
    });

    it('adds values to existing entries', () => {
      const matrix = new SparseMatrix(5, 5);
      matrix.set(1, 2, 3);
      matrix.add(1, 2, 4);
      expect(matrix.get(1, 2)).toBe(7);
    });

    it('ignores zero values in set', () => {
      const matrix = new SparseMatrix(5, 5);
      matrix.set(1, 2, 0);
      expect(matrix.rows.has(1)).toBe(false);
    });

    it('multiplies with a vector', () => {
      const matrix = new SparseMatrix(3, 3);
      matrix.set(0, 0, 1);
      matrix.set(1, 1, 2);
      matrix.set(2, 2, 3);

      const vector = new Float32Array([1, 2, 3]);
      const result = matrix.multiplyVector(vector);

      expect(result[0]).toBe(1);
      expect(result[1]).toBe(4);
      expect(result[2]).toBe(9);
    });

    it('computes transpose correctly', () => {
      const matrix = new SparseMatrix(3, 3);
      matrix.set(0, 1, 5);
      matrix.set(1, 2, 7);

      const transposed = matrix.transpose();

      expect(transposed.get(1, 0)).toBe(5);
      expect(transposed.get(2, 1)).toBe(7);
      expect(transposed.get(0, 1)).toBe(0);
    });
  });

  describe('dotProduct', () => {
    it('calculates correct dot product', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      expect(dotProduct(a, b)).toBe(32);
    });

    it('returns 0 for orthogonal vectors', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([0, 1]);
      expect(dotProduct(a, b)).toBe(0);
    });
  });

  describe('vectorAdd', () => {
    it('adds two vectors with default scale', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      const result = vectorAdd(a, b);
      expect(result[0]).toBe(5);
      expect(result[1]).toBe(7);
      expect(result[2]).toBe(9);
    });

    it('scales the second vector before adding', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      const result = vectorAdd(a, b, 2);
      expect(result[0]).toBe(9);
      expect(result[1]).toBe(12);
      expect(result[2]).toBe(15);
    });
  });

  describe('vectorSubtract', () => {
    it('subtracts two vectors', () => {
      const a = new Float32Array([5, 7, 9]);
      const b = new Float32Array([1, 2, 3]);
      const result = vectorSubtract(a, b);
      expect(result[0]).toBe(4);
      expect(result[1]).toBe(5);
      expect(result[2]).toBe(6);
    });
  });

  describe('vectorScale', () => {
    it('scales a vector', () => {
      const a = new Float32Array([1, 2, 3]);
      const result = vectorScale(a, 2);
      expect(result[0]).toBe(2);
      expect(result[1]).toBe(4);
      expect(result[2]).toBe(6);
    });
  });

  describe('preconditionedConjugateGradient', () => {
    it('solves a simple diagonal system', () => {
      const A = new SparseMatrix(3, 3);
      A.set(0, 0, 2);
      A.set(1, 1, 3);
      A.set(2, 2, 4);

      const b = new Float32Array([2, 6, 12]);
      const x0 = new Float32Array([0, 0, 0]);

      const solution = preconditionedConjugateGradient(A, b, x0);

      expect(solution[0]).toBeCloseTo(1, 5);
      expect(solution[1]).toBeCloseTo(2, 5);
      expect(solution[2]).toBeCloseTo(3, 5);
    });

    it('solves a symmetric positive-definite system', () => {
      const A = new SparseMatrix(2, 2);
      A.set(0, 0, 4);
      A.set(0, 1, 1);
      A.set(1, 0, 1);
      A.set(1, 1, 3);

      const b = new Float32Array([5, 4]);
      const x0 = new Float32Array([0, 0]);

      const solution = preconditionedConjugateGradient(A, b, x0);

      expect(solution[0]).toBeCloseTo(1, 4);
      expect(solution[1]).toBeCloseTo(1, 4);
    });

    it('returns initial guess if already converged', () => {
      const A = new SparseMatrix(2, 2);
      A.set(0, 0, 1);
      A.set(1, 1, 1);

      const b = new Float32Array([0, 0]);
      const x0 = new Float32Array([0, 0]);

      const solution = preconditionedConjugateGradient(A, b, x0);

      expect(solution[0]).toBe(0);
      expect(solution[1]).toBe(0);
    });
  });
});