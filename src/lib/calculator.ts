import { CalculatorParams, DistributionResult, FishEntry, FishResult } from '@/types';
import { FISH_MAP, AREA_MAP } from '@/data/fish';

/**
 * VRChat Fish! probability distribution calculator.
 *
 * SUPPORTED mechanics (used in calculations):
 * - Fish pool per area
 * - Relative catch weights per fish
 * - Base sell prices
 * - User-specified catch time
 * - User-specified "nothing caught" probability
 * - User-specified luck multiplier (applied as a weight scaling factor)
 *
 * UNSUPPORTED / NOT MODELED (kept user-configurable or omitted):
 * - Exact Luck formula (community datamine, license unclear, formula unverified)
 * - Big Catch bonus mechanics (formula unknown)
 * - Attraction system internal details (formula unknown)
 * - Weight-based price bonuses (formula unverified)
 * - Seasonal / time-of-day effects (not enough safe-source data)
 *
 * The Luck multiplier accepted as user input is a simplified approximation:
 * it scales catch weights for fish above common rarity. This is NOT the actual
 * game formula and is disclosed as such in the UI.
 */

/**
 * Get the fish pool for an area.
 */
export function getFishPool(areaId: string): FishEntry[] {
  const area = AREA_MAP[areaId];
  if (!area) return [];
  return area.fishPool.map((id) => FISH_MAP[id]).filter((f): f is FishEntry => f !== undefined);
}

/**
 * Apply a simplified luck scaling to catch weights.
 *
 * THIS IS NOT THE ACTUAL LUCK FORMULA. The real formula is from community
 * datamine and is not used. This is a placeholder that lets users experiment
 * with the effect of luck without claiming precision.
 *
 * Luck multiplier > 1 increases the relative weight of uncommon+ fish.
 * Common fish weight is kept at baseline.
 */
export function applyLuckScaling(
  fish: FishEntry[],
  luckMultiplier: number,
): Array<{ fish: FishEntry; scaledWeight: number }> {
  const RARITY_LUCK_SENSITIVITY: Record<string, number> = {
    common: 0,
    uncommon: 0.3,
    rare: 0.6,
    epic: 0.9,
    legendary: 1.2,
  };

  return fish.map((f) => {
    const base = f.catchWeight ?? 1;
    const sensitivity = RARITY_LUCK_SENSITIVITY[f.rarity] ?? 0;
    // Scale weight: luck > 1 boosts rarer fish proportionally
    const scaledWeight = base * (1 + sensitivity * (luckMultiplier - 1));
    return { fish: f, scaledWeight: Math.max(0, scaledWeight) };
  });
}

/**
 * Calculate probability distribution for a given parameter set.
 */
export function calculateDistribution(params: CalculatorParams): DistributionResult {
  const warnings: string[] = [];
  const pool = getFishPool(params.areaId);

  if (pool.length === 0) {
    warnings.push('選択したエリアに魚データがありません。');
    return {
      params,
      fishResults: [],
      expectedValuePerCatch: 0,
      expectedValuePerHour: 0,
      totalFishProbability: 0,
      warnings,
    };
  }

  // Warn about unsupported mechanics
  if (params.luckMultiplier !== 1.0) {
    warnings.push(
      'ラック倍率は簡略化されたモデルを使用しています。実際のゲーム内ラック計算式とは異なります（非サポートメカニクス）。',
    );
  }
  warnings.push(
    'このカリキュレーターは公式データに基づかない推定値を含みます。Big Catch・アトラクションなどの内部計算式は使用していません。',
  );

  // Apply luck scaling
  const scaledPool = applyLuckScaling(pool, params.luckMultiplier);

  // Apply custom rarity weights if provided
  const effectivePool = scaledPool.map(({ fish, scaledWeight }) => {
    if (params.customRarityWeights && params.customRarityWeights[fish.rarity] !== undefined) {
      return { fish, scaledWeight: params.customRarityWeights[fish.rarity]! * 1000 };
    }
    return { fish, scaledWeight };
  });

  const totalWeight = effectivePool.reduce((sum, { scaledWeight }) => sum + scaledWeight, 0);

  if (totalWeight === 0) {
    warnings.push('全ての魚の重みが0です。パラメータを確認してください。');
    return {
      params,
      fishResults: [],
      expectedValuePerCatch: 0,
      expectedValuePerHour: 0,
      totalFishProbability: 0,
      warnings,
    };
  }

  // Nothing-caught adjusts total probability of catching a fish
  const catchProbabilityScale = 1 - params.nothingCaughtProbability;

  const fishResults: FishResult[] = effectivePool.map(({ fish, scaledWeight }) => {
    const relativeProbability = scaledWeight / totalWeight;
    const probability = relativeProbability * catchProbabilityScale;
    const price = fish.basePrice ?? 0;

    // Expected value per catch attempt (accounting for probability)
    const expectedValue = probability * price;

    return { fish, probability, expectedValue };
  });

  const expectedValuePerCatch = fishResults.reduce((sum, r) => sum + r.expectedValue, 0);
  const catchesPerHour = 3600 / Math.max(1, params.avgCatchTimeSec);
  const expectedValuePerHour = expectedValuePerCatch * catchesPerHour;
  const totalFishProbability = fishResults.reduce((sum, r) => sum + r.probability, 0);

  // Check for missing price data
  const missingPrices = fishResults.filter((r) => r.fish.basePrice === undefined);
  if (missingPrices.length > 0) {
    warnings.push(
      `価格データが不明な魚が ${missingPrices.length} 匹あります: ${missingPrices.map((r) => r.fish.nameJa).join(', ')}`,
    );
  }

  return {
    params,
    fishResults,
    expectedValuePerCatch,
    expectedValuePerHour,
    totalFishProbability,
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

/**
 * Get a default set of calculator parameters.
 */
export function getDefaultParams(areaId = 'lake'): CalculatorParams {
  return {
    areaId,
    avgCatchTimeSec: 60,
    nothingCaughtProbability: 0.1,
    luckMultiplier: 1.0,
  };
}
