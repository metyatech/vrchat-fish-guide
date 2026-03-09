import {
  AREA_MAP,
  CALCULATOR_RARITIES,
  DEFAULT_RARITY_WEIGHT_NOTES,
  DEFAULT_RARITY_WEIGHTS,
  FISH_MAP,
} from '@/data/fish';
import { BOBBER_MAP, ENCHANT_MAP, LINE_MAP, ROD_MAP } from '@/data/equipment';
import {
  APPEARANCE_MODIFIER_COUNT,
  MEAN_SIZE_MULTIPLIER,
  P_ANY_MODIFIER,
  P_APPEARANCE_ONLY,
  P_BOTH_MODIFIERS,
  P_SIZE_ONLY,
  computeModifierEvFactor,
} from '@/data/modifiers';
import {
  CalculatorParams,
  DerivedModelSummary,
  DistributionResult,
  EnchantItem,
  EquipmentItem,
  FishEntry,
  FishResult,
  ModifierAssumptions,
  Rarity,
  StatBlock,
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
 * - Gear stats from public Fandom gear tables
 * - Conditional enchant activation (day/night/rain/fog)
 * - Direct value multipliers for Money Maker / Pocket Watcher / Double Up!!
 *
 * Experimental:
 * - Luck -> rarity weighting transform
 * - Attraction -> bite wait transform
 * - Strength / Expertise -> minigame time and miss-rate transform
 * - Big Catch / Max Weight -> expected weight percentile and price transform
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

const EMPTY_STATS: StatBlock = {
  luck: 0,
  strength: 0,
  expertise: 0,
  attractionPct: 0,
  bigCatch: 0,
  maxWeightKg: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isDaylightTime(timeOfDay: TimeOfDay): boolean {
  return timeOfDay === 'morning' || timeOfDay === 'day' || timeOfDay === 'evening';
}

function scaleFromScore(score: number, baseline: number, min: number, max: number): number {
  return clamp(baseline / Math.max(1, baseline + score), min, max);
}

function addStats(target: StatBlock, item?: EquipmentItem | EnchantItem): StatBlock {
  if (!item) return target;
  return {
    luck: target.luck + item.luck,
    strength: target.strength + item.strength,
    expertise: target.expertise + item.expertise,
    attractionPct: target.attractionPct + item.attractionPct,
    bigCatch: target.bigCatch + item.bigCatch,
    maxWeightKg: target.maxWeightKg + item.maxWeightKg,
  };
}

export function getSelectedLoadout(loadout: CalculatorParams['loadout']) {
  return {
    rod: ROD_MAP[loadout.rodId] ?? ROD_MAP['sunleaf-rod'],
    line: LINE_MAP[loadout.lineId] ?? LINE_MAP['basic-line'],
    bobber: BOBBER_MAP[loadout.bobberId] ?? BOBBER_MAP['basic-bobber'],
    enchant: ENCHANT_MAP[loadout.enchantId] ?? ENCHANT_MAP['no-enchant'],
  };
}

export function resolveEnchantActivity(
  enchant: EnchantItem,
  timeOfDay: TimeOfDay,
  weatherType: WeatherType,
): { active: boolean; reason?: string } {
  if (enchant.id === 'no-enchant') {
    return { active: false };
  }

  if (enchant.activationTime === 'day') {
    if (timeOfDay === 'any') {
      return {
        active: false,
        reason: 'Day-only enchantments stay inactive when Time of Day is Any.',
      };
    }
    if (!isDaylightTime(timeOfDay)) {
      return { active: false, reason: 'This enchant only applies during daylight.' };
    }
  }

  if (enchant.activationTime === 'night' && timeOfDay !== 'night') {
    return {
      active: false,
      reason:
        timeOfDay === 'any'
          ? 'Night-only enchantments stay inactive when Time of Day is Any.'
          : 'This enchant only applies at Night.',
    };
  }

  if (enchant.activationWeather && weatherType !== enchant.activationWeather) {
    return {
      active: false,
      reason:
        weatherType === 'any'
          ? `${enchant.activationWeather} enchantments stay inactive when Weather is Any.`
          : `This enchant only applies in ${enchant.activationWeather} weather.`,
    };
  }

  return { active: true };
}

function normalizeParams(params: CalculatorParams): CalculatorParams {
  const selected = getSelectedLoadout(params.loadout);
  const customRarityWeights = params.customRarityWeights
    ? Object.fromEntries(
        Object.entries(params.customRarityWeights)
          .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
          .map(([rarity, value]) => [rarity, Math.max(0, value ?? 0)]),
      )
    : undefined;

  return {
    ...params,
    loadout: {
      rodId: selected.rod.id,
      lineId: selected.line.id,
      bobberId: selected.bobber.id,
      enchantId: selected.enchant.id,
    },
    timeModelMode: params.timeModelMode === 'estimated' ? 'estimated' : 'observed',
    observedAvgCatchTimeSec: clamp(
      Number.isFinite(params.observedAvgCatchTimeSec) ? params.observedAvgCatchTimeSec : 60,
      1,
      600,
    ),
    observedMissRate: clamp(
      Number.isFinite(params.observedMissRate) ? params.observedMissRate : 0.1,
      0,
      0.95,
    ),
    baseBiteTimeSec: clamp(
      Number.isFinite(params.baseBiteTimeSec) ? params.baseBiteTimeSec : 20,
      1,
      300,
    ),
    baseMinigameTimeSec: clamp(
      Number.isFinite(params.baseMinigameTimeSec) ? params.baseMinigameTimeSec : 40,
      1,
      300,
    ),
    baseMissRate: clamp(Number.isFinite(params.baseMissRate) ? params.baseMissRate : 0.1, 0, 0.95),
    customRarityWeights:
      customRarityWeights && Object.keys(customRarityWeights).length > 0
        ? customRarityWeights
        : undefined,
    modifierAssumptions: params.modifierAssumptions ?? {
      includeModifiers: true,
      assumeCursedToBlessed: true,
    },
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

export function getFishPool(areaId: string): FishEntry[] {
  const area = AREA_MAP[areaId];
  if (!area) return [];
  return area.fishPool
    .map((id) => FISH_MAP[id])
    .filter((fish): fish is FishEntry => fish !== undefined);
}

export function getEligibleFish(
  areaId: string,
  timeOfDay: TimeOfDay,
  weatherType: WeatherType,
): FishEntry[] {
  return getFishPool(areaId).filter(
    (fish) => matchesTimeOfDay(fish, timeOfDay) && matchesWeatherType(fish, weatherType),
  );
}

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

function getDirectMultipliers(enchant?: EnchantItem) {
  let directValueMultiplier = 1;
  let directCatchMultiplier = 1;
  const supportedNotes: string[] = [];
  const unsupportedNotes: string[] = [];

  if (!enchant) {
    return { directValueMultiplier, directCatchMultiplier, supportedNotes, unsupportedNotes };
  }

  for (const effect of enchant.effects) {
    if (effect.type === 'value-multiplier') {
      directValueMultiplier *= effect.value ?? 1;
      supportedNotes.push(`${enchant.nameEn}: ${effect.note}`);
      continue;
    }
    if (effect.type === 'extra-catch-multiplier') {
      directCatchMultiplier *= effect.value ?? 1;
      supportedNotes.push(`${enchant.nameEn}: ${effect.note}`);
      continue;
    }
    unsupportedNotes.push(`${enchant.nameEn}: ${effect.note}`);
  }

  return { directValueMultiplier, directCatchMultiplier, supportedNotes, unsupportedNotes };
}

export function deriveModelSummary(params: CalculatorParams): DerivedModelSummary {
  const normalizedParams = normalizeParams(params);
  const { rod, line, bobber, enchant } = getSelectedLoadout(normalizedParams.loadout);
  const enchantActivity = resolveEnchantActivity(
    enchant,
    normalizedParams.timeOfDay,
    normalizedParams.weatherType,
  );

  let totalStats = { ...EMPTY_STATS };
  totalStats = addStats(totalStats, rod);
  totalStats = addStats(totalStats, line);
  totalStats = addStats(totalStats, bobber);
  if (enchantActivity.active) {
    totalStats = addStats(totalStats, enchant);
  }

  const direct = getDirectMultipliers(enchantActivity.active ? enchant : undefined);
  const effectiveLuckMultiplier = clamp(1 + totalStats.luck / 100, 0.1, 5);
  const weightPercentile = clamp(0.5 + totalStats.bigCatch / 200, 0.05, 0.99);

  const { modifierAssumptions } = normalizedParams;
  const modifierEvFactor = modifierAssumptions.includeModifiers
    ? computeModifierEvFactor(modifierAssumptions.assumeCursedToBlessed)
    : 1.0;

  const supportedNotes = [
    'Rod / Line / Bobber / Enchant のステータス合計は公開 Fandom 表を使っています。',
    ...direct.supportedNotes,
  ];
  const experimentalNotes = [
    `Luck ${totalStats.luck >= 0 ? '+' : ''}${totalStats.luck} は、レアな魚が出やすくなる補正 ${effectiveLuckMultiplier.toFixed(2)}x として入れています。`,
    `Big Catch ${totalStats.bigCatch >= 0 ? '+' : ''}${totalStats.bigCatch} は、重い魚が出やすくなる方向へ ${(weightPercentile * 100).toFixed(0)}% ぶん寄せる推定です。`,
    `Max Weight ${totalStats.maxWeightKg.toLocaleString()}kg は、魚ごとの重さ上限に使っています。`,
  ];
  if (modifierAssumptions.includeModifiers) {
    experimentalNotes.push(
      `見た目・サイズ補正 ${modifierEvFactor.toFixed(3)}x を推定売値に掛けています（見た目 ${APPEARANCE_MODIFIER_COUNT} 種、見た目平均 ${
        modifierAssumptions.assumeCursedToBlessed ? '2.487' : '2.404'
      }x${modifierAssumptions.assumeCursedToBlessed ? '、Cursed→Blessed を含む' : ''}、サイズ平均 ${MEAN_SIZE_MULTIPLIER.toFixed(2)}x、何らかの追加効果 ${(P_ANY_MODIFIER * 100).toFixed(1)}%、見た目だけ ${(P_APPEARANCE_ONLY * 100).toFixed(1)}%、サイズだけ ${(P_SIZE_ONLY * 100).toFixed(1)}%、両方 ${(P_BOTH_MODIFIERS * 100).toFixed(1)}%）。`,
    );
  }
  const unsupportedNotes = [...direct.unsupportedNotes];
  if (!modifierAssumptions.includeModifiers) {
    unsupportedNotes.push('見た目・サイズの追加効果は、いまは期待値に入れていません。');
  }

  if (enchant.id !== 'no-enchant' && !enchantActivity.active && enchantActivity.reason) {
    experimentalNotes.push(`選んでいる Enchant は今は無効です: ${enchantActivity.reason}`);
  }

  if (normalizedParams.timeModelMode === 'observed') {
    experimentalNotes.push(
      '実測値を使う設定では、入力した平均時間と逃がす割合をそのまま使います。Attraction / Strength / Expertise の自動補正はここでは足しません。',
    );
    return {
      loadout: normalizedParams.loadout,
      totalStats,
      enchantActive: enchantActivity.active,
      inactiveEnchantReason: enchantActivity.reason,
      effectiveLuckMultiplier,
      effectiveAvgCatchTimeSec: normalizedParams.observedAvgCatchTimeSec,
      effectiveMissRate: normalizedParams.observedMissRate,
      weightPercentile,
      directValueMultiplier: direct.directValueMultiplier,
      directCatchMultiplier: direct.directCatchMultiplier,
      modifierEvFactor,
      supportedNotes,
      experimentalNotes,
      unsupportedNotes,
    };
  }

  const biteScale = scaleFromScore(totalStats.attractionPct, 100, 0.2, 4);
  const controlScore = totalStats.strength + totalStats.expertise;
  const minigameScale = scaleFromScore(controlScore, 200, 0.3, 3);
  const missScale = scaleFromScore(controlScore, 250, 0.1, 3);
  const effectiveBiteTimeSec = normalizedParams.baseBiteTimeSec * biteScale;
  const effectiveMinigameTimeSec = normalizedParams.baseMinigameTimeSec * minigameScale;
  const effectiveMissRate = clamp(normalizedParams.baseMissRate * missScale, 0, 0.95);

  experimentalNotes.push(
    `装備から見積もる設定では、Attraction ${totalStats.attractionPct >= 0 ? '+' : ''}${totalStats.attractionPct}% を魚が掛かるまでの時間へ、Strength + Expertise (${controlScore >= 0 ? '+' : ''}${controlScore}) をミニゲーム時間と逃がす割合へ反映しています。`,
  );

  return {
    loadout: normalizedParams.loadout,
    totalStats,
    enchantActive: enchantActivity.active,
    inactiveEnchantReason: enchantActivity.reason,
    effectiveLuckMultiplier,
    effectiveAvgCatchTimeSec: effectiveBiteTimeSec + effectiveMinigameTimeSec,
    effectiveMissRate,
    effectiveBiteTimeSec,
    effectiveMinigameTimeSec,
    weightPercentile,
    directValueMultiplier: direct.directValueMultiplier,
    directCatchMultiplier: direct.directCatchMultiplier,
    modifierEvFactor,
    supportedNotes,
    experimentalNotes,
    unsupportedNotes,
  };
}

function getModeledPrice(fish: FishEntry, model: DerivedModelSummary): number | undefined {
  const midPrice = getMidPrice(fish);
  if (midPrice === undefined) return undefined;

  if (
    fish.priceFloor === undefined ||
    fish.priceCeiling === undefined ||
    fish.minWeightKg === undefined ||
    fish.maxWeightKg === undefined ||
    fish.maxWeightKg <= fish.minWeightKg
  ) {
    return midPrice * model.directValueMultiplier;
  }

  const effectiveMaxWeight = Math.max(
    fish.minWeightKg,
    Math.min(fish.maxWeightKg, model.totalStats.maxWeightKg || fish.maxWeightKg),
  );
  const capPercentile = clamp(
    (effectiveMaxWeight - fish.minWeightKg) / (fish.maxWeightKg - fish.minWeightKg),
    0,
    1,
  );
  const effectivePercentile = Math.min(model.weightPercentile, capPercentile);
  const basePrice = fish.priceFloor + (fish.priceCeiling - fish.priceFloor) * effectivePercentile;
  return basePrice * model.directValueMultiplier;
}

export function calculateDistribution(params: CalculatorParams): DistributionResult {
  const normalizedParams = normalizeParams(params);
  const warnings: string[] = [];
  const eligibleFish = getEligibleFish(
    normalizedParams.areaId,
    normalizedParams.timeOfDay,
    normalizedParams.weatherType,
  );
  const model = deriveModelSummary(normalizedParams);

  if (eligibleFish.length === 0) {
    warnings.push('選択したエリア・時間帯・天候に一致する魚データがありません。');
    return {
      params: normalizedParams,
      model,
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

  warnings.push(...DEFAULT_RARITY_WEIGHT_NOTES);
  warnings.push(
    '各 rarity 内では、公開索引に載っている魚を等確率で割り当てる近似モデルを使用しています。',
  );
  warnings.push(
    'Luck / Big Catch / Max Weight の期待値反映には、まだ推定の部分があります。詳細は左の「この計算で使う値」を確認してください。',
  );
  if (normalizedParams.timeModelMode === 'estimated') {
    warnings.push(
      '「装備から自動で見積もる」は、Attraction / Strength / Expertise を使った推定です。',
    );
  }
  if (model.inactiveEnchantReason) {
    warnings.push(model.inactiveEnchantReason);
  }
  warnings.push(...model.unsupportedNotes.map((note) => `未対応特殊効果: ${note}`));

  const effectiveRarityWeights = getEffectiveRarityWeights(
    eligibleFish,
    normalizedParams.customRarityWeights,
    model.effectiveLuckMultiplier,
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
      model,
      fishResults: [],
      expectedValuePerCatch: 0,
      expectedValuePerHour: 0,
      totalFishProbability: 0,
      missingPriceFish: [],
      effectiveRarityWeights,
      warnings,
    };
  }

  const catchProbabilityScale = 1 - model.effectiveMissRate;
  const catchesPerHour = 3600 / model.effectiveAvgCatchTimeSec;

  const fishResults: FishResult[] = [];
  const missingPriceFish: FishEntry[] = [];

  for (const rarity of CALCULATOR_RARITIES) {
    const group = fishByRarity.get(rarity) ?? [];
    if (group.length === 0) continue;

    const tierWeight = effectiveRarityWeights[rarity] ?? 0;
    const tierProbability = (tierWeight / totalRarityWeight) * catchProbabilityScale;
    const perFishProbability = tierProbability / group.length;

    for (const fish of group) {
      const baseModeledPrice = getModeledPrice(fish, model);
      if (baseModeledPrice === undefined) {
        missingPriceFish.push(fish);
      }

      // Apply the modifier EV factor: when modifiers are included (modifierEvFactor > 1),
      // this adjusts the expected price upward to account for the average price bonus from
      // appearance/size modifiers.  When modifiers are not included, modifierEvFactor === 1.
      const modeledPrice = (baseModeledPrice ?? 0) * model.modifierEvFactor;
      const expectedValue = perFishProbability * modeledPrice * model.directCatchMultiplier;
      fishResults.push({
        fish,
        probability: perFishProbability,
        expectedPrice: modeledPrice,
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
    model,
    fishResults,
    expectedValuePerCatch,
    expectedValuePerHour,
    totalFishProbability,
    missingPriceFish,
    effectiveRarityWeights,
    warnings,
  };
}

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

export function getDefaultParams(areaId = 'coconut-bay'): CalculatorParams {
  return {
    areaId,
    weatherType: 'any',
    timeOfDay: 'any',
    loadout: {
      rodId: 'sunleaf-rod',
      lineId: 'basic-line',
      bobberId: 'basic-bobber',
      enchantId: 'no-enchant',
    },
    timeModelMode: 'observed',
    observedAvgCatchTimeSec: 60,
    observedMissRate: 0.1,
    baseBiteTimeSec: 20,
    baseMinigameTimeSec: 40,
    baseMissRate: 0.1,
    modifierAssumptions: {
      includeModifiers: true,
      assumeCursedToBlessed: true,
    },
  };
}
