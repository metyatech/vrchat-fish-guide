/** Source governance classification for each dataset/field */
export type SourceStatus = 'official' | 'community' | 'unclear';
export type ReuseMode = 'fact-only' | 'not-used-directly' | 'unsupported';

export interface DataSource {
  id: string;
  name: string;
  url?: string;
  sourceStatus: SourceStatus;
  reuseMode: ReuseMode;
  licenseStatus: string;
  notes: string;
}

export interface SourceRevisionSnapshot {
  id: string;
  name: string;
  url: string;
  revid: number;
  timestamp: string;
  comment?: string;
}

export interface SourceAuditDiff {
  category: 'fish' | 'rod' | 'line' | 'bobber' | 'enchant';
  name: string;
  field: string;
  localValue: number | string;
  sourceValue: number | string;
}

export interface PublicEntryGap {
  name: string;
  rarity?: string;
  reason: string;
}

export interface FormulaEvidenceStatus {
  id: string;
  label: string;
  status: 'published' | 'qualitative-only' | 'not-found';
  note: string;
  sourceIds: string[];
}

export interface SourceAuditSnapshot {
  checkedAt: string;
  summary: {
    modeledFishCount: number;
    publicFishCount: number;
    inScopeButUnmodeledCount: number;
    outsideCalculatorScopeCount: number;
    modeledDiffCount: number;
    equipmentDiffCount: number;
  };
  revisions: SourceRevisionSnapshot[];
  inScopeButUnmodeled: PublicEntryGap[];
  outsideCalculatorScope: PublicEntryGap[];
  modeledDiffs: SourceAuditDiff[];
  equipmentDiffs: SourceAuditDiff[];
  formulaEvidence: FormulaEvidenceStatus[];
}

/** Catch tier shown in the Fish! minigame */
export type Rarity =
  | 'trash'
  | 'abundant'
  | 'common'
  | 'curious'
  | 'elusive'
  | 'fabled'
  | 'mythic'
  | 'exotic'
  | 'secret'
  | 'ultimate-secret'
  | 'relic';

export type TimeOfDay = 'any' | 'morning' | 'day' | 'evening' | 'night';
export type WeatherType = 'any' | 'clear' | 'rainy' | 'moonrain' | 'stormy' | 'foggy';

/** A single fish entry with provenance metadata */
export interface FishEntry {
  id: string;
  nameJa: string;
  nameEn: string;
  rarity: Rarity;
  /** Minimum sell price in G (fact-only extraction) */
  priceFloor?: number;
  /** Maximum sell price in G (fact-only extraction) */
  priceCeiling?: number;
  /** Min weight in kg (fact-only, source_status=unclear) */
  minWeightKg?: number;
  /** Max weight in kg (fact-only, source_status=unclear) */
  maxWeightKg?: number;
  /** Approximate exemplar weight from community indexes */
  approxWeightKg?: number;
  /** One or more water types this fish belongs to */
  waterTypes: string[];
  /** Weather condition tag published by community indexes */
  weatherType: WeatherType;
  /** Time condition tag published by community indexes */
  timeOfDay: TimeOfDay;
  /** Area IDs where this fish appears */
  areas: string[];
  sourceIds: string[];
  notes?: string;
}

/** Fishing area */
export interface FishingArea {
  id: string;
  nameJa: string;
  nameEn: string;
  fishPool: string[]; // fish IDs available in this area
  waterTypes: string[];
  sourceIds: string[];
}

export interface StatBlock {
  luck: number;
  strength: number;
  expertise: number;
  attractionPct: number;
  bigCatch: number;
  maxWeightKg: number;
}

export type EquipmentCategory = 'rod' | 'line' | 'bobber' | 'enchant';
export type TimeModelMode = 'observed' | 'estimated';
export type EnchantActivationTime = 'day' | 'night';
export type EnchantActivationWeather = 'rainy' | 'foggy';
export type EquipmentEffectType =
  | 'extra-catch-multiplier'
  | 'value-multiplier'
  | 'unsupported-special';

export interface EquipmentEffect {
  type: EquipmentEffectType;
  value?: number;
  note: string;
}

export interface EquipmentItem extends StatBlock {
  id: string;
  category: EquipmentCategory;
  nameEn: string;
  price: number;
  location: string;
  sourceIds: string[];
}

export interface EnchantItem extends EquipmentItem {
  category: 'enchant';
  rarityLabel: string;
  specialEffect: string;
  activationTime?: EnchantActivationTime;
  activationWeather?: EnchantActivationWeather;
  effects: EquipmentEffect[];
}

