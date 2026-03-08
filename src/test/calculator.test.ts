/**
 * Unit tests for src/lib/calculator.ts
 */
import { describe, it, expect } from 'vitest';
import {
  getFishPool,
  applyLuckScaling,
  calculateDistribution,
  formatCurrency,
  getDefaultParams,
} from '@/lib/calculator';
import { FISH_MAP, FISHING_AREAS } from '@/data/fish';

// ---------------------------------------------------------------------------
// getFishPool
// ---------------------------------------------------------------------------
describe('getFishPool', () => {
  it('returns fish entries for a valid area', () => {
    const pool = getFishPool('lake');
    expect(pool.length).toBeGreaterThan(0);
    pool.forEach((f) => expect(f).toBeDefined());
  });

  it('returns only fish that are in the FISH_MAP', () => {
    const pool = getFishPool('ocean');
    pool.forEach((f) => expect(FISH_MAP[f.id]).toBeDefined());
  });

  it('returns an empty array for an unknown area', () => {
    expect(getFishPool('unknown-area')).toEqual([]);
  });

  it('returns the correct pool for each defined area', () => {
    FISHING_AREAS.forEach((area) => {
      const pool = getFishPool(area.id);
      expect(pool.length).toBe(area.fishPool.length);
    });
  });
});

// ---------------------------------------------------------------------------
// applyLuckScaling
// ---------------------------------------------------------------------------
describe('applyLuckScaling', () => {
  const pool = getFishPool('lake');

  it('returns an entry for each fish', () => {
    const scaled = applyLuckScaling(pool, 1.0);
    expect(scaled.length).toBe(pool.length);
  });

  it('does not change common fish weight at luck=1.0', () => {
    const commonFish = pool.filter((f) => f.rarity === 'common');
    const scaled = applyLuckScaling(commonFish, 1.0);
    scaled.forEach(({ fish, scaledWeight }) => {
      expect(scaledWeight).toBeCloseTo(fish.catchWeight ?? 1);
    });
  });

  it('does not boost any fish when luckMultiplier=1.0', () => {
    const scaled = applyLuckScaling(pool, 1.0);
    scaled.forEach(({ fish, scaledWeight }) => {
      expect(scaledWeight).toBeCloseTo(fish.catchWeight ?? 1);
    });
  });

  it('boosts uncommon+ fish when luckMultiplier > 1', () => {
    const scaled1 = applyLuckScaling(pool, 1.0);
    const scaled2 = applyLuckScaling(pool, 2.0);

    scaled1.forEach(({ fish }, i) => {
      if (fish.rarity === 'common') {
        // Common fish: no boost
        expect(scaled2[i].scaledWeight).toBeCloseTo(scaled1[i].scaledWeight);
      } else {
        // Uncommon+: should be boosted
        expect(scaled2[i].scaledWeight).toBeGreaterThan(scaled1[i].scaledWeight);
      }
    });
  });

  it('never returns a negative weight', () => {
    const scaled = applyLuckScaling(pool, 5.0);
    scaled.forEach(({ scaledWeight }) => {
      expect(scaledWeight).toBeGreaterThanOrEqual(0);
    });
  });
});

