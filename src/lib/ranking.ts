/**
 * Per-slot item ranking logic and full-build optimizer.
 *
 * Per-slot: sweep all available items in a single equipment slot while keeping
 * other slots fixed. Returns items ranked by expectedValuePerHour descending.
 *
 * Full-build optimizer: exact exhaustive search over the full equipment space.
 *   Evaluates all rod × line × bobber × enchant combinations
 *   (15 × 8 × 8 × 43 = 41,280) and returns the top-N builds by EV/hour.
 *   Benchmarked at ~194 ms in Node.
 *
 *   optimizeFullBuildAsync: same exhaustive semantics, non-blocking — yields to
 *   the main thread once per rod iteration so the browser stays responsive.
 */

import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import { CalculatorParams, EnchantItem, EquipmentItem, EquipmentLoadout } from '@/types';
import { calculateDistribution } from '@/lib/calculator';

export type RankSlot = 'rod' | 'line' | 'bobber' | 'enchant';

export interface SlotRankEntry {
  item: EquipmentItem | EnchantItem;
  slot: RankSlot;
  expectedValuePerHour: number;
  expectedValuePerCatch: number;
  totalFishProbability: number;
}

const SLOT_DATA: Record<RankSlot, (EquipmentItem | EnchantItem)[]> = {
  rod: RODS,
  line: LINES,
  bobber: BOBBERS,
  enchant: ENCHANTS,
};

/**
 * Compute EV/hour for every item in a single slot, holding all other slots at
 * the values in `baseParams`.
 *
 * Returns entries sorted by expectedValuePerHour descending.
 */
export function rankSlot(baseParams: CalculatorParams, slot: RankSlot): SlotRankEntry[] {
  const items = SLOT_DATA[slot];
  const entries: SlotRankEntry[] = [];

  for (const item of items) {
    const params: CalculatorParams = {
      ...baseParams,
      loadout: {
        ...baseParams.loadout,
        [`${slot}Id`]: item.id,
      },
    };
    const result = calculateDistribution(params);
    entries.push({
      item,
      slot,
      expectedValuePerHour: result.expectedValuePerHour,
      expectedValuePerCatch: result.expectedValuePerCatch,
      totalFishProbability: result.totalFishProbability,
    });
  }

  return entries.sort((a, b) => b.expectedValuePerHour - a.expectedValuePerHour);
}

/**
 * Rank all four slots simultaneously.
 * Returns a map from slot name to sorted entry list.
 */
export function rankAllSlots(baseParams: CalculatorParams): Record<RankSlot, SlotRankEntry[]> {
  return {
    rod: rankSlot(baseParams, 'rod'),
    line: rankSlot(baseParams, 'line'),
    bobber: rankSlot(baseParams, 'bobber'),
    enchant: rankSlot(baseParams, 'enchant'),
  };
}

// ── Full-build optimizer ──────────────────────────────────────────────────────

/** One entry in the full-build optimizer results. */
export interface FullBuildEntry {
  loadout: EquipmentLoadout;
  items: {
    rod: EquipmentItem | EnchantItem;
    line: EquipmentItem | EnchantItem;
    bobber: EquipmentItem | EnchantItem;
    enchant: EquipmentItem | EnchantItem;
  };
  expectedValuePerHour: number;
  expectedValuePerCatch: number;
  totalFishProbability: number;
}

/** Result returned by the full-build optimizer. */
export interface FullBuildOptimizerResult {
  /** Top-ranked full equipment+enchant combinations. */
  topBuilds: FullBuildEntry[];
  /** Number of full builds evaluated in the search (equals totalCombinationSpace for exhaustive search). */
  searchedCount: number;
  /**
   * Total equipment combination space (rod × line × bobber × enchant).
   * All combinations are evaluated in the exhaustive search.
   */
  totalCombinationSpace: number;
}

/**
 * Find the top full-build (rod+line+bobber+enchant) combinations for the given
 * base params using exact exhaustive search over the full equipment space.
 *
 * Evaluates all rod × line × bobber × enchant combinations
 * (15 × 8 × 8 × 43 = 41,280). Benchmarked at ~194 ms in Node.
 *
 * The result always uses experimental model components (luck scaling, time model,
 * Big Catch weight percentile) and must be labeled accordingly in the UI.
 */
export function optimizeFullBuild(
  baseParams: CalculatorParams,
  topNResults = 10,
): FullBuildOptimizerResult {
  const totalCombinationSpace = RODS.length * LINES.length * BOBBERS.length * ENCHANTS.length;
  const entries: FullBuildEntry[] = [];

  for (const rod of RODS) {
    for (const line of LINES) {
      for (const bobber of BOBBERS) {
        for (const enchant of ENCHANTS) {
          const loadout: EquipmentLoadout = {
            rodId: rod.id,
            lineId: line.id,
            bobberId: bobber.id,
            enchantId: enchant.id,
          };
          const result = calculateDistribution({ ...baseParams, loadout });
          entries.push({
            loadout,
            items: { rod, line, bobber, enchant },
            expectedValuePerHour: result.expectedValuePerHour,
            expectedValuePerCatch: result.expectedValuePerCatch,
            totalFishProbability: result.totalFishProbability,
          });
        }
      }
    }
  }

  entries.sort((a, b) => b.expectedValuePerHour - a.expectedValuePerHour);

  return {
    topBuilds: entries.slice(0, topNResults),
    searchedCount: entries.length,
    totalCombinationSpace,
  };
}

/**
 * Async, non-blocking variant of optimizeFullBuild with identical exhaustive
 * search semantics.  Yields to the main thread between rod iterations (15
 * yields) so the browser stays responsive during the ~194 ms computation.
 *
 * Accepts a signal to cancel mid-flight; resolves with null when cancelled.
 */
export async function optimizeFullBuildAsync(
  baseParams: CalculatorParams,
  topNResults = 10,
  signal?: AbortSignal,
): Promise<FullBuildOptimizerResult | null> {
  const totalCombinationSpace = RODS.length * LINES.length * BOBBERS.length * ENCHANTS.length;
  const entries: FullBuildEntry[] = [];

  for (const rod of RODS) {
    // Yield once per rod so the browser can process frames/events between chunks.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (signal?.aborted) return null;

    for (const line of LINES) {
      for (const bobber of BOBBERS) {
        for (const enchant of ENCHANTS) {
          const loadout: EquipmentLoadout = {
            rodId: rod.id,
            lineId: line.id,
            bobberId: bobber.id,
            enchantId: enchant.id,
          };
          const result = calculateDistribution({ ...baseParams, loadout });
          entries.push({
            loadout,
            items: { rod, line, bobber, enchant },
            expectedValuePerHour: result.expectedValuePerHour,
            expectedValuePerCatch: result.expectedValuePerCatch,
            totalFishProbability: result.totalFishProbability,
          });
        }
      }
    }
  }

  if (signal?.aborted) return null;

  entries.sort((a, b) => b.expectedValuePerHour - a.expectedValuePerHour);

  return {
    topBuilds: entries.slice(0, topNResults),
    searchedCount: entries.length,
    totalCombinationSpace,
  };
}
