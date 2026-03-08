import { FishEntry, FishingArea } from '@/types';

/**
 * Fish data — fact-only extraction.
 *
 * source_status: unclear (community wiki + in-game observation; license unknown)
 * reuse_mode: fact-only (only numerical values extracted, no expressive content)
 *
 * All values are approximate and community-reported. Treat as best-effort.
 * Do NOT claim these are authoritative game data.
 *
 * catchWeight values are relative weights (not absolute probabilities).
 * Actual probabilities depend on area, mechanics, and potentially Luck multipliers
 * which use unsupported internal formulas.
 */
export const FISH_DATA: FishEntry[] = [
  // --- Common ---
  {
    id: 'goldfish',
    nameJa: '金魚',
    nameEn: 'Goldfish',
    rarity: 'common',
    basePrice: 10,
    minWeightKg: 0.01,
    maxWeightKg: 0.1,
    catchWeight: 100,
    sourceId: 'vrchat-fish-wikiwiki',
    notes: 'Common freshwater fish. Price community-reported.',
  },
  {
    id: 'carp',
    nameJa: '鯉',
    nameEn: 'Carp',
    rarity: 'common',
    basePrice: 15,
    minWeightKg: 0.5,
    maxWeightKg: 5.0,
    catchWeight: 80,
    sourceId: 'vrchat-fish-wikiwiki',
    notes: 'Common freshwater fish.',
  },
  {
    id: 'crucian-carp',
    nameJa: '鮒',
    nameEn: 'Crucian Carp',
    rarity: 'common',
    basePrice: 12,
    minWeightKg: 0.1,
    maxWeightKg: 1.0,
    catchWeight: 90,
    sourceId: 'vrchat-fish-wikiwiki',
    notes: 'Common freshwater fish.',
  },
  // --- Uncommon ---
  {
    id: 'bass',
    nameJa: 'バス',
    nameEn: 'Bass',
    rarity: 'uncommon',
    basePrice: 50,
    minWeightKg: 0.3,
    maxWeightKg: 3.0,
    catchWeight: 30,
    sourceId: 'vrchat-fish-wikiwiki',
    notes: 'Uncommon freshwater fish.',
  },
  {
    id: 'trout',
    nameJa: 'トラウト',
    nameEn: 'Trout',
    rarity: 'uncommon',
    basePrice: 60,
    minWeightKg: 0.5,
    maxWeightKg: 4.0,
    catchWeight: 25,
    sourceId: 'vrchat-fish-wikiwiki',
    notes: 'Uncommon fish.',
  },
  // --- Rare ---
  {
    id: 'salmon',
    nameJa: '鮭',
    nameEn: 'Salmon',
    rarity: 'rare',
    basePrice: 200,
    minWeightKg: 1.0,
    maxWeightKg: 8.0,
    catchWeight: 10,
    sourceId: 'vrchat-fish-wikiwiki',
    notes: 'Rare fish. Price approximate.',
  },
  {
    id: 'tuna',
    nameJa: 'マグロ',
    nameEn: 'Tuna',
    rarity: 'rare',
    basePrice: 350,
    minWeightKg: 5.0,
    maxWeightKg: 30.0,
    catchWeight: 8,
    sourceId: 'vrchat-fish-wikiwiki',
    notes: 'Rare fish.',
  },
  // --- Epic ---
  {
    id: 'dragon-fish',
    nameJa: 'ドラゴンフィッシュ',
    nameEn: 'Dragon Fish',
    rarity: 'epic',
    basePrice: 1000,
    minWeightKg: 2.0,
    maxWeightKg: 15.0,
    catchWeight: 3,
    sourceId: 'vrchat-fish-wikiwiki',
    notes: 'Epic rarity. Very rare catch. Price community-reported and unverified.',
  },
  // --- Legendary ---
  {
    id: 'golden-koi',
    nameJa: '黄金の鯉',
    nameEn: 'Golden Koi',
    rarity: 'legendary',
    basePrice: 5000,
    minWeightKg: 1.0,
    maxWeightKg: 10.0,
    catchWeight: 1,
    sourceId: 'vrchat-fish-wikiwiki',
    notes:
      'Legendary. Extremely rare. Price is community-reported and highly uncertain. Actual drop rate unknown — this weight is a rough estimate.',
  },
];

/**
 * Fishing areas — fact-only.
 * Area fish pools are approximate. Not all fish may be available in all areas.
 */
export const FISHING_AREAS: FishingArea[] = [
  {
    id: 'lake',
    nameJa: '湖エリア',
    nameEn: 'Lake Area',
    fishPool: ['goldfish', 'carp', 'crucian-carp', 'bass', 'trout', 'salmon', 'golden-koi'],
  },
  {
    id: 'river',
    nameJa: '川エリア',
    nameEn: 'River Area',
    fishPool: ['goldfish', 'crucian-carp', 'bass', 'trout', 'salmon'],
  },
  {
    id: 'ocean',
    nameJa: '海エリア',
    nameEn: 'Ocean Area',
    fishPool: ['tuna', 'salmon', 'dragon-fish', 'golden-koi'],
  },
];

export const FISH_MAP: Record<string, FishEntry> = Object.fromEntries(
  FISH_DATA.map((f) => [f.id, f]),
);

export const AREA_MAP: Record<string, FishingArea> = Object.fromEntries(
  FISHING_AREAS.map((a) => [a.id, a]),
);