// ---------------------------------------------------------------------------
// calculateDistribution
// ---------------------------------------------------------------------------
describe('calculateDistribution', () => {
  const defaultParams = getDefaultParams('lake');

  it('returns a result with fishResults for a valid area', () => {
    const result = calculateDistribution(defaultParams);
    expect(result.fishResults.length).toBeGreaterThan(0);
  });

  it('probabilities sum to approximately (1 - nothingCaughtProbability)', () => {
    const params = { ...defaultParams, nothingCaughtProbability: 0.1 };
    const result = calculateDistribution(params);
    const totalProb = result.fishResults.reduce((s, r) => s + r.probability, 0);
    expect(totalProb).toBeCloseTo(0.9, 5);
  });

  it('probabilities sum to 1.0 when nothingCaughtProbability=0', () => {
    const params = { ...defaultParams, nothingCaughtProbability: 0 };
    const result = calculateDistribution(params);
    const totalProb = result.fishResults.reduce((s, r) => s + r.probability, 0);
    expect(totalProb).toBeCloseTo(1.0, 5);
  });

  it('expectedValuePerCatch matches sum of individual expected values', () => {
    const result = calculateDistribution(defaultParams);
    const sumEV = result.fishResults.reduce((s, r) => s + r.expectedValue, 0);
    expect(result.expectedValuePerCatch).toBeCloseTo(sumEV, 5);
  });

  it('expectedValuePerHour = expectedValuePerCatch * catchesPerHour', () => {
    const params = { ...defaultParams, avgCatchTimeSec: 60 };
    const result = calculateDistribution(params);
    const catchesPerHour = 3600 / 60;
    expect(result.expectedValuePerHour).toBeCloseTo(
      result.expectedValuePerCatch * catchesPerHour,
      4,
    );
  });

  it('returns empty fishResults and 0 EV for unknown area', () => {
    const params = { ...defaultParams, areaId: 'unknown' };
    const result = calculateDistribution(params);
    expect(result.fishResults).toEqual([]);
    expect(result.expectedValuePerCatch).toBe(0);
    expect(result.expectedValuePerHour).toBe(0);
  });

  it('includes a warning when luckMultiplier != 1.0', () => {
    const params = { ...defaultParams, luckMultiplier: 2.0 };
    const result = calculateDistribution(params);
    expect(result.warnings.length).toBeGreaterThan(0);
    const hasLuckWarning = result.warnings.some((w) => w.includes('ラック'));
    expect(hasLuckWarning).toBe(true);
  });

  it('all individual probabilities are non-negative', () => {
    const result = calculateDistribution(defaultParams);
    result.fishResults.forEach((r) => {
      expect(r.probability).toBeGreaterThanOrEqual(0);
    });
  });

  it('all individual expected values are non-negative', () => {
    const result = calculateDistribution(defaultParams);
    result.fishResults.forEach((r) => {
      expect(r.expectedValue).toBeGreaterThanOrEqual(0);
    });
  });

  it('custom rarity weights override default weights', () => {
    // Set legendary to 0 — golden-koi should have probability 0
    const params = {
      ...defaultParams,
      nothingCaughtProbability: 0,
      customRarityWeights: { legendary: 0 },
    };
    const result = calculateDistribution(params);
    const legendary = result.fishResults.find((r) => r.fish.rarity === 'legendary');
    if (legendary) {
      expect(legendary.probability).toBe(0);
    }
  });

  it('totalFishProbability matches sum of individual probabilities', () => {
    const result = calculateDistribution(defaultParams);
    const sumProb = result.fishResults.reduce((s, r) => s + r.probability, 0);
    expect(result.totalFishProbability).toBeCloseTo(sumProb, 5);
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe('formatCurrency', () => {
  it('formats values below 1000 as "XG"', () => {
    expect(formatCurrency(0)).toBe('0G');
    expect(formatCurrency(100)).toBe('100G');
    expect(formatCurrency(999)).toBe('999G');
  });

  it('formats values >= 1000 as "X.XkG"', () => {
    expect(formatCurrency(1000)).toBe('1.0kG');
    expect(formatCurrency(1500)).toBe('1.5kG');
    expect(formatCurrency(10000)).toBe('10.0kG');
  });

  it('rounds fractional values below 1000', () => {
    expect(formatCurrency(99.9)).toBe('100G');
    expect(formatCurrency(0.4)).toBe('0G');
  });
});

// ---------------------------------------------------------------------------
// getDefaultParams
// ---------------------------------------------------------------------------
describe('getDefaultParams', () => {
  it('returns defaults with the provided areaId', () => {
    const params = getDefaultParams('ocean');
    expect(params.areaId).toBe('ocean');
  });

  it('falls back to lake when no areaId provided', () => {
    const params = getDefaultParams();
    expect(params.areaId).toBe('lake');
  });

  it('has sane default values', () => {
    const params = getDefaultParams();
    expect(params.avgCatchTimeSec).toBeGreaterThan(0);
    expect(params.nothingCaughtProbability).toBeGreaterThanOrEqual(0);
    expect(params.nothingCaughtProbability).toBeLessThan(1);
    expect(params.luckMultiplier).toBeGreaterThanOrEqual(1);
  });
});
