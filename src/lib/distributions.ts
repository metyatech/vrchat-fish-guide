/**
 * Statistical helper utilities for distribution calculations.
 */

/**
 * Calculate the mean of an array of numbers.
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate variance of an array of numbers.
 */
export function variance(values: number[], weights?: number[]): number {
  if (values.length === 0) return 0;
  const w = weights ?? values.map(() => 1);
  const totalWeight = w.reduce((sum, wi) => sum + wi, 0);
  if (totalWeight === 0) return 0;
  const weightedMean = values.reduce((sum, v, i) => sum + v * w[i], 0) / totalWeight;
  return values.reduce((sum, v, i) => sum + w[i] * Math.pow(v - weightedMean, 2), 0) / totalWeight;
}

/**
 * Calculate standard deviation.
 */
export function stddev(values: number[], weights?: number[]): number {
  return Math.sqrt(variance(values, weights));
}

/**
 * Build histogram bins from value-probability pairs.
 */
export function buildHistogram(
  valueProbPairs: Array<{ value: number; probability: number }>,
  binCount = 10,
): Array<{ binMin: number; binMax: number; probability: number; label: string }> {
  if (valueProbPairs.length === 0) return [];

  const values = valueProbPairs.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  if (minVal === maxVal) {
    return [
      {
        binMin: minVal,
        binMax: maxVal,
        probability: valueProbPairs.reduce((s, p) => s + p.probability, 0),
        label: `${minVal}G`,
      },
    ];
  }

  const binWidth = (maxVal - minVal) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    binMin: minVal + i * binWidth,
    binMax: minVal + (i + 1) * binWidth,
    probability: 0,
    label: `${Math.round(minVal + i * binWidth)}G`,
  }));

  for (const { value, probability } of valueProbPairs) {
    const idx = Math.min(Math.floor((value - minVal) / binWidth), binCount - 1);
    bins[idx].probability += probability;
  }

  return bins;
}
