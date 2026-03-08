import {
  AREA_MAP,
  CALCULATOR_RARITIES,
  DEFAULT_RARITY_WEIGHT_NOTES,
  DEFAULT_RARITY_WEIGHTS,
  FISH_MAP,
} from '@/data/fish';
import {
  CalculatorParams,
  DistributionResult,
  FishEntry,
  FishResult,
  Rarity,
  TimeOfDay,
  WeatherType,
} from '@/types';

/**
 * Fish! calculator model.
 *
 * Supported:
 * - Area fish pools from the public Fandom Index
 * - Time-of-day filtering from public community indexes
 * - Weather filtering from public community indexes
 * - Price ranges from fact-only community spreadsheets
 * - Per-rarity weighting based on the published rarity table
 * - User-overridden rarity weights
 * - User-specified average catch time
 * - User-specified nothing-caught probability
 *
 * Not supported:
 * - Exact Luck / Big Catch / Attraction internal formulas
 * - Exact weight-to-price curve
 * - Secret / ultimate-secret probabilities
 * - Trash / relic pools in the main fish calculator
 */

const RARITY_LUCK_SENSITIVITY: Partial<Record<Rarity, number>> = {
  abundant: 0,
  common: 0.2,
  curious: 0.45,
  elusive: 0.7,
  fabled: 0.95,
  mythic: 1.25,
  exotic: 1.6,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeParams(params: CalculatorParams): CalculatorParams {
  const customRarityWeights = params.customRarityWeights
    ? Object.fromEntries(
        Object.entries(params.customRarityWeights)
          .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
          .map(([rarity, value]) => [rarity, Math.max(0, value ?? 0)]),
      )
    : undefined;

  return {
    ...params,
    avgCatchTimeSec: clamp(
      Number.isFinite(params.avgCatchTimeSec) ? params.avgCatchTimeSec : 60,
      1,
      600,
    ),
    nothingCaughtProbability: clamp(
      Number.isFinite(params.nothingCaughtProbability) ? params.nothingCaughtProbability : 0.1,
      0,
      0.95,
    ),
    luckMultiplier: clamp(
      Number.isFinite(params.luckMultiplier) ? params.luckMultiplier : 1,
      0.1,
      5,
    ),
    customRarityWeights:
      customRarityWeights && Object.keys(customRarityWeights).length > 0
        ? customRarityWeights
        : undefined,
  };
}

function isCalculatorRarity(rarity: Rarity): rarity is (typeof CALCULATOR_RARITIES)[number] {
  return CALCULATOR_RARITIES.includes(rarity);
}

function getMidPrice(fish: FishEntry): number | undefined {
  if (fish.priceFloor !== undefined && fish.priceCeiling !== undefined) {
    return (fish.priceFloor + fish.priceCeiling) / 2;
  }
  if (fish.priceFloor !== undefined) return fish.priceFloor;
  if (fish.priceCeiling !== undefined) return fish.priceCeiling;
  return undefined;
}

function matchesTimeOfDay(fish: FishEntry, selected: TimeOfDay): boolean {
  return selected === 'any' || fish.timeOfDay === 'any' || fish.timeOfDay === selected;
}

function matchesWeatherType(fish: FishEntry, selected: WeatherType): boolean {
  return selected === 'any' || fish.weatherType === 'any' || fish.weatherType === selected;
}

/**
 * Get the full fish pool for an area.
 */
export function getFishPool(areaId: string): FishEntry[] {
  const area = AREA_MAP[areaId];
  if (!area) return [];
  return area.fishPool
    .map((id) => FISH_MAP[id])
    .filter((fish): fish is FishEntry => fish !== undefined);
}

/**
 * Apply public condition tags as availability filters.
 */
export function getEligibleFish(
  areaId: string,
  timeOfDay: TimeOfDay,
  weatherType: WeatherType,
): FishEntry[] {
  return getFishPool(areaId).filter(
    (fish) => matchesTimeOfDay(fish, timeOfDay) && matchesWeatherType(fish, weatherType),
  );
}

/**
 * Apply a simplified Luck scaling on rarity-tier weights.
 *
 * This is still experimental. The public sources only describe the direction
 * of the effect ("increases rarity"), not the exact formula.
 */
export function applyLuckScaling(
  rarityWeights: Partial<Record<Rarity, number>>,
  luckMultiplier: number,
): Partial<Record<Rarity, number>> {
  const result: Partial<Record<Rarity, number>> = {};

  for (const rarity of CALCULATOR_RARITIES) {
    const baseWeight = rarityWeights[rarity] ?? 0;
    const sensitivity = RARITY_LUCK_SENSITIVITY[rarity] ?? 0;
    result[rarity] = Math.max(0, baseWeight * (1 + sensitivity * (luckMultiplier - 1)));
  }

  return result;
}

export function getEffectiveRarityWeights(
  fishPool: FishEntry[],
  customRarityWeights?: Partial<Record<Rarity, number>>,
  luckMultiplier = 1,
): Partial<Record<Rarity, number>> {
  const weights: Partial<Record<Rarity, number>> = {};

  for (const rarity of CALCULATOR_RARITIES) {
    const hasFishInTier = fishPool.some((fish) => fish.rarity === rarity);
    if (!hasFishInTier) continue;
    weights[rarity] = Math.max(
      0,
      customRarityWeights?.[rarity] ?? DEFAULT_RARITY_WEIGHTS[rarity] ?? 0,
    );
  }

  return applyLuckScaling(weights, luckMultiplier);
}

/**
 * Calculate probability distribution for a given parameter set.
 *
 * Model:
 * 1. Filter fish by area / time / weather tags
 * 2. Assign rarity-tier weights
 * 3. Split each tier weight evenly across fish in that tier
 * 4. Apply nothing-caught probability at the end
 * 5. Use sell-price midpoint as the current expected price
 */
export function calculateDistribution(params: CalculatorParams): DistributionResult {
  const normalizedParams = normalizeParams(params);
  const warnings: string[] = [];
  const eligibleFish = getEligibleFish(
    normalizedParams.areaId,
    normalizedParams.timeOfDay,
    normalizedParams.weatherType,
  );

  if (eligibleFish.length === 0) {
    warnings.push('選択したエリア・時間帯・天候に一致する魚データがありません。');
    return {
      params: normalizedParams,
      fishResults: [],
      expectedValuePerCatch: 0,
      expectedValuePerHour: 0,
      totalFishProbability: 0,
      missingPriceFish: [],
      effectiveRarityWeights: {},
      warnings,
    };
  }

  if (normalizedParams.timeOfDay !== 'any' || normalizedParams.weatherType !== 'any') {
    warnings.push(
      '時間帯・天候タグは公開 community index の条件表示に基づくフィルタです。内部の 1.5x ボーナス式まではモデル化していません。',
    );
  }

  if (normalizedParams.luckMultiplier !== 1) {
    warnings.push(
      'ラック倍率は「高 rarity ほど重みを押し上げる」近似モデルです。実際のゲーム内 Luck 式ではありません。',
    );
  }

  warnings.push(...DEFAULT_RARITY_WEIGHT_NOTES);
  warnings.push(
    '各 rarity 内では、公開索引に載っている魚を等確率で割り当てる近似モデルを使用しています。',
  );

  const effectiveRarityWeights = getEffectiveRarityWeights(
    eligibleFish,
    normalizedParams.customRarityWeights,
    normalizedParams.luckMultiplier,
  );

  const fishByRarity = new Map<Rarity, FishEntry[]>();
  for (const fish of eligibleFish) {
    if (!isCalculatorRarity(fish.rarity)) continue;
    const group = fishByRarity.get(fish.rarity) ?? [];
    group.push(fish);
    fishByRarity.set(fish.rarity, group);
  }

  const totalRarityWeight = Object.values(effectiveRarityWeights).reduce(
    (sum, weight) => sum + (weight ?? 0),
    0,
  );

  if (totalRarityWeight <= 0) {
    warnings.push('有効な rarity 重みが 0 です。レアリティ設定を確認してください。');
    return {
      params: normalizedParams,
      fishResults: [],
      expectedValuePerCatch: 0,
      expectedValuePerHour: 0,
      totalFishProbability: 0,
      missingPriceFish: [],
      effectiveRarityWeights,
      warnings,
    };
  }

  const catchProbabilityScale = 1 - normalizedParams.nothingCaughtProbability;
  const catchesPerHour = 3600 / normalizedParams.avgCatchTimeSec;

  const fishResults: FishResult[] = [];
  const missingPriceFish: FishEntry[] = [];

  for (const rarity of CALCULATOR_RARITIES) {
    const group = fishByRarity.get(rarity) ?? [];
    if (group.length === 0) continue;

    const tierWeight = effectiveRarityWeights[rarity] ?? 0;
    const tierProbability = (tierWeight / totalRarityWeight) * catchProbabilityScale;
    const perFishProbability = tierProbability / group.length;

    for (const fish of group) {
      const expectedPrice = getMidPrice(fish);
      if (expectedPrice === undefined) {
        missingPriceFish.push(fish);
      }

      const expectedValue = perFishProbability * (expectedPrice ?? 0);
      fishResults.push({
        fish,
        probability: perFishProbability,
        expectedPrice: expectedPrice ?? 0,
        expectedValue,
        expectedValuePerHour: expectedValue * catchesPerHour,
      });
    }
  }

  if (missingPriceFish.length > 0) {
    warnings.push(
      `価格レンジ未取得の魚が ${missingPriceFish.length} 種あります。期待値はそれらを 0G 扱いした下限値です: ${missingPriceFish
        .map((fish) => fish.nameEn)
        .join(', ')}`,
    );
  }

  const expectedValuePerCatch = fishResults.reduce((sum, row) => sum + row.expectedValue, 0);
  const expectedValuePerHour = expectedValuePerCatch * catchesPerHour;
  const totalFishProbability = fishResults.reduce((sum, row) => sum + row.probability, 0);

  return {
    params: normalizedParams,
    fishResults,
    expectedValuePerCatch,
    expectedValuePerHour,
    totalFishProbability,
    missingPriceFish,
    effectiveRarityWeights,
    warnings,
  };
}

/**
 * Format a number as a compact currency string.
 */
export function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}kG`;
  }
  return `${Math.round(value)}G`;
}

export function formatPriceRange(fish: FishEntry): string {
  if (fish.priceFloor !== undefined && fish.priceCeiling !== undefined) {
    return `${fish.priceFloor}G - ${fish.priceCeiling}G`;
  }
  if (fish.priceFloor !== undefined) return `${fish.priceFloor}G`;
  if (fish.priceCeiling !== undefined) return `${fish.priceCeiling}G`;
  return '—';
}

export function formatWeightRange(fish: FishEntry): string {
  if (fish.minWeightKg !== undefined && fish.maxWeightKg !== undefined) {
    return `${fish.minWeightKg}kg - ${fish.maxWeightKg}kg`;
  }
  if (fish.approxWeightKg !== undefined) return `~${fish.approxWeightKg}kg`;
  return '—';
}

/**
 * Get a default set of calculator parameters.
 */
export function getDefaultParams(areaId = 'coconut-bay'): CalculatorParams {
  return {
    areaId,
    weatherType: 'any',
    timeOfDay: 'any',
    avgCatchTimeSec: 60,
    nothingCaughtProbability: 0.1,
    luckMultiplier: 1,
  };
}
