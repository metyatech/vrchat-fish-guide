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
    id: 'vrchat-fish-wikiwiki',
    name: 'VRChat Fish! wikiwiki.jp community wiki',
    url: 'https://wikiwiki.jp/vrchat-fish/',
    sourceStatus: 'community',
    reuseMode: 'fact-only',
    licenseStatus: 'unclear — wikiwiki.jp default terms apply; expressive content NOT reproduced',
    notes:
      'Only numerical facts (prices, weights) extracted. No expressive text, tables, or structure copied. Treat all values as unverified community contributions.',
  },
  {
    id: 'community-datamine',
    name: 'Community datamine / reverse-engineering data',
    sourceStatus: 'community',
    reuseMode: 'not-used-directly',
    licenseStatus: 'unclear — distribution rights unknown',
    notes:
      'Luck, Big Catch, Attraction internal formulas reported by community. NOT used in the main calculator. Kept as user-configurable inputs to avoid hardcoding unverifiable formulas.',
  },
];

export const SOURCE_MAP: Record<string, DataSource> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s]),
);
