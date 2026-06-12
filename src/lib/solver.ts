export class SparseMatrix {
  rows: Map<number, Map<number, number>>;
  numRows: number;
  numCols: number;

  constructor(numRows: number, numCols: number) {
    this.rows = new Map();
    this.numRows = numRows;
    this.numCols = numCols;
  }

  get(row: number, col: number): number {
    const rowMap = this.rows.get(row);
    if (!rowMap) return 0;
    return rowMap.get(col) || 0;
  }

  set(row: number, col: number, value: number): void {
    if (value === 0) return;
    if (!this.rows.has(row)) {
      this.rows.set(row, new Map());
    }
    this.rows.get(row)!.set(col, value);
  }

  add(row: number, col: number, value: number): void {
    if (value === 0) return;
    const current = this.get(row, col);
    this.set(row, col, current + value);
  }

  multiplyVector(v: Float32Array): Float32Array {
    const result = new Float32Array(this.numRows);
    for (const [row, rowMap] of this.rows) {
      let sum = 0;
      for (const [col, value] of rowMap) {
        sum += value * v[col];
      }
      result[row] = sum;
    }
    return result;
  }

  transpose(): SparseMatrix {
    const transposed = new SparseMatrix(this.numCols, this.numRows);
    for (const [row, rowMap] of this.rows) {
      for (const [col, value] of rowMap) {
        transposed.set(col, row, value);
      }
    }
    return transposed;
  }
}

export function sparseMatrixVectorProduct(A: SparseMatrix, x: Float32Array): Float32Array {
  return A.multiplyVector(x);
}

export function dotProduct(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function vectorAdd(a: Float32Array, b: Float32Array, scale: number = 1): Float32Array {
  const result = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] + b[i] * scale;
  }
  return result;
}

export function vectorSubtract(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] - b[i];
  }
  return result;
}

export function vectorScale(a: Float32Array, scale: number): Float32Array {
  const result = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] * scale;
  }
  return result;
}

export function preconditionedConjugateGradient(
  A: SparseMatrix,
  b: Float32Array,
  x0: Float32Array,
  maxIterationsyles: number = 500,
  tolerance: number = 1e-6
): Float32Array {
  const x = new Float32Array(x0);
  const bNorm = Math.sqrt(dotProduct(b, b));

  const r = vectorSubtract(b, A.multiplyVector(x));
  const z = new Float32Array(r);
  const p = new Float32Array(z);
  let rz = dotProduct(r, z);

  for (let iter = 0; iter < maxIterationsyles; iter++) {
    const Ap = A.multiplyVector(p);
    const pAp = dotProduct(p, Ap);

    if (pAp === 0) break;

    const alpha = rz / pAp;
    for (let i = 0; i < x.length; i++) {
      x[i] += alpha * p[i];
    }

    for (let i = 0; i < r.length; i++) {
      r[i] -= alpha * Ap[i];
    }

    if (Math.sqrt(dotProduct(r, r)) < tolerance * bNorm) break;

    const zNew = new Float32Array(r);
    const rzNew = dotProduct(r, zNew);
    const beta = rzNew / rz;

    for (let i = 0; i < p.length; i++) {
      p[i] = zNew[i] + beta * p[i];
    }

    rz = rzNew;
  }

  return x;
}
