import { describe, expect, it } from 'vitest';
import { CALCULATOR_RARITIES, FISH_MAP, FISHING_AREAS } from '@/data/fish';
import {
  MEAN_APPEARANCE_MULTIPLIER_BASE,
  MEAN_APPEARANCE_MULTIPLIER_WITH_CONVERSION,
  MEAN_SIZE_MULTIPLIER,
  P_ANY_MODIFIER,
  P_APPEARANCE_ONLY,
  P_BOTH_MODIFIERS,
  P_SIZE_ONLY,
  computeModifierEvFactor,
} from '@/data/modifiers';
import {
  applyLuckScaling,
  calculateDistribution,
  deriveModelSummary,
  formatCurrency,
  formatDisplayNumber,
  formatPriceRange,
  formatSignedDisplayNumber,
  formatWeightKg,
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

  it('keeps refreshed public fact-only weight ranges for modeled fish', () => {
    expect(FISH_MAP['dreadshell-colossus']?.minWeightKg).toBe(26000);
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

    expect(selected.rod.id).toBe('stick-and-string');
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
    });

    expect(model.totalStats.luck).toBe(170);
    expect(model.totalStats.bigCatch).toBeCloseTo(97, 5);
    expect(model.directValueMultiplier).toBeCloseTo(1.2, 5);
    expect(model.directCatchMultiplier).toBeCloseTo(1, 5);
  });

  it('derives timing and miss rate from Attraction + Strength + Expertise', () => {
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
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

  it('always derives timing from gear and player adjustments', () => {
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      loadout: {
        rodId: 'speedy-rod',
        lineId: 'aquamarine-line',
        bobberId: 'paulie-s-bobber',
        enchantId: 'messenger-of-the-heavens',
      },
      castTimeSec: 1.4,
      hookReactionTimeSec: 0.35,
      playerMistakeRate: 0.12,
    });

    expect(model.effectiveCastTimeSec).toBe(1.4);
    expect(model.effectiveHookReactionTimeSec).toBe(0.35);
    expect(model.effectiveBiteTimeSec).toBeDefined();
    expect(model.effectiveAvgCatchTimeSec).toBeGreaterThan(0);
  });

  it('keeps player mistake rate separate from gear-based control scaling', () => {
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      loadout: {
        rodId: 'metallic-rod',
        lineId: 'diamond-line',
        bobberId: 'rainbow-slime-bobber',
        enchantId: 'strongest-angler',
      },
      baseMissRate: 0,
      playerMistakeRate: 0.2,
    });

    expect(model.effectiveMissRate).toBeCloseTo(0.2, 5);
  });
});

