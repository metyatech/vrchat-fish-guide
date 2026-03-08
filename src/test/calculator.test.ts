import { describe, expect, it } from 'vitest';
import { CALCULATOR_RARITIES, FISH_MAP, FISHING_AREAS } from '@/data/fish';
import {
  applyLuckScaling,
  calculateDistribution,
  formatCurrency,
  formatPriceRange,
  formatWeightRange,
  getDefaultParams,
  getEligibleFish,
  getFishPool,
} from '@/lib/calculator';

describe('getFishPool', () => {
  it('returns fish entries for a valid area', () => {
    const pool = getFishPool('coconut-bay');
    expect(pool.length).toBeGreaterThan(0);
    pool.forEach((fish) => expect(fish).toBeDefined());
  });

  it('returns only fish that are in the FISH_MAP', () => {
    const pool = getFishPool('open-sea');
    pool.forEach((fish) => expect(FISH_MAP[fish.id]).toBeDefined());
  });

  it('returns an empty array for an unknown area', () => {
    expect(getFishPool('unknown-area')).toEqual([]);
  });

  it('returns the full pool for each defined area', () => {
    FISHING_AREAS.forEach((area) => {
      expect(getFishPool(area.id)).toHaveLength(area.fishPool.length);
    });
  });
});

describe('getEligibleFish', () => {
  it('filters by time-of-day and weather tags', () => {
    const eligibleFish = getEligibleFish('open-sea', 'night', 'rainy');

    expect(eligibleFish.length).toBeGreaterThan(0);
    eligibleFish.forEach((fish) => {
      expect(fish.timeOfDay === 'any' || fish.timeOfDay === 'night').toBe(true);
      expect(fish.weatherType === 'any' || fish.weatherType === 'rainy').toBe(true);
    });
  });

  it('returns no fish when area is unknown', () => {
    expect(getEligibleFish('missing', 'any', 'any')).toEqual([]);
  });
});

describe('applyLuckScaling', () => {
  const baseWeights = {
    abundant: 27,
    common: 25,
    curious: 18,
    elusive: 11,
    fabled: 4.4,
    mythic: 2.5,
    exotic: 3.1,
  } as const;

  it('preserves weights when luckMultiplier is 1', () => {
    expect(applyLuckScaling(baseWeights, 1)).toEqual(baseWeights);
  });

  it('does not boost abundant tier', () => {
    const scaled = applyLuckScaling(baseWeights, 2);
    expect(scaled.abundant).toBe(baseWeights.abundant);
  });

  it('boosts higher rarity tiers when luckMultiplier is greater than 1', () => {
    const scaled = applyLuckScaling(baseWeights, 2);

    expect((scaled.common ?? 0) > baseWeights.common).toBe(true);
    expect((scaled.exotic ?? 0) > baseWeights.exotic).toBe(true);
    expect((scaled.exotic ?? 0) > (scaled.common ?? 0)).toBe(false);
  });

  it('never produces negative weights', () => {
    const scaled = applyLuckScaling(baseWeights, 0.1);
    Object.values(scaled).forEach((weight) => expect(weight).toBeGreaterThanOrEqual(0));
  });
});

