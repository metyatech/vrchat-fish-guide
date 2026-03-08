/**
 * Unit tests for src/lib/distributions.ts
 */
import { describe, it, expect } from 'vitest';
import { mean, variance, stddev, buildHistogram } from '@/lib/distributions';

// ---------------------------------------------------------------------------
// mean
// ---------------------------------------------------------------------------
describe('mean', () => {
  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('returns the single value for a one-element array', () => {
    expect(mean([42])).toBe(42);
  });

  it('computes arithmetic mean correctly', () => {
    expect(mean([1, 2, 3, 4, 5])).toBeCloseTo(3, 10);
    expect(mean([0, 10])).toBeCloseTo(5, 10);
  });
});

// ---------------------------------------------------------------------------
// variance
// ---------------------------------------------------------------------------
describe('variance', () => {
  it('returns 0 for empty array', () => {
    expect(variance([])).toBe(0);
  });

  it('returns 0 for all-equal values', () => {
    expect(variance([5, 5, 5])).toBeCloseTo(0, 10);
  });

  it('computes variance correctly for unweighted case', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] — classic textbook example (population variance = 4)
    const result = variance([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(4, 5);
  });

  it('computes weighted variance', () => {
    // All weight on one value → variance = 0
    const result = variance([1, 100], [1, 0]);
    expect(result).toBeCloseTo(0, 10);
  });

  it('returns 0 when total weight is 0', () => {
    expect(variance([1, 2, 3], [0, 0, 0])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// stddev
// ---------------------------------------------------------------------------
describe('stddev', () => {
  it('returns 0 for empty array', () => {
    expect(stddev([])).toBe(0);
  });

  it('is the square root of variance', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(stddev(values)).toBeCloseTo(Math.sqrt(variance(values)), 10);
  });

  it('returns a non-negative value', () => {
    expect(stddev([1, 2, 3])).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// buildHistogram
// ---------------------------------------------------------------------------
describe('buildHistogram', () => {
  it('returns empty array for empty input', () => {
    expect(buildHistogram([])).toEqual([]);
  });

  it('returns a single bin when all values are equal', () => {
    const pairs = [
      { value: 10, probability: 0.5 },
      { value: 10, probability: 0.5 },
    ];
    const bins = buildHistogram(pairs);
    expect(bins.length).toBe(1);
    expect(bins[0].probability).toBeCloseTo(1.0, 10);
  });

  it('returns the requested number of bins by default', () => {
    const pairs = Array.from({ length: 5 }, (_, i) => ({ value: i * 10, probability: 0.2 }));
    const bins = buildHistogram(pairs, 5);
    expect(bins.length).toBe(5);
  });

  it('probabilities across all bins sum correctly', () => {
    const pairs = [
      { value: 0, probability: 0.3 },
      { value: 50, probability: 0.4 },
      { value: 100, probability: 0.3 },
    ];
    const bins = buildHistogram(pairs, 5);
    const total = bins.reduce((s, b) => s + b.probability, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });

  it('each bin has a label string', () => {
    const pairs = [
      { value: 10, probability: 0.5 },
      { value: 20, probability: 0.5 },
    ];
    const bins = buildHistogram(pairs, 2);
    bins.forEach((b) => expect(typeof b.label).toBe('string'));
  });

  it('bin min/max values are ordered correctly', () => {
    const pairs = [
      { value: 0, probability: 0.5 },
      { value: 100, probability: 0.5 },
    ];
    const bins = buildHistogram(pairs, 4);
    bins.forEach((b) => expect(b.binMin).toBeLessThanOrEqual(b.binMax));
  });
});