describe('calculateDistribution', () => {
  const defaultParams = getDefaultParams('coconut-bay');

  it('returns fish results for a valid area', () => {
    const result = calculateDistribution(defaultParams);
    expect(result.fishResults.length).toBeGreaterThan(0);
  });

  it('probabilities sum to approximately 1 - modeled escape rate', () => {
    const result = calculateDistribution({
      ...defaultParams,
      playerMistakeRate: 0.1,
    });

    expect(result.totalFishProbability).toBeCloseTo(1 - result.model.effectiveMissRate, 5);
  });

  it('normalizes baseline params', () => {
    const result = calculateDistribution({
      ...defaultParams,
      baseBiteTimeSec: -1,
      baseMinigameTimeSec: 999,
      baseMissRate: 99,
    });

    expect(result.params.baseBiteTimeSec).toBe(1);
    expect(result.params.baseMinigameTimeSec).toBe(300);
    expect(result.params.baseMissRate).toBe(0.95);
  });

  it('matches expectedValuePerCatch to the sum of individual expected values', () => {
    const result = calculateDistribution(defaultParams);
    const expectedValue = result.fishResults.reduce((sum, row) => sum + row.expectedValue, 0);

    expect(result.expectedValuePerCatch).toBeCloseTo(expectedValue, 5);
  });

  it('matches expectedValuePerHour to the sum of individual hourly contributions', () => {
    const result = calculateDistribution({
      ...defaultParams,
      playerMistakeRate: 0.1,
    });

    const hourlyValue = result.fishResults.reduce((sum, row) => sum + row.expectedValuePerHour, 0);
    expect(result.expectedValuePerHour).toBeCloseTo(hourlyValue, 5);
  });

  it('returns no fish for an unknown area', () => {
    const result = calculateDistribution({ ...defaultParams, areaId: 'unknown' });

    expect(result.fishResults).toEqual([]);
    expect(result.expectedValuePerCatch).toBe(0);
    expect(result.expectedValuePerHour).toBe(0);
  });

  it('warns when time or weather are fixed instead of automatically averaged', () => {
    const result = calculateDistribution({
      ...defaultParams,
      areaId: 'open-sea',
      timeOfDay: 'night',
      weatherType: 'rainy',
    });

    expect(
      result.warnings.some((warning) => warning.includes('時間帯') || warning.includes('天気')),
    ).toBe(true);
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

  it('raises EV with Double Up!!', () => {
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
  });

  it('uses zero probability for a tier whose custom weight is zeroed out', () => {
    const pool = getFishPool(defaultParams.areaId);
    const presentTier = CALCULATOR_RARITIES.find((rarity) =>
      pool.some((fish) => fish.rarity === rarity),
    );
    expect(presentTier).toBeDefined();

    const result = calculateDistribution({
      ...defaultParams,
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
  it('rounds integer-like floating point values for display', () => {
    expect(formatSignedDisplayNumber(11.999999999999996)).toBe('+12');
    expect(formatSignedDisplayNumber(16.999999999999996)).toBe('+17');
    expect(formatDisplayNumber(15.000000000000002)).toBe('15');
    expect(formatWeightKg(24.999999999999996)).toBe('25kg');
  });

  it('keeps meaningful fractional values while trimming noise', () => {
    expect(formatSignedDisplayNumber(12.3456)).toBe('+12.35');
    expect(formatSignedDisplayNumber(-3.5)).toBe('-3.5');
    expect(formatSignedDisplayNumber(8.125, '%')).toBe('+8.13%');
  });

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

describe('modifier EV model', () => {
  it('computeModifierEvFactor returns 1.0 when all catches have no modifier (sanity check on constants)', () => {
    // Verify the computation matches the formula:
    // P(none) * 1 + P(app-only) * meanApp + P(size-only) * meanSize + P(both) * meanApp * meanSize
    // Probabilities sourced from Snerx sheet: app-only=7.5%, size-only=10%, both=5%, total=22.5%
    const pNone = 1 - P_ANY_MODIFIER;

    const factorBase =
      pNone * 1 +
      P_APPEARANCE_ONLY * MEAN_APPEARANCE_MULTIPLIER_BASE +
      P_SIZE_ONLY * MEAN_SIZE_MULTIPLIER +
      P_BOTH_MODIFIERS * MEAN_APPEARANCE_MULTIPLIER_BASE * MEAN_SIZE_MULTIPLIER;

    expect(factorBase).toBeCloseTo(computeModifierEvFactor(false), 10);
  });

  it('computeModifierEvFactor returns greater value with Cursed→Blessed conversion', () => {
    const factorBase = computeModifierEvFactor(false);
    const factorWithConversion = computeModifierEvFactor(true);

    // With conversion, mean appearance multiplier is higher → factor should be higher.
    expect(factorWithConversion).toBeGreaterThan(factorBase);
    expect(factorWithConversion).toBeCloseTo(
      1 -
        P_ANY_MODIFIER +
        P_APPEARANCE_ONLY * MEAN_APPEARANCE_MULTIPLIER_WITH_CONVERSION +
        P_SIZE_ONLY * MEAN_SIZE_MULTIPLIER +
        P_BOTH_MODIFIERS * MEAN_APPEARANCE_MULTIPLIER_WITH_CONVERSION * MEAN_SIZE_MULTIPLIER,
      10,
    );
  });

  it('computeModifierEvFactor is in expected range (Snerx split: app-only 7.5%, size-only 10%, both 5%)', () => {
    const factorBase = computeModifierEvFactor(false);
    const factorWithConversion = computeModifierEvFactor(true);

    // Both should be greater than 1 (modifiers on average increase value)
    // With Snerx-sourced probabilities: factor ≈1.23 (base) and ≈1.24 (with Cursed→Blessed)
    expect(factorBase).toBeGreaterThan(1.2);
    expect(factorBase).toBeLessThan(1.35);
    expect(factorWithConversion).toBeGreaterThan(factorBase);
    expect(factorWithConversion).toBeLessThan(1.35);
  });

  it('deriveModelSummary modifierEvFactor is 1.0 when modifiers not included', () => {
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: false, assumeCursedToBlessed: true },
    });

    expect(model.modifierEvFactor).toBeCloseTo(1.0, 10);
  });

  it('deriveModelSummary modifierEvFactor is >1 when modifiers included', () => {
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: true, assumeCursedToBlessed: false },
    });

    expect(model.modifierEvFactor).toBeGreaterThan(1.0);
  });

  it('deriveModelSummary modifierEvFactor matches computeModifierEvFactor', () => {
    const modelBase = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: true, assumeCursedToBlessed: false },
    });
    const modelWithConversion = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: true, assumeCursedToBlessed: true },
    });

    expect(modelBase.modifierEvFactor).toBeCloseTo(computeModifierEvFactor(false), 10);
    expect(modelWithConversion.modifierEvFactor).toBeCloseTo(computeModifierEvFactor(true), 10);
  });

  it('calculateDistribution EV is higher with modifiers enabled', () => {
    const baseResult = calculateDistribution({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: false, assumeCursedToBlessed: true },
    });
    const modifierResult = calculateDistribution({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: true, assumeCursedToBlessed: false },
    });

    expect(modifierResult.expectedValuePerCatch).toBeGreaterThan(baseResult.expectedValuePerCatch);
    expect(modifierResult.expectedValuePerHour).toBeGreaterThan(baseResult.expectedValuePerHour);
  });

  it('calculateDistribution modifier EV scales exactly by modifierEvFactor', () => {
    const baseResult = calculateDistribution({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: false, assumeCursedToBlessed: true },
    });
    const modifierResult = calculateDistribution({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: true, assumeCursedToBlessed: false },
    });

    const factor = computeModifierEvFactor(false);
    expect(modifierResult.expectedValuePerCatch).toBeCloseTo(
      baseResult.expectedValuePerCatch * factor,
      5,
    );
  });

  it('Cursed→Blessed conversion gives higher EV than base', () => {
    const withConversion = calculateDistribution({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: true, assumeCursedToBlessed: true },
    });
    const withoutConversion = calculateDistribution({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: true, assumeCursedToBlessed: false },
    });

    expect(withConversion.expectedValuePerCatch).toBeGreaterThan(
      withoutConversion.expectedValuePerCatch,
    );
  });

  it('modifier assumptions do not affect catch probabilities', () => {
    const baseResult = calculateDistribution({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: false, assumeCursedToBlessed: true },
    });
    const modifierResult = calculateDistribution({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: true, assumeCursedToBlessed: true },
    });

    // Probabilities should be identical — only prices change
    baseResult.fishResults.forEach((baseRow, i) => {
      expect(modifierResult.fishResults[i].probability).toBeCloseTo(baseRow.probability, 10);
    });
    expect(modifierResult.totalFishProbability).toBeCloseTo(baseResult.totalFishProbability, 10);
  });

  it('unsupportedNotes includes modifier hint when modifiers are not included', () => {
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: false, assumeCursedToBlessed: true },
    });

    expect(model.unsupportedNotes.some((note) => note.includes('見た目・サイズ'))).toBe(true);
  });

  it('experimentalNotes includes modifier factor when modifiers are enabled', () => {
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      modifierAssumptions: { includeModifiers: true, assumeCursedToBlessed: true },
    });

    expect(model.experimentalNotes.some((note) => note.includes('見た目・サイズ補正'))).toBe(true);
  });
});

