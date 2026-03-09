import { DataSource } from '@/types';

/**
 * Source registry for VRChat Fish! guide data.
 *
 * Classification:
 * - Source: primary data source used directly (fact-only extraction only)
 * - Cross-check: used for verification only, not extracted from
 * - Not used directly: referenced for awareness; no data extracted
 *
 * IMPORTANT: No expressive content from wikiwiki.jp, Google Sheets, or Discord
 * is reproduced. Only numerical facts are extracted where necessary, and
 * source_status is marked as 'unclear' because license terms are unknown.
 */
export const SOURCES: DataSource[] = [
  {
    id: 'in-game-observation',
    name: 'In-game direct observation',
    sourceStatus: 'official',
    reuseMode: 'fact-only',
    licenseStatus: 'self-generated (own gameplay)',
    notes:
      'Values observed directly in VRChat Fish! world. These are the most reliable source for factual numerical data.',
  },
  {
    id: 'fish-fandom-index',
    name: 'Fish! TrickForge Studios Fandom Index',
    url: 'https://fish-trickforge-studio.fandom.com/wiki/Index',
    sourceStatus: 'community',
    reuseMode: 'fact-only',
    licenseStatus:
      'CC BY-SA via Fandom licensing; only factual area / rarity / condition data extracted',
    notes:
      'Used for area fish lists, published rarity tiers, weather tags, and time-of-day tags. The calculator uses the published rarity table as the base probability model.',
  },
  {
    id: 'fish-fandom-rods',
    name: 'Fish! TrickForge Studios Fandom Rods',
    url: 'https://fish-trickforge-studio.fandom.com/wiki/Rods',
    sourceStatus: 'community',
    reuseMode: 'fact-only',
    licenseStatus: 'CC BY-SA via Fandom licensing; only factual rod stat values extracted',
    notes:
      'Used for rod stat totals: Luck, Strength, Expertise, Attraction, Big Catch, and Max Weight.',
  },
  {
    id: 'fish-fandom-rod-accessories',
    name: 'Fish! TrickForge Studios Fandom Rod Accessories',
    url: 'https://fish-trickforge-studio.fandom.com/wiki/Rod_Accessories',
    sourceStatus: 'community',
    reuseMode: 'fact-only',
    licenseStatus:
      'CC BY-SA via Fandom licensing; only factual line and bobber stat values extracted',
    notes:
      'Used for line and bobber stat totals: Luck, Strength, Expertise, Attraction, and Big Catch.',
  },
  {
    id: 'fish-fandom-enchantments',
    name: 'Fish! TrickForge Studios Fandom Enchantments',
    url: 'https://fish-trickforge-studio.fandom.com/wiki/Enchantments',
    sourceStatus: 'community',
    reuseMode: 'fact-only',
    licenseStatus:
      'CC BY-SA via Fandom licensing; only factual enchant stat values and named effects extracted',
    notes:
      'Used for enchant stat totals, conditional activation labels, and the few direct value effects modeled in this build.',
  },
  {
    id: 'fish-info-by-snerx',
    name: 'FISH! Info by Snerx (Google Sheets)',
    url: 'https://docs.google.com/spreadsheets/d/1SAggImcqOJbcTP0owCrqv13Z71ZnXynYL64OB5I1CSY/edit?usp=sharing',
    sourceStatus: 'community',
    reuseMode: 'fact-only',
    licenseStatus:
      'unclear — spreadsheet content license not published; only numeric facts extracted',
    notes:
      'Used only for numeric price and weight ranges. The sheet itself cites wikiwiki.jp as the origin of those ranges; no expressive spreadsheet content is reproduced.',
  },
  {
    id: 'vrchat-fish-wikiwiki',
    name: 'VRChat Fish! wikiwiki.jp community wiki',
    url: 'https://wikiwiki.jp/fish_jp/',
    sourceStatus: 'community',
    reuseMode: 'not-used-directly',
    licenseStatus: 'unclear — treated as upstream cross-check only',
    notes:
      'Referenced indirectly because the Snerx sheet cites it as the origin of price and weight ranges. The site does not reproduce wiki text, page structure, or images.',
  },
  {
    id: 'community-datamine',
    name: 'Community datamine / reverse-engineering data',
    sourceStatus: 'community',
    reuseMode: 'not-used-directly',
    licenseStatus: 'unclear — distribution rights unknown',
    notes:
      'Exact in-game formulas for Luck, Big Catch, Attraction, Strength, Expertise, and weight-to-price conversion remain excluded. Experimental mappings in the calculator are independent approximations, not copied formulas.',
  },
  {
    id: 'community-modifier-data',
    name: 'Community modifier probability / multiplier data',
    sourceStatus: 'community',
    reuseMode: 'fact-only',
    licenseStatus: 'unclear — numeric facts only; no expressive content reproduced',
    notes:
      'Used for the optional modifier EV model. Extracted facts: any effect≈22.5%, appearance-only≈7.5%, size-only≈10%, both≈5%, 23 distinct appearance effects, mean appearance multiplier ≈2.404x (≈2.487x with Cursed→Blessed conversion), Huge 1.5x, Tiny 1.0x.',
  },
];

export const SOURCE_MAP: Record<string, DataSource> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s]),
);