export interface EquipmentLoadout {
  rodId: string;
  lineId: string;
  bobberId: string;
  enchantId: string;
}

/**
 * User-configurable assumptions for the modifier EV model.
 * Modifiers are appearance / size bonuses that can appear on caught fish.
 * The probability model is based on community observation and is experimental.
 */
export interface ModifierAssumptions {
  /** Whether to include the modifier EV factor in expected-value calculations. Default: true. */
  includeModifiers: boolean;
  /**
   * User-selected policy: if true, treat Cursed as equivalent to Blessed in the appearance
   * multiplier average (~2.487x instead of ~2.404x).  This site models conversion cost and
   * travel time as zero — the remaining uncertainty is in the community-sourced modifier
   * probability data, not in conversion logistics.
   */
  assumeCursedToBlessed: boolean;
}

/** User-configurable parameters for the calculator */
export interface CalculatorParams {
  areaId: string;
  weatherType: WeatherType;
  timeOfDay: TimeOfDay;
  loadout: EquipmentLoadout;
  timeModelMode: TimeModelMode;
  /** Average seconds per attempt after gear effects are already reflected */
  observedAvgCatchTimeSec: number;
  /** Miss rate after gear effects are already reflected */
  observedMissRate: number;
  /** Player baseline bite wait before experimental Attraction scaling */
  baseBiteTimeSec: number;
  /** Player baseline minigame duration before experimental Strength/Expertise scaling */
  baseMinigameTimeSec: number;
  /** Player baseline miss rate before experimental Strength/Expertise scaling */
  baseMissRate: number;
  /** Time from casting to splashdown. User-controlled habit adjustment. */
  castTimeSec: number;
  /** Delay between the "!" appearing and the player starting the minigame. */
  hookReactionTimeSec: number;
  /** Baseline player mistake tendency before gear/rarity scaling. */
  playerMistakeRate: number;
  /** Optional: custom rarity-tier relative weight override */
  customRarityWeights?: Partial<Record<Rarity, number>>;
  /** Modifier EV assumptions (appearance/size bonuses). Default: modifiers not included. */
  modifierAssumptions: ModifierAssumptions;
}

export interface DerivedModelSummary {
  loadout: EquipmentLoadout;
  totalStats: StatBlock;
  enchantActive: boolean;
  enchantState?: 'active' | 'inactive' | 'conditional';
  enchantStatusText?: string;
  inactiveEnchantReason?: string;
  autoSelectedAreaId?: string;
  effectiveLuckMultiplier: number;
  effectiveAvgCatchTimeSec: number;
  effectiveMissRate: number;
  effectiveBiteTimeSec?: number;
  effectiveMinigameTimeSec?: number;
  effectiveCastTimeSec?: number;
  effectiveHookReactionTimeSec?: number;
  weightPercentile: number;
  directValueMultiplier: number;
  directCatchMultiplier: number;
  /**
   * Expected-value multiplier from appearance/size modifier model.
   * 1.0 when modifiers are not included; >1 when experimental modifier model is enabled.
   */
  modifierEvFactor: number;
  supportedNotes: string[];
  experimentalNotes: string[];
  unsupportedNotes: string[];
}

/**
 * A named build configuration that groups a label with calculator parameters.
 * Used for multi-build comparison and URL-share state.
 */
export interface BuildConfig {
  /** Short unique identifier (used as React key and URL anchor) */
  id: string;
  /** User-visible build label */
  name: string;
  params: CalculatorParams;
}

/** Result per fish type */
export interface FishResult {
  fish: FishEntry;
  probability: number;
  expectedPrice: number;
  expectedValue: number;
  expectedValuePerHour: number;
}

/** Distribution result */
export interface DistributionResult {
  params: CalculatorParams;
  model: DerivedModelSummary;
  fishResults: FishResult[];
  /** Expected value per catch (weighted average) */
  expectedValuePerCatch: number;
  /** Expected value per hour */
  expectedValuePerHour: number;
  /** Total probability (should sum to ~1.0 minus nothingCaught) */
  totalFishProbability: number;
  /** Fish entries excluded because required pricing data is missing */
  missingPriceFish: FishEntry[];
  /** Effective rarity weights used after defaults, overrides, and luck scaling */
  effectiveRarityWeights: Partial<Record<Rarity, number>>;
  /** Warnings about unsupported mechanics or missing data */
  warnings: string[];
}