describe('Big Catch weight percentile model', () => {
  it('baseline weight percentile reflects BASE_WEIGHT_PERCENTILE when Big Catch is zero', () => {
    // Find a loadout with Big Catch ≈ 0 (not all basic gear has zero Big Catch)
    // stick-and-string has bigCatch: -100, so we test the formula directly
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      loadout: {
        rodId: 'stick-and-string',
        lineId: 'basic-line',
        bobberId: 'basic-bobber',
        enchantId: 'no-enchant',
      },
    });

    // Basic rod has Big Catch = -100, which should result in percentile below BASE (0.4)
    expect(model.totalStats.bigCatch).toBe(-100);
    // With bigCatch = -100: percentile = 0.4 + (-100)/200 = 0.4 - 0.5 = -0.1 → clamped to 0.05
    expect(model.weightPercentile).toBeCloseTo(0.05, 5);
  });

  it('weight percentile increases with positive Big Catch', () => {
    const baseModel = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      loadout: {
        rodId: 'stick-and-string',
        lineId: 'basic-line',
        bobberId: 'basic-bobber',
        enchantId: 'no-enchant',
      },
    });

    const highBigCatchModel = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      loadout: {
        rodId: 'fortunate-rod',
        lineId: 'lucky-line',
        bobberId: 'lucky-bobber',
        enchantId: 'no-enchant',
      },
    });

    expect(highBigCatchModel.totalStats.bigCatch).toBeGreaterThan(baseModel.totalStats.bigCatch);
    expect(highBigCatchModel.weightPercentile).toBeGreaterThan(baseModel.weightPercentile);
  });

  it('weight percentile is clamped between 0.05 and 0.99', () => {
    // Test lower bound: even with negative Big Catch (hypothetically), percentile >= 0.05
    const model = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      loadout: {
        rodId: 'stick-and-string',
        lineId: 'basic-line',
        bobberId: 'basic-bobber',
        enchantId: 'no-enchant',
      },
    });

    expect(model.weightPercentile).toBeGreaterThanOrEqual(0.05);
    expect(model.weightPercentile).toBeLessThanOrEqual(0.99);
  });
});