describe('calculateDistribution', () => {
  const defaultParams = getDefaultParams('coconut-bay');

  it('returns fish results for a valid area', () => {
    const result = calculateDistribution(defaultParams);
    expect(result.fishResults.length).toBeGreaterThan(0);
  });

  it('probabilities sum to approximately 1 - nothingCaughtProbability', () => {
    const result = calculateDistribution({
      ...defaultParams,
      nothingCaughtProbability: 0.1,
    });

    expect(result.totalFishProbability).toBeCloseTo(0.9, 5);
  });

  it('uses the normalized params in the result', () => {
    const result = calculateDistribution({
      ...defaultParams,
      avgCatchTimeSec: -10,
      nothingCaughtProbability: 99,
      luckMultiplier: -1,
    });

    expect(result.params.avgCatchTimeSec).toBe(1);
    expect(result.params.nothingCaughtProbability).toBe(0.95);
    expect(result.params.luckMultiplier).toBe(0.1);
  });

  it('matches expectedValuePerCatch to the sum of individual expected values', () => {
    const result = calculateDistribution(defaultParams);
    const expectedValue = result.fishResults.reduce((sum, row) => sum + row.expectedValue, 0);

    expect(result.expectedValuePerCatch).toBeCloseTo(expectedValue, 5);
  });

  it('matches expectedValuePerHour to expectedValuePerCatch * catchesPerHour', () => {
    const params = { ...defaultParams, avgCatchTimeSec: 60 };
    const result = calculateDistribution(params);

    expect(result.expectedValuePerHour).toBeCloseTo(result.expectedValuePerCatch * 60, 5);
  });

  it('returns no fish for an unknown area', () => {
    const result = calculateDistribution({ ...defaultParams, areaId: 'unknown' });

    expect(result.fishResults).toEqual([]);
    expect(result.expectedValuePerCatch).toBe(0);
    expect(result.expectedValuePerHour).toBe(0);
  });

  it('warns when time or weather filters are enabled', () => {
    const result = calculateDistribution({
      ...defaultParams,
      areaId: 'open-sea',
      timeOfDay: 'night',
      weatherType: 'rainy',
    });

    expect(result.warnings.some((warning) => warning.includes('時間帯・天候タグ'))).toBe(true);
  });

  it('warns when luckMultiplier differs from 1', () => {
    const result = calculateDistribution({
      ...defaultParams,
      luckMultiplier: 2,
    });

    expect(result.warnings.some((warning) => warning.includes('ラック倍率'))).toBe(true);
  });

  it('uses zero probability for a tier whose custom weight is zeroed out', () => {
    const pool = getFishPool(defaultParams.areaId);
    const presentTier = CALCULATOR_RARITIES.find((rarity) =>
      pool.some((fish) => fish.rarity === rarity),
    );
    expect(presentTier).toBeDefined();

    const result = calculateDistribution({
      ...defaultParams,
      nothingCaughtProbability: 0,
      customRarityWeights: { [presentTier!]: 0 },
    });

    const tierRows = result.fishResults.filter((row) => row.fish.rarity === presentTier);
    expect(tierRows.length).toBeGreaterThan(0);
    tierRows.forEach((row) => expect(row.probability).toBe(0));
  });

  it('tracks missing-price fish and emits a warning when price ranges are absent', () => {
    const result = calculateDistribution(defaultParams);

    const fishWithoutPrice = getFishPool(defaultParams.areaId).find(
      (fish) => fish.priceFloor === undefined && fish.priceCeiling === undefined,
    );

    if (!fishWithoutPrice) {
      expect(result.missingPriceFish).toEqual([]);
      return;
    }

    expect(result.missingPriceFish.some((fish) => fish.id === fishWithoutPrice.id)).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('価格レンジ未取得'))).toBe(true);
  });

  it('only returns non-negative probabilities and expected values', () => {
    const result = calculateDistribution(defaultParams);

    result.fishResults.forEach((row) => {
      expect(row.probability).toBeGreaterThanOrEqual(0);
      expect(row.expectedValue).toBeGreaterThanOrEqual(0);
      expect(row.expectedValuePerHour).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('format helpers', () => {
  it('formats values below 1000 as XG', () => {
    expect(formatCurrency(0)).toBe('0G');
    expect(formatCurrency(999)).toBe('999G');
  });

  it('formats values above 1000 as kG', () => {
    expect(formatCurrency(1000)).toBe('1.0kG');
    expect(formatCurrency(1500)).toBe('1.5kG');
  });

  it('formats fish price and weight ranges from dataset values', () => {
    const fish = getFishPool('coconut-bay')[0];

    expect(formatPriceRange(fish)).toMatch(/G/);
    expect(formatWeightRange(fish)).toMatch(/kg|—/);
  });
});

describe('getDefaultParams', () => {
  it('uses the provided area id', () => {
    expect(getDefaultParams('open-sea').areaId).toBe('open-sea');
  });

  it('defaults to coconut-bay', () => {
    expect(getDefaultParams().areaId).toBe('coconut-bay');
  });

  it('returns sane defaults', () => {
    const params = getDefaultParams();

    expect(params.avgCatchTimeSec).toBeGreaterThan(0);
    expect(params.nothingCaughtProbability).toBeGreaterThanOrEqual(0);
    expect(params.nothingCaughtProbability).toBeLessThan(1);
    expect(params.luckMultiplier).toBeGreaterThan(0);
  });
});
