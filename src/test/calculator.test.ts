import { describe, expect, it } from 'vitest';
import { CALCULATOR_RARITIES, FISH_MAP, FISHING_AREAS } from '@/data/fish';
import {
  applyLuckScaling,
  calculateDistribution,
  deriveModelSummary,
  formatCurrency,
  formatPriceRange,
  formatWeightRange,
  getDefaultParams,
  getEligibleFish,
  getFishPool,
  getSelectedLoadout,
  resolveEnchantActivity,
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
  });

  it('never produces negative weights', () => {
    const scaled = applyLuckScaling(baseWeights, 0.1);
    Object.values(scaled).forEach((weight) => expect(weight).toBeGreaterThanOrEqual(0));
  });
});

describe('gear model helpers', () => {
  it('returns default gear if an invalid loadout id is given', () => {
    const selected = getSelectedLoadout({
      rodId: 'missing',
      lineId: 'missing',
      bobberId: 'missing',
      enchantId: 'missing',
    });

    expect(selected.rod.id).toBe('sunleaf-rod');
    expect(selected.line.id).toBe('basic-line');
    expect(selected.bobber.id).toBe('basic-bobber');
    expect(selected.enchant.id).toBe('no-enchant');
  });

  it('activates day enchantments during daylight and deactivates them for Any', () => {
    const { enchant } = getSelectedLoadout({
      rodId: 'sunleaf-rod',
      lineId: 'basic-line',
      bobberId: 'basic-bobber',
      enchantId: 'day-walker',
    });

    expect(resolveEnchantActivity(enchant, 'day', 'clear').active).toBe(true);
    expect(resolveEnchantActivity(enchant, 'morning', 'clear').active).toBe(true);
    expect(resolveEnchantActivity(enchant, 'any', 'clear').active).toBe(false);
  });

  it('sums gear stats and direct supported effects into the derived model', () => {
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      loadout: {
        rodId: 'fortunate-rod',
        lineId: 'lucky-line',
        bobberId: 'lucky-bobber',
        enchantId: 'money-maker',
      },
      observedAvgCatchTimeSec: 60,
      observedMissRate: 0.1,
    });

    expect(model.totalStats.luck).toBe(170);
    expect(model.totalStats.bigCatch).toBe(97);
    expect(model.directValueMultiplier).toBeCloseTo(1.2, 5);
    expect(model.directCatchMultiplier).toBeCloseTo(1, 5);
  });

  it('derives estimated time and miss rate from Attraction + Strength + Expertise', () => {
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      timeModelMode: 'estimated',
      loadout: {
        rodId: 'metallic-rod',
        lineId: 'diamond-line',
        bobberId: 'rainbow-slime-bobber',
        enchantId: 'strongest-angler',
      },
      baseBiteTimeSec: 20,
      baseMinigameTimeSec: 40,
      baseMissRate: 0.2,
    });

    expect(model.effectiveBiteTimeSec).toBeDefined();
    expect(model.effectiveMinigameTimeSec).toBeDefined();
    expect(model.effectiveAvgCatchTimeSec).toBeLessThan(60);
    expect(model.effectiveMissRate).toBeLessThan(0.2);
  });

  it('keeps observed timing untouched in observed mode', () => {
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      timeModelMode: 'observed',
      loadout: {
        rodId: 'speedy-rod',
        lineId: 'aquamarine-line',
        bobberId: 'paulie-s-bobber',
        enchantId: 'messenger-of-the-heavens',
      },
      observedAvgCatchTimeSec: 73,
      observedMissRate: 0.31,
    });

    expect(model.effectiveAvgCatchTimeSec).toBe(73);
    expect(model.effectiveMissRate).toBe(0.31);
    expect(model.effectiveBiteTimeSec).toBeUndefined();
  });
});

describe('calculateDistribution', () => {
  const defaultParams = getDefaultParams('coconut-bay');

  it('returns fish results for a valid area', () => {
    const result = calculateDistribution(defaultParams);
    expect(result.fishResults.length).toBeGreaterThan(0);
  });

  it('probabilities sum to approximately 1 - effectiveMissRate', () => {
    const result = calculateDistribution({
      ...defaultParams,
      observedMissRate: 0.1,
    });

    expect(result.totalFishProbability).toBeCloseTo(0.9, 5);
  });

  it('normalizes observed and baseline params', () => {
    const result = calculateDistribution({
      ...defaultParams,
      observedAvgCatchTimeSec: -10,
      observedMissRate: 99,
      baseBiteTimeSec: -1,
      baseMinigameTimeSec: 999,
      baseMissRate: 99,
    });

    expect(result.params.observedAvgCatchTimeSec).toBe(1);
    expect(result.params.observedMissRate).toBe(0.95);
    expect(result.params.baseBiteTimeSec).toBe(1);
    expect(result.params.baseMinigameTimeSec).toBe(300);
    expect(result.params.baseMissRate).toBe(0.95);
  });

  it('matches expectedValuePerCatch to the sum of individual expected values', () => {
    const result = calculateDistribution(defaultParams);
    const expectedValue = result.fishResults.reduce((sum, row) => sum + row.expectedValue, 0);

    expect(result.expectedValuePerCatch).toBeCloseTo(expectedValue, 5);
  });

  it('matches expectedValuePerHour to expectedValuePerCatch * catchesPerHour', () => {
    const result = calculateDistribution({
      ...defaultParams,
      observedAvgCatchTimeSec: 60,
      observedMissRate: 0.1,
    });

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

  it('raises EV when a direct value enchant is equipped', () => {
    const baseResult = calculateDistribution({
      ...defaultParams,
      loadout: {
        ...defaultParams.loadout,
        enchantId: 'no-enchant',
      },
    });
    const boostedResult = calculateDistribution({
      ...defaultParams,
      loadout: {
        ...defaultParams.loadout,
        enchantId: 'money-maker',
      },
    });

    expect(boostedResult.expectedValuePerCatch).toBeGreaterThan(baseResult.expectedValuePerCatch);
  });

  it('raises EV with Double Up!! without changing catch probability', () => {
    const baseResult = calculateDistribution({
      ...defaultParams,
      loadout: {
        ...defaultParams.loadout,
        enchantId: 'no-enchant',
      },
    });
    const boostedResult = calculateDistribution({
      ...defaultParams,
      loadout: {
        ...defaultParams.loadout,
        enchantId: 'double-up',
      },
    });

    expect(boostedResult.expectedValuePerCatch).toBeGreaterThan(baseResult.expectedValuePerCatch);
    expect(boostedResult.totalFishProbability).toBeCloseTo(baseResult.totalFishProbability, 5);
  });

  it('uses zero probability for a tier whose custom weight is zeroed out', () => {
    const pool = getFishPool(defaultParams.areaId);
    const presentTier = CALCULATOR_RARITIES.find((rarity) =>
      pool.some((fish) => fish.rarity === rarity),
    );
    expect(presentTier).toBeDefined();

    const result = calculateDistribution({
      ...defaultParams,
      observedMissRate: 0,
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

    expect(params.observedAvgCatchTimeSec).toBeGreaterThan(0);
    expect(params.observedMissRate).toBeGreaterThanOrEqual(0);
    expect(params.observedMissRate).toBeLessThan(1);
    expect(params.baseBiteTimeSec).toBeGreaterThan(0);
    expect(params.baseMinigameTimeSec).toBeGreaterThan(0);
    expect(params.baseMissRate).toBeGreaterThanOrEqual(0);
    expect(params.baseMissRate).toBeLessThan(1);
    expect(params.loadout.rodId).toBeTruthy();
  });
});
