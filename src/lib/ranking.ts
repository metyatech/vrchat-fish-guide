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

// ── Top-N min-heap ────────────────────────────────────────────────────────────

/**
 * Binary min-heap that retains the top-N FullBuildEntry items by EV/hour.
 *
 * Tie-breaking by insertion index (ascending) preserves stable-sort semantics:
 * when two entries share the same EV/hour the one evaluated first (lower idx)
 * is preferred, matching Array.sort stable behaviour on insertion order.
 *
 * Complexity: O(log N) per consider() call vs O(N log N) per sort call on a
 * naive sorted-array approach — avoids full-array materialisation.
 */
class TopNHeap {
  private readonly data: Array<{ entry: FullBuildEntry; idx: number }> = [];
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  /** True when `a` should be evicted before `b` (a is the heap-min). */
  private lt(
    a: { entry: FullBuildEntry; idx: number },
    b: { entry: FullBuildEntry; idx: number },
  ): boolean {
    const diff = a.entry.expectedValuePerHour - b.entry.expectedValuePerHour;
    if (diff !== 0) return diff < 0;
    return a.idx > b.idx; // later-inserted loses ties
  }

  /**
   * Consider a new entry for inclusion in the top-N.
   * Replaces the current minimum when the new entry is strictly better,
   * or equal-EV but earlier-inserted (lower idx).
   */
  consider(entry: FullBuildEntry, idx: number): void {
    if (this.capacity <= 0) return;
    if (this.data.length < this.capacity) {
      this._push({ entry, idx });
      return;
    }
    const top = this.data[0];
    const newBetter =
      entry.expectedValuePerHour > top.entry.expectedValuePerHour ||
      (entry.expectedValuePerHour === top.entry.expectedValuePerHour && idx < top.idx);
    if (newBetter) {
      this.data[0] = { entry, idx };
      this._siftDown(0);
    }
  }

  /** Return entries sorted descending by EV/hour (stable by insertion index for ties). */
  toSortedDesc(): FullBuildEntry[] {
    return [...this.data]
      .sort((a, b) => {
        const diff = b.entry.expectedValuePerHour - a.entry.expectedValuePerHour;
        return diff !== 0 ? diff : a.idx - b.idx;
      })
      .map((x) => x.entry);
  }

  private _push(item: { entry: FullBuildEntry; idx: number }): void {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.lt(this.data[i], this.data[parent])) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }

  private _siftDown(i: number): void {
    const n = this.data.length;
    for (;;) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.lt(this.data[l], this.data[smallest])) smallest = l;
      if (r < n && this.lt(this.data[r], this.data[smallest])) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}

function normalizeTopNResults(topNResults: number): number {
  if (!Number.isFinite(topNResults)) return 0;
  return Math.max(0, Math.floor(topNResults));
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
 * Uses a TopNHeap to avoid full-array materialisation and sort — O(log N) per
 * entry vs O(totalSpace log totalSpace) for a naive sort-then-slice approach.
 *
 * The result always uses experimental model components (luck scaling, time model,
 * Big Catch weight percentile) and must be labeled accordingly in the UI.
 */
export function optimizeFullBuild(
  baseParams: CalculatorParams,
  topNResults = 10,
): FullBuildOptimizerResult {
  const totalCombinationSpace = RODS.length * LINES.length * BOBBERS.length * ENCHANTS.length;
  const heap = new TopNHeap(normalizeTopNResults(topNResults));
  let searchedCount = 0;

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
          heap.consider(
            {
              loadout,
              items: { rod, line, bobber, enchant },
              expectedValuePerHour: result.expectedValuePerHour,
              expectedValuePerCatch: result.expectedValuePerCatch,
              totalFishProbability: result.totalFishProbability,
            },
            searchedCount,
          );
          searchedCount++;
        }
      }
    }
  }

  return {
    topBuilds: heap.toSortedDesc(),
    searchedCount,
    totalCombinationSpace,
  };
}

/**
 * Async, non-blocking variant of optimizeFullBuild with identical exhaustive
 * search semantics.  Yields to the main thread between rod iterations (15
 * yields) so the browser stays responsive during the ~194 ms computation.
 *
 * Uses the same TopNHeap optimisation as the sync variant.
 *
 * Accepts a signal to cancel mid-flight; resolves with null when cancelled.
 */
export async function optimizeFullBuildAsync(
  baseParams: CalculatorParams,
  topNResults = 10,
  signal?: AbortSignal,
): Promise<FullBuildOptimizerResult | null> {
  const totalCombinationSpace = RODS.length * LINES.length * BOBBERS.length * ENCHANTS.length;
  const heap = new TopNHeap(normalizeTopNResults(topNResults));
  let searchedCount = 0;

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
          heap.consider(
            {
              loadout,
              items: { rod, line, bobber, enchant },
              expectedValuePerHour: result.expectedValuePerHour,
              expectedValuePerCatch: result.expectedValuePerCatch,
              totalFishProbability: result.totalFishProbability,
            },
            searchedCount,
          );
          searchedCount++;
        }
      }
    }
  }

  if (signal?.aborted) return null;

  return {
    topBuilds: heap.toSortedDesc(),
    searchedCount,
    totalCombinationSpace,
  };
}