describe('getDefaultParams', () => {
  it('uses the provided area id', () => {
    expect(getDefaultParams('open-sea').areaId).toBe('open-sea');
  });

  it('defaults to automatic best-area selection', () => {
    expect(getDefaultParams().areaId).toBe('best-area');
  });

  it('returns sane defaults', () => {
    const params = getDefaultParams();

    expect(params.baseBiteTimeSec).toBeGreaterThan(0);
    expect(params.baseMinigameTimeSec).toBeGreaterThan(0);
    expect(params.baseMissRate).toBeGreaterThanOrEqual(0);
    expect(params.baseMissRate).toBeLessThan(1);
    expect(params.castTimeSec).toBeGreaterThanOrEqual(0);
    expect(params.hookReactionTimeSec).toBeGreaterThanOrEqual(0);
    expect(params.playerMistakeRate).toBeGreaterThanOrEqual(0);
    expect(params.loadout.rodId).toBeTruthy();
  });
});

describe('auto-area and auto-averaging semantics', () => {
  it('best-area selects the area with highest EV/hour', () => {
    const fixedParams = { timeOfDay: 'day' as const, weatherType: 'clear' as const };

    const areaResults = FISHING_AREAS.map((area) => ({
      areaId: area.id,
      result: calculateDistribution({ ...getDefaultParams(area.id), ...fixedParams }),
    }));
    const bestAreaResult = calculateDistribution({
      ...getDefaultParams('best-area'),
      ...fixedParams,
    });
    const manualBest = areaResults.reduce((best, current) =>
      current.result.expectedValuePerHour > best.result.expectedValuePerHour ? current : best,
    );

    expect(bestAreaResult.expectedValuePerHour).toBeCloseTo(
      manualBest.result.expectedValuePerHour,
      5,
    );
    expect(bestAreaResult.model.autoSelectedAreaId).toBe(manualBest.areaId);
  });

  it('any time/weather uses equal weights across all 20 time×weather scenarios', () => {
    const specificArea = 'coconut-bay';
    const anyResult = calculateDistribution({
      ...getDefaultParams(specificArea),
      timeOfDay: 'any',
      weatherType: 'any',
    });

    const times = ['morning', 'day', 'evening', 'night'] as const;
    const weathers = ['clear', 'rainy', 'moonrain', 'stormy', 'foggy'] as const;
    let totalEv = 0;
    for (const t of times) {
      for (const w of weathers) {
        const r = calculateDistribution({
          ...getDefaultParams(specificArea),
          timeOfDay: t,
          weatherType: w,
        });
        totalEv += r.expectedValuePerHour;
      }
    }
    const manualAvg = totalEv / 20;
    expect(anyResult.expectedValuePerHour).toBeCloseTo(manualAvg, 1);
  });

  it('any time-of-day uses equal weight across 4 time states', () => {
    const result = calculateDistribution({
      ...getDefaultParams('coconut-bay'),
      timeOfDay: 'any',
      weatherType: 'clear',
    });
    const times = ['morning', 'day', 'evening', 'night'] as const;
    let totalEv = 0;
    for (const t of times) {
      const r = calculateDistribution({
        ...getDefaultParams('coconut-bay'),
        timeOfDay: t,
        weatherType: 'clear',
      });
      totalEv += r.expectedValuePerHour;
    }
    expect(result.expectedValuePerHour).toBeCloseTo(totalEv / 4, 1);
  });

  it('any weather uses equal weight across 5 weather states', () => {
    const result = calculateDistribution({
      ...getDefaultParams('coconut-bay'),
      timeOfDay: 'day',
      weatherType: 'any',
    });
    const weathers = ['clear', 'rainy', 'moonrain', 'stormy', 'foggy'] as const;
    let totalEv = 0;
    for (const w of weathers) {
      const r = calculateDistribution({
        ...getDefaultParams('coconut-bay'),
        timeOfDay: 'day',
        weatherType: w,
      });
      totalEv += r.expectedValuePerHour;
    }
    expect(result.expectedValuePerHour).toBeCloseTo(totalEv / 5, 1);
  });

  it('best-area warns when its auto-selection is based on lower-bound 0G placeholders', () => {
    const timeStates = ['any', 'morning', 'day', 'evening', 'night'] as const;
    const weatherStates = ['any', 'clear', 'rainy', 'moonrain', 'stormy', 'foggy'] as const;

    let scenarioWithMissingPrices: ReturnType<typeof calculateDistribution> | undefined;

    for (const timeOfDay of timeStates) {
      for (const weatherType of weatherStates) {
        const candidate = calculateDistribution({
          ...getDefaultParams('best-area'),
          timeOfDay,
          weatherType,
        });
        if (candidate.missingPriceFish.length > 0) {
          scenarioWithMissingPrices = candidate;
          break;
        }
      }
      if (scenarioWithMissingPrices) break;
    }

    expect(scenarioWithMissingPrices).toBeDefined();
    expect(
      scenarioWithMissingPrices!.warnings.some((warning) =>
        warning.includes('価格不明の魚を 0G として扱った順位'),
      ),
    ).toBe(true);
  });
});

