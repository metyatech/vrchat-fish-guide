import {
  AREA_MAP,
  CALCULATOR_RARITIES,
  DEFAULT_RARITY_WEIGHT_NOTES,
  DEFAULT_RARITY_WEIGHTS,
  FISH_MAP,
  FISHING_AREAS,
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

const ALL_TIME_OF_DAY: Exclude<TimeOfDay, 'any'>[] = ['morning', 'day', 'evening', 'night'];
const ALL_WEATHER_TYPES: Exclude<WeatherType, 'any'>[] = [
  'clear',
  'rainy',
  'moonrain',
  'stormy',
  'foggy',
];

const TIME_OF_DAY_LABELS: Record<Exclude<TimeOfDay, 'any'>, string> = {
  morning: '朝',
  day: '昼',
  evening: '夕方',
  night: '夜',
};

const WEATHER_LABELS: Record<Exclude<WeatherType, 'any'>, string> = {
  clear: '晴れ',
  rainy: '雨',
  moonrain: 'Moonrain',
  stormy: '嵐',
  foggy: '霧',
};

const RARITY_MINIGAME_FACTOR: Partial<Record<Rarity, number>> = {
  abundant: 0.85,
  common: 1,
  curious: 1.12,
  elusive: 1.28,
  fabled: 1.5,
  mythic: 1.8,
  exotic: 2.1,
};

const RARITY_ESCAPE_FACTOR: Partial<Record<Rarity, number>> = {
  abundant: 0.55,
  common: 0.8,
  curious: 1,
  elusive: 1.2,
  fabled: 1.5,
  mythic: 1.9,
  exotic: 2.25,
};

/**
 * Base weight percentile when Big Catch stat is zero.
 *
 * This is an INDEPENDENT APPROXIMATION. The actual in-game weight distribution
 * without Big Catch is unknown. A value below 0.5 (median) reflects the common
 * game design pattern where baseline stats tend toward below-average results,
 * making positive stats more valuable.
 *
 * Experimental: may be adjusted based on community observation.
 */
const BASE_WEIGHT_PERCENTILE = 0.4;

/**
 * Sensitivity coefficient for Big Catch stat to weight percentile conversion.
 *
 * This is an INDEPENDENT APPROXIMATION. The scale is chosen so that typical
 * Big Catch values (~0-200) map to reasonable percentile shifts.
 *
 * Experimental: scaling factor is not derived from published formulas.
 */
const BIG_CATCH_SENSITIVITY = 200;

export const BEST_AREA_ID = 'best-area';

const DISPLAY_NUMBER_FORMATTERS = new Map<number, Intl.NumberFormat>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getDisplayFormatter(maxFractionDigits: number): Intl.NumberFormat {
  const existing = DISPLAY_NUMBER_FORMATTERS.get(maxFractionDigits);
  if (existing) return existing;

  const formatter = new Intl.NumberFormat('ja-JP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
  DISPLAY_NUMBER_FORMATTERS.set(maxFractionDigits, formatter);
  return formatter;
}

export function roundDisplayValue(value: number, maxFractionDigits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** maxFractionDigits;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatDisplayNumber(value: number, maxFractionDigits = 2): string {
  const rounded = roundDisplayValue(value, maxFractionDigits);
  return getDisplayFormatter(maxFractionDigits).format(rounded);
}

export function formatSignedDisplayNumber(
  value: number,
  suffix = '',
  maxFractionDigits = 2,
): string {
  const rounded = roundDisplayValue(value, maxFractionDigits);
  if (rounded === 0) return `0${suffix}`;
  return `${rounded > 0 ? '+' : ''}${formatDisplayNumber(rounded, maxFractionDigits)}${suffix}`;
}

export function formatWeightKg(value: number, maxFractionDigits = 2): string {
  return `${formatDisplayNumber(value, maxFractionDigits)}kg`;
}

function isDaylightTime(timeOfDay: TimeOfDay): boolean {
  return timeOfDay === 'morning' || timeOfDay === 'day' || timeOfDay === 'evening';
}

function formatTimeOfDayLabel(timeOfDay: Exclude<TimeOfDay, 'any'>): string {
  return TIME_OF_DAY_LABELS[timeOfDay];
}

function formatWeatherLabel(weatherType: Exclude<WeatherType, 'any'>): string {
  return WEATHER_LABELS[weatherType];
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
    rod: ROD_MAP[loadout.rodId] ?? ROD_MAP['stick-and-string'],
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
        reason: '時間帯を自動にしている間は、昼だけ有効な Enchant を常時有効として扱えません。',
      };
    }
    if (!isDaylightTime(timeOfDay)) {
      return { active: false, reason: 'この Enchant は昼の時間帯だけ有効です。' };
    }
  }

  if (enchant.activationTime === 'night' && timeOfDay !== 'night') {
    return {
      active: false,
      reason:
        timeOfDay === 'any'
          ? '時間帯を自動にしている間は、夜だけ有効な Enchant を常時有効として扱えません。'
          : 'この Enchant は夜だけ有効です。',
    };
  }

  if (enchant.activationWeather && weatherType !== enchant.activationWeather) {
    return {
      active: false,
      reason:
        weatherType === 'any'
          ? `天気を自動にしている間は、${formatWeatherLabel(enchant.activationWeather)}でだけ有効な Enchant を常時有効として扱えません。`
          : `この Enchant は${formatWeatherLabel(enchant.activationWeather)}のときだけ有効です。`,
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
    castTimeSec: clamp(Number.isFinite(params.castTimeSec) ? params.castTimeSec : 1.2, 0, 15),
    hookReactionTimeSec: clamp(
      Number.isFinite(params.hookReactionTimeSec) ? params.hookReactionTimeSec : 0.2,
      0,
      10,
    ),
    playerMistakeRate: clamp(
      Number.isFinite(params.playerMistakeRate) ? params.playerMistakeRate : 0.04,
      0,
      0.95,
    ),
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

interface ConditionScenario {
  timeOfDay: Exclude<TimeOfDay, 'any'>;
  weatherType: Exclude<WeatherType, 'any'>;
  weight: number;
}

function getConditionScenarios(
  timeOfDay: TimeOfDay,
  weatherType: WeatherType,
): ConditionScenario[] {
  const timeStates = timeOfDay === 'any' ? ALL_TIME_OF_DAY : [timeOfDay];
  const weatherStates = weatherType === 'any' ? ALL_WEATHER_TYPES : [weatherType];
  const total = timeStates.length * weatherStates.length;

  return timeStates.flatMap((timeState) =>
    weatherStates.map((weatherState) => ({
      timeOfDay: timeState,
      weatherType: weatherState,
      weight: 1 / total,
    })),
  );
}

function getAreaCandidateIds(areaId: string): string[] {
  if (areaId === BEST_AREA_ID) {
    return FISHING_AREAS.map((area) => area.id);
  }
  return [areaId];
}

function getScenarioEnchantState(
  normalizedParams: CalculatorParams,
  timeOfDay: Exclude<TimeOfDay, 'any'>,
  weatherType: Exclude<WeatherType, 'any'>,
) {
  const { enchant } = getSelectedLoadout(normalizedParams.loadout);
  return resolveEnchantActivity(enchant, timeOfDay, weatherType);
}

function deriveScenarioModel(
  normalizedParams: CalculatorParams,
  timeOfDay: Exclude<TimeOfDay, 'any'>,
  weatherType: Exclude<WeatherType, 'any'>,
): DerivedModelSummary {
  const { rod, line, bobber, enchant } = getSelectedLoadout(normalizedParams.loadout);
  const enchantActivity = getScenarioEnchantState(normalizedParams, timeOfDay, weatherType);

  let totalStats = { ...EMPTY_STATS };
  totalStats = addStats(totalStats, rod);
  totalStats = addStats(totalStats, line);
  totalStats = addStats(totalStats, bobber);
  if (enchantActivity.active) {
    totalStats = addStats(totalStats, enchant);
  }

  const direct = getDirectMultipliers(enchantActivity.active ? enchant : undefined);
  const effectiveLuckMultiplier = clamp(1 + totalStats.luck / 100, 0.1, 5);
  const weightPercentile = clamp(
    BASE_WEIGHT_PERCENTILE + totalStats.bigCatch / BIG_CATCH_SENSITIVITY,
    0.05,
    0.99,
  );

  const { modifierAssumptions } = normalizedParams;
  const modifierEvFactor = modifierAssumptions.includeModifiers
    ? computeModifierEvFactor(modifierAssumptions.assumeCursedToBlessed)
    : 1.0;

  const biteScale = scaleFromScore(totalStats.attractionPct, 100, 0.2, 4);
  const controlScore = totalStats.strength + totalStats.expertise;
  const minigameScale = scaleFromScore(controlScore, 200, 0.3, 3);
  const missScale = scaleFromScore(controlScore, 250, 0.1, 3);
  const effectiveCastTimeSec = normalizedParams.castTimeSec;
  const effectiveHookReactionTimeSec = normalizedParams.hookReactionTimeSec;
  const effectiveBiteTimeSec = normalizedParams.baseBiteTimeSec * biteScale;
  const effectiveMinigameTimeSec = normalizedParams.baseMinigameTimeSec * minigameScale;
  const effectiveMissRate = clamp(
    normalizedParams.baseMissRate * missScale + normalizedParams.playerMistakeRate,
    0,
    0.95,
  );

  const supportedNotes = [
    'Rod / Line / Bobber / Enchant のステータス合計は公開 Fandom 表を使っています。',
    ...direct.supportedNotes,
  ];
  const experimentalNotes = [
    `Luck ${formatSignedDisplayNumber(totalStats.luck)} は、レアな魚が出やすくなる推定補正 ${effectiveLuckMultiplier.toFixed(2)}x として入れています。`,
    `Attraction Rate ${formatSignedDisplayNumber(totalStats.attractionPct, '%')} は、魚が掛かるまでの待ち時間に反映しています（待ち時間が短くなるほど時間あたり期待値も上がります）。`,
    `Strength + Expertise (${formatSignedDisplayNumber(controlScore)}) は、ミニゲーム時間と基本の逃がしやすさに反映しています。プレイヤーが操作で出すミス率は別に加算しています。`,
    `Big Catch Rate ${formatSignedDisplayNumber(totalStats.bigCatch)} は、重い個体が出やすい側へ ${(weightPercentile * 100).toFixed(0)}% ぶん寄せる推定です。`,
    `Max Weight ${formatWeightKg(totalStats.maxWeightKg)} は、魚ごとの重さ上限をどこまで使うかの目安にしています。`,
  ];
  if (modifierAssumptions.includeModifiers) {
    experimentalNotes.push(
      `見た目・サイズ補正は、推定売値に ${modifierEvFactor.toFixed(3)}x を掛けています（見た目 ${APPEARANCE_MODIFIER_COUNT} 種、見た目平均 ${
        modifierAssumptions.assumeCursedToBlessed ? '2.487' : '2.404'
      }x${modifierAssumptions.assumeCursedToBlessed ? '、Cursed→Blessed を含む' : ''}、サイズ平均 ${MEAN_SIZE_MULTIPLIER.toFixed(2)}x、何らかの追加効果 ${(P_ANY_MODIFIER * 100).toFixed(1)}%、見た目だけ ${(P_APPEARANCE_ONLY * 100).toFixed(1)}%、サイズだけ ${(P_SIZE_ONLY * 100).toFixed(1)}%、両方 ${(P_BOTH_MODIFIERS * 100).toFixed(1)}%）。`,
    );
  }
  const unsupportedNotes = [...direct.unsupportedNotes];
  if (!modifierAssumptions.includeModifiers) {
    unsupportedNotes.push('見た目・サイズの追加効果は、いまは期待値に入れていません。');
  }

  return {
    loadout: normalizedParams.loadout,
    totalStats,
    enchantActive: enchantActivity.active,
    enchantState: enchantActivity.active ? 'active' : 'inactive',
    enchantStatusText:
      enchant.id === 'no-enchant'
        ? 'Enchant なし'
        : enchantActivity.active
          ? 'この条件では Enchant が有効'
          : 'この条件では Enchant が無効',
    inactiveEnchantReason: enchantActivity.reason,
    effectiveLuckMultiplier,
    effectiveAvgCatchTimeSec:
      effectiveCastTimeSec +
      effectiveBiteTimeSec +
      effectiveHookReactionTimeSec +
      effectiveMinigameTimeSec,
    effectiveMissRate,
    effectiveBiteTimeSec,
    effectiveMinigameTimeSec,
    effectiveCastTimeSec,
    effectiveHookReactionTimeSec,
    weightPercentile,
    directValueMultiplier: direct.directValueMultiplier,
    directCatchMultiplier: direct.directCatchMultiplier,
    modifierEvFactor,
    supportedNotes,
    experimentalNotes,
    unsupportedNotes,
  };
}

export function deriveModelSummary(params: CalculatorParams): DerivedModelSummary {
  const normalizedParams = normalizeParams(params);
  const { enchant } = getSelectedLoadout(normalizedParams.loadout);
  const scenarios = getConditionScenarios(normalizedParams.timeOfDay, normalizedParams.weatherType);
  const scenarioModels = scenarios.map((scenario) => ({
    scenario,
    model: deriveScenarioModel(normalizedParams, scenario.timeOfDay, scenario.weatherType),
  }));

  const totalStats = scenarioModels.reduce(
    (acc, { scenario, model }) => ({
      luck: acc.luck + model.totalStats.luck * scenario.weight,
      strength: acc.strength + model.totalStats.strength * scenario.weight,
      expertise: acc.expertise + model.totalStats.expertise * scenario.weight,
      attractionPct: acc.attractionPct + model.totalStats.attractionPct * scenario.weight,
      bigCatch: acc.bigCatch + model.totalStats.bigCatch * scenario.weight,
      maxWeightKg: acc.maxWeightKg + model.totalStats.maxWeightKg * scenario.weight,
    }),
    { ...EMPTY_STATS },
  );

  const anyActive = scenarioModels.some(({ model }) => model.enchantActive);
  const allActive = scenarioModels.every(({ model }) => model.enchantActive);
  const areaText =
    normalizedParams.areaId === BEST_AREA_ID ? '自動選択されるエリアの候補全体' : '選んだエリア';

  const supportedNotes = Array.from(
    new Set(
      scenarioModels
        .flatMap(({ model }) => model.supportedNotes)
        .concat([
          normalizedParams.areaId === BEST_AREA_ID
            ? '釣り場を自動にすると、その条件で期待値/時間が最も高い場所を選びます。'
            : '釣り場を固定すると、その場所だけで計算します。',
        ]),
    ),
  );
  const experimentalNotes = Array.from(
    new Set(
      scenarioModels
        .flatMap(({ model }) => model.experimentalNotes)
        .concat([
          normalizedParams.timeOfDay === 'any' || normalizedParams.weatherType === 'any'
            ? '時間帯 / 天気を自動にすると、公開されている各状態を同じ比率で平均して計算します。'
            : '時間帯 / 天気は選んだ条件に固定して計算します。',
        ]),
    ),
  );
  const unsupportedNotes = Array.from(
    new Set(scenarioModels.flatMap(({ model }) => model.unsupportedNotes)),
  );

  if (normalizedParams.timeOfDay === 'any') {
    experimentalNotes.push(
      '時間帯を自動にすると、朝 / 昼 / 夕方 / 夜を固定せず同じ比率で平均します。',
    );
  }
  if (normalizedParams.weatherType === 'any') {
    experimentalNotes.push(
      '天気を自動にすると、晴れ / 雨 / Moonrain / 嵐 / 霧を固定せず同じ比率で平均します。',
    );
  }

  let enchantState: DerivedModelSummary['enchantState'] = 'inactive';
  let enchantStatusText = 'Enchant なし';
  let inactiveEnchantReason: string | undefined;

  if (enchant.id !== 'no-enchant') {
    if (allActive) {
      enchantState = 'active';
      enchantStatusText = 'この条件では Enchant が有効';
    } else if (anyActive) {
      enchantState = 'conditional';
      enchantStatusText = '条件によって Enchant が有効/無効になる';
      inactiveEnchantReason = `${areaText} では、この Enchant が有効になる条件と無効な条件が混ざります。`;
    } else {
      enchantState = 'inactive';
      enchantStatusText = 'この条件では Enchant が無効';
      inactiveEnchantReason =
        scenarioModels.find(({ model }) => model.inactiveEnchantReason)?.model
          .inactiveEnchantReason ?? 'この条件では Enchant が無効です。';
    }
  }

  return {
    loadout: normalizedParams.loadout,
    totalStats,
    enchantActive: anyActive,
    enchantState,
    enchantStatusText,
    inactiveEnchantReason,
    effectiveLuckMultiplier: scenarioModels.reduce(
      (sum, { scenario, model }) => sum + model.effectiveLuckMultiplier * scenario.weight,
      0,
    ),
    effectiveAvgCatchTimeSec: scenarioModels.reduce(
      (sum, { scenario, model }) => sum + model.effectiveAvgCatchTimeSec * scenario.weight,
      0,
    ),
    effectiveMissRate: scenarioModels.reduce(
      (sum, { scenario, model }) => sum + model.effectiveMissRate * scenario.weight,
      0,
    ),
    effectiveBiteTimeSec: scenarioModels.reduce(
      (sum, { scenario, model }) => sum + (model.effectiveBiteTimeSec ?? 0) * scenario.weight,
      0,
    ),
    effectiveMinigameTimeSec: scenarioModels.reduce(
      (sum, { scenario, model }) => sum + (model.effectiveMinigameTimeSec ?? 0) * scenario.weight,
      0,
    ),
    effectiveCastTimeSec: scenarioModels.reduce(
      (sum, { scenario, model }) => sum + (model.effectiveCastTimeSec ?? 0) * scenario.weight,
      0,
    ),
    effectiveHookReactionTimeSec: scenarioModels.reduce(
      (sum, { scenario, model }) =>
        sum + (model.effectiveHookReactionTimeSec ?? 0) * scenario.weight,
      0,
    ),
    weightPercentile: scenarioModels.reduce(
      (sum, { scenario, model }) => sum + model.weightPercentile * scenario.weight,
      0,
    ),
    directValueMultiplier: scenarioModels.reduce(
      (sum, { scenario, model }) => sum + model.directValueMultiplier * scenario.weight,
      0,
    ),
    directCatchMultiplier: scenarioModels.reduce(
      (sum, { scenario, model }) => sum + model.directCatchMultiplier * scenario.weight,
      0,
    ),
    modifierEvFactor: scenarioModels.reduce(
      (sum, { scenario, model }) => sum + model.modifierEvFactor * scenario.weight,
      0,
    ),
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

interface AreaConditionDistribution {
  areaId: string;
  timeOfDay: Exclude<TimeOfDay, 'any'>;
  weatherType: Exclude<WeatherType, 'any'>;
  model: DerivedModelSummary;
  fishResults: FishResult[];
  expectedValuePerCatch: number;
  expectedValuePerHour: number;
  totalFishProbability: number;
  missingPriceFish: FishEntry[];
  effectiveRarityWeights: Partial<Record<Rarity, number>>;
  warnings: string[];
}

function calculateAreaConditionDistribution(
  normalizedParams: CalculatorParams,
  areaId: string,
  timeOfDay: Exclude<TimeOfDay, 'any'>,
  weatherType: Exclude<WeatherType, 'any'>,
): AreaConditionDistribution {
  const warnings: string[] = [];
  const eligibleFish = getEligibleFish(areaId, timeOfDay, weatherType);
  const model = deriveScenarioModel(normalizedParams, timeOfDay, weatherType);

  if (eligibleFish.length === 0) {
    warnings.push('選択した条件に一致する魚データがありません。');
    return {
      areaId,
      timeOfDay,
      weatherType,
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
      areaId,
      timeOfDay,
      weatherType,
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

  const fishResults: FishResult[] = [];
  const missingPriceFish: FishEntry[] = [];
  const effectiveCastTimeSec = model.effectiveCastTimeSec ?? normalizedParams.castTimeSec;
  const effectiveBiteTimeSec = model.effectiveBiteTimeSec ?? normalizedParams.baseBiteTimeSec;
  const effectiveHookReactionTimeSec =
    model.effectiveHookReactionTimeSec ?? normalizedParams.hookReactionTimeSec;

  let expectedMinigameTimeSec = 0;
  let weightedEscapeRate = 0;

  for (const rarity of CALCULATOR_RARITIES) {
    const group = fishByRarity.get(rarity) ?? [];
    if (group.length === 0) continue;

    const tierWeight = effectiveRarityWeights[rarity] ?? 0;
    const tierEncounterProbability = tierWeight / totalRarityWeight;
    const perFishEncounterProbability = tierEncounterProbability / group.length;
    const rarityEscapeFactor = RARITY_ESCAPE_FACTOR[rarity] ?? 1;
    const rarityMinigameFactor = RARITY_MINIGAME_FACTOR[rarity] ?? 1;
    const successRate = clamp(1 - model.effectiveMissRate * rarityEscapeFactor, 0.02, 1);

    expectedMinigameTimeSec +=
      perFishEncounterProbability *
      group.length *
      (model.effectiveMinigameTimeSec ?? 0) *
      rarityMinigameFactor;
    weightedEscapeRate += perFishEncounterProbability * group.length * (1 - successRate);

    for (const fish of group) {
      const baseModeledPrice = getModeledPrice(fish, model);
      if (baseModeledPrice === undefined) {
        missingPriceFish.push(fish);
      }

      const modeledPrice = (baseModeledPrice ?? 0) * model.modifierEvFactor;
      const probability = perFishEncounterProbability * successRate;
      const expectedValue = probability * modeledPrice * model.directCatchMultiplier;
      fishResults.push({
        fish,
        probability,
        expectedPrice: modeledPrice,
        expectedValue,
        expectedValuePerHour: 0,
      });
    }
  }

  const expectedAttemptTimeSec =
    effectiveCastTimeSec +
    effectiveBiteTimeSec +
    effectiveHookReactionTimeSec +
    expectedMinigameTimeSec;
  const catchesPerHour = 3600 / Math.max(1, expectedAttemptTimeSec);

  for (const row of fishResults) {
    row.expectedValuePerHour = row.expectedValue * catchesPerHour;
  }

  const expectedValuePerCatch = fishResults.reduce((sum, row) => sum + row.expectedValue, 0);
  const expectedValuePerHour = expectedValuePerCatch * catchesPerHour;
  const totalFishProbability = fishResults.reduce((sum, row) => sum + row.probability, 0);

  return {
    areaId,
    timeOfDay,
    weatherType,
    model: {
      ...model,
      effectiveAvgCatchTimeSec: expectedAttemptTimeSec,
      effectiveMinigameTimeSec: expectedMinigameTimeSec,
      effectiveMissRate: weightedEscapeRate,
    },
    fishResults,
    expectedValuePerCatch,
    expectedValuePerHour,
    totalFishProbability,
    missingPriceFish,
    effectiveRarityWeights,
    warnings,
  };
}

export function calculateDistribution(params: CalculatorParams): DistributionResult {
  const normalizedParams = normalizeParams(params);
  const areaCandidates = getAreaCandidateIds(normalizedParams.areaId);
  const conditionScenarios = getConditionScenarios(
    normalizedParams.timeOfDay,
    normalizedParams.weatherType,
  );
  const displayModel = deriveModelSummary(normalizedParams);
  const warnings: string[] = [...DEFAULT_RARITY_WEIGHT_NOTES];

  const areaResults = areaCandidates
    .map((areaId) => {
      const scenarioResults = conditionScenarios.map((scenario) =>
        calculateAreaConditionDistribution(
          normalizedParams,
          areaId,
          scenario.timeOfDay,
          scenario.weatherType,
        ),
      );

      const fishMap = new Map<string, FishResult>();
      const missingPriceMap = new Map<string, FishEntry>();
      const rarityWeightTotals: Partial<Record<Rarity, number>> = {};
      const scenarioWarnings = new Set<string>();

      let expectedValuePerCatch = 0;
      let expectedValuePerHour = 0;
      let totalFishProbability = 0;
      let effectiveAvgCatchTimeSec = 0;
      let effectiveMissRate = 0;
      let effectiveMinigameTimeSec = 0;

      for (let i = 0; i < scenarioResults.length; i += 1) {
        const scenarioResult = scenarioResults[i];
        const weight = conditionScenarios[i].weight;
        expectedValuePerCatch += scenarioResult.expectedValuePerCatch * weight;
        expectedValuePerHour += scenarioResult.expectedValuePerHour * weight;
        totalFishProbability += scenarioResult.totalFishProbability * weight;
        effectiveAvgCatchTimeSec += scenarioResult.model.effectiveAvgCatchTimeSec * weight;
        effectiveMissRate += scenarioResult.model.effectiveMissRate * weight;
        effectiveMinigameTimeSec += (scenarioResult.model.effectiveMinigameTimeSec ?? 0) * weight;

        scenarioResult.warnings.forEach((warning) => scenarioWarnings.add(warning));
        scenarioResult.missingPriceFish.forEach((fish) => missingPriceMap.set(fish.id, fish));
        Object.entries(scenarioResult.effectiveRarityWeights).forEach(([rarity, weightValue]) => {
          rarityWeightTotals[rarity as Rarity] =
            (rarityWeightTotals[rarity as Rarity] ?? 0) + (weightValue ?? 0) * weight;
        });

        for (const row of scenarioResult.fishResults) {
          const current = fishMap.get(row.fish.id);
          if (current) {
            current.probability += row.probability * weight;
            current.expectedPrice += row.expectedPrice * weight;
            current.expectedValue += row.expectedValue * weight;
            current.expectedValuePerHour += row.expectedValuePerHour * weight;
          } else {
            fishMap.set(row.fish.id, {
              fish: row.fish,
              probability: row.probability * weight,
              expectedPrice: row.expectedPrice * weight,
              expectedValue: row.expectedValue * weight,
              expectedValuePerHour: row.expectedValuePerHour * weight,
            });
          }
        }
      }

      const fishResults = Array.from(fishMap.values()).sort(
        (a, b) => b.expectedValuePerHour - a.expectedValuePerHour,
      );

      return {
        areaId,
        fishResults,
        expectedValuePerCatch,
        expectedValuePerHour,
        totalFishProbability,
        missingPriceFish: Array.from(missingPriceMap.values()),
        effectiveRarityWeights: rarityWeightTotals,
        warnings: Array.from(scenarioWarnings),
        effectiveAvgCatchTimeSec,
        effectiveMissRate,
        effectiveMinigameTimeSec,
      };
    })
    .filter((result) => result.fishResults.length > 0);

  if (areaResults.length === 0) {
    warnings.push('選択した条件に一致する魚データがありません。');
    return {
      params: normalizedParams,
      model: displayModel,
      fishResults: [],
      expectedValuePerCatch: 0,
      expectedValuePerHour: 0,
      totalFishProbability: 0,
      missingPriceFish: [],
      effectiveRarityWeights: {},
      warnings,
    };
  }

  const bestAreaResult = areaResults.reduce((best, current) =>
    current.expectedValuePerHour > best.expectedValuePerHour ? current : best,
  );

  if (normalizedParams.areaId === BEST_AREA_ID) {
    warnings.push('釣り場は自動選択です。候補ごとに期待値/時間が最も高い場所を採用しています。');
  } else {
    warnings.push('釣り場は固定です。選んだ場所の中だけで比較しています。');
  }

  if (normalizedParams.timeOfDay === 'any') {
    warnings.push('時間帯は固定せず、朝 / 昼 / 夕方 / 夜を同じ比率で平均しています。');
  } else {
    warnings.push(`時間帯は${formatTimeOfDayLabel(normalizedParams.timeOfDay)}に固定しています。`);
  }
  if (normalizedParams.weatherType === 'any') {
    warnings.push('天気は固定せず、晴れ / 雨 / Moonrain / 嵐 / 霧を同じ比率で平均しています。');
  } else {
    warnings.push(`天気は${formatWeatherLabel(normalizedParams.weatherType)}に固定しています。`);
  }

  warnings.push(
    '同じレア度の魚は、公開されている索引に載っている魚をいったん同じ出やすさとして配分しています。',
  );
  warnings.push(
    'Luck / Big Catch Rate / Max Weight の効き方は公開情報だけでは足りないため、期待値にはまだ推定が入っています。',
  );
  warnings.push('逃がしやすさはレア度ごとの近似です。魚ごとの正確な内部式は公開されていません。');
  if (displayModel.inactiveEnchantReason) {
    warnings.push(displayModel.inactiveEnchantReason);
  }
  warnings.push(...bestAreaResult.warnings);
  warnings.push(...displayModel.unsupportedNotes.map((note) => `未対応特殊効果: ${note}`));

  if (bestAreaResult.missingPriceFish.length > 0) {
    warnings.push(
      `価格レンジ未取得の魚が ${bestAreaResult.missingPriceFish.length} 種あります。期待値はそれらを 0G 扱いした下限値です: ${bestAreaResult.missingPriceFish
        .map((fish) => fish.nameEn)
        .join(', ')}`,
    );
    if (normalizedParams.areaId === BEST_AREA_ID) {
      warnings.push(
        '釣り場自動選択の結果は、価格不明の魚を 0G として扱った順位に基づいています。実際の EV/時間はこの表示より高い可能性があります。',
      );
    }
  }

  return {
    params: normalizedParams,
    model: {
      ...displayModel,
      autoSelectedAreaId: bestAreaResult.areaId,
      effectiveAvgCatchTimeSec: bestAreaResult.effectiveAvgCatchTimeSec,
      effectiveMissRate: bestAreaResult.effectiveMissRate,
      effectiveMinigameTimeSec: bestAreaResult.effectiveMinigameTimeSec,
    },
    fishResults: bestAreaResult.fishResults,
    expectedValuePerCatch: bestAreaResult.expectedValuePerCatch,
    expectedValuePerHour: bestAreaResult.expectedValuePerHour,
    totalFishProbability: bestAreaResult.totalFishProbability,
    missingPriceFish: bestAreaResult.missingPriceFish,
    effectiveRarityWeights: bestAreaResult.effectiveRarityWeights,
    warnings: Array.from(new Set(warnings)),
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

export function getDefaultParams(areaId = BEST_AREA_ID): CalculatorParams {
  return {
    areaId,
    weatherType: 'any',
    timeOfDay: 'any',
    loadout: {
      rodId: 'stick-and-string',
      lineId: 'basic-line',
      bobberId: 'basic-bobber',
      enchantId: 'no-enchant',
    },
    baseBiteTimeSec: 20,
    baseMinigameTimeSec: 40,
    baseMissRate: 0.1,
    castTimeSec: 1.2,
    hookReactionTimeSec: 0.2,
    playerMistakeRate: 0.04,
    modifierAssumptions: {
      includeModifiers: true,
      assumeCursedToBlessed: true,
    },
  };
}
