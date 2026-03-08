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

/** Rarity tier for fish */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** A single fish entry with provenance metadata */
export interface FishEntry {
  id: string;
  nameJa: string;
  nameEn: string;
  rarity: Rarity;
  /** Base sell price in G (fact-only, source_status=unclear) */
  basePrice?: number;
  /** Min weight in kg (fact-only, source_status=unclear) */
  minWeightKg?: number;
  /** Max weight in kg (fact-only, source_status=unclear) */
  maxWeightKg?: number;
  /** Catch probability weight (relative, not absolute probability) */
  catchWeight?: number;
  sourceId: string;
  notes?: string;
}

/** Fishing area */
export interface FishingArea {
  id: string;
  nameJa: string;
  nameEn: string;
  fishPool: string[]; // fish IDs available in this area
}

/** User-configurable parameters for the calculator */
export interface CalculatorParams {
  areaId: string;
  /** Average seconds per catch attempt (user-specified) */
  avgCatchTimeSec: number;
  /** Optional: custom rarity weights override (sum should be 1.0) */
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
  expectedValue: number;
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
  /** Warnings about unsupported mechanics or missing data */
  warnings: string[];
}