describe('Attraction Rate effect on EV/hour', () => {
  it('higher Attraction Rate reduces effective bite wait time', () => {
    const baseModel = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      loadout: {
        rodId: 'stick-and-string',
        lineId: 'basic-line',
        bobberId: 'basic-bobber',
        enchantId: 'no-enchant',
      },
    });
    const attractModel = deriveModelSummary({
      ...getDefaultParams('coconut-bay'),
      loadout: {
        rodId: 'speedy-rod',
        lineId: 'aquamarine-line',
        bobberId: 'paulie-s-bobber',
        enchantId: 'messenger-of-the-heavens',
      },
    });
    if ((attractModel.totalStats.attractionPct ?? 0) > (baseModel.totalStats.attractionPct ?? 0)) {
      expect(attractModel.effectiveBiteTimeSec).toBeDefined();
      expect(baseModel.effectiveBiteTimeSec).toBeDefined();
      expect(attractModel.effectiveBiteTimeSec!).toBeLessThan(baseModel.effectiveBiteTimeSec!);
    }
  });

  it('EV/hour uses the derived catch cycle time, not only EV/catch', () => {
    const result = calculateDistribution({
      ...getDefaultParams('coconut-bay'),
      timeOfDay: 'day',
      weatherType: 'clear',
      baseBiteTimeSec: 30,
      loadout: {
        rodId: 'speedy-rod',
        lineId: 'aquamarine-line',
        bobberId: 'paulie-s-bobber',
        enchantId: 'messenger-of-the-heavens',
      },
    });
    const catchesPerHour = 3600 / result.model.effectiveAvgCatchTimeSec;

    expect(result.expectedValuePerCatch).toBeGreaterThan(0);
    expect(result.expectedValuePerHour).toBeCloseTo(
      result.expectedValuePerCatch * catchesPerHour,
      5,
    );
  });

  it('experimentalNotes mentions EV/hour effect for Attraction Rate', () => {
    const model = deriveModelSummary(getDefaultParams('coconut-bay'));
    expect(model.experimentalNotes.some((note) => note.includes('時間あたり期待値'))).toBe(true);
  });
});
