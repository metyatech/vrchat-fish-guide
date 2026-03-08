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

/** User-configurable parameters for the calculator */
export interface CalculatorParams {
  areaId: string;
  weatherType: WeatherType;
  timeOfDay: TimeOfDay;
  /** Average seconds per catch attempt (user-specified) */
  avgCatchTimeSec: number;
  /** Optional: custom rarity-tier relative weight override */
  customRarityWeights?: Partial<Record<Rarity, number>>;
  /** Whether to include "nothing caught" probability */
  nothingCaughtProbability: number;
  /** Luck multiplier (user-specified, default 1.0; formula is unsupported) */
  luckMultiplier: number;
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
