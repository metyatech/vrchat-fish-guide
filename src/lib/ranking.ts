/**
 * Per-slot item ranking logic and full-build optimizer.
 *
 * Per-slot: sweep all available items in a single equipment slot while keeping
 * other slots fixed. Returns items ranked by expectedValuePerHour descending.
 *
 * Full-build optimizer: exact top-N search over the full equipment space.
 *   Before evaluating, the optimizer drops rods / lines / bobbers that are
 *   strictly dominated on every numeric stat, which cannot change the EV/hour
 *   ranking because those items can never outperform their dominator.
 *   The remaining search still returns the exact top-N builds by EV/hour.
 *
 *   optimizeFullBuildAsync: same exact semantics, non-blocking — yields to
 *   the main thread between partial chunks so the browser stays responsive
 *   while provisional top builds stream into the UI.
 */

import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import { CalculatorParams, EnchantItem, EquipmentItem, EquipmentLoadout } from '@/types';
import { calculateDistribution, calculateOptimizerMetrics } from '@/lib/calculator';

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

const DOMINANCE_KEYS = [
  'luck',
  'strength',
  'expertise',
  'attractionPct',
  'bigCatch',
  'maxWeightKg',
] as const;

function dominates(a: EquipmentItem, b: EquipmentItem): boolean {
  return (
    DOMINANCE_KEYS.every((key) => a[key] >= b[key]) && DOMINANCE_KEYS.some((key) => a[key] > b[key])
  );
}

function pruneDominatedEquipment(items: readonly EquipmentItem[]): EquipmentItem[] {
  return items.filter(
    (candidate) => !items.some((other) => other.id !== candidate.id && dominates(other, candidate)),
  );
}

const OPTIMIZER_RODS = pruneDominatedEquipment(RODS);
const OPTIMIZER_LINES = pruneDominatedEquipment(LINES);
const OPTIMIZER_BOBBERS = pruneDominatedEquipment(BOBBERS);
const TOTAL_COMBINATION_SPACE =
  OPTIMIZER_RODS.length * OPTIMIZER_LINES.length * OPTIMIZER_BOBBERS.length * ENCHANTS.length;
export const FULL_BUILD_SEARCH_SPACE = TOTAL_COMBINATION_SPACE;

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
  /** Number of full builds evaluated in the search (equals totalCombinationSpace). */
  searchedCount: number;
  /** Total exact search space after removing strictly dominated gear candidates. */
  totalCombinationSpace: number;
}

/**
 * Progress event emitted by optimizeFullBuildAsync after each partial chunk.
 * Used to stream provisional top builds to the UI before the full search completes.
 */
export interface OptimizerProgressEvent {
  /** Current best builds (provisional when isComplete is false). */
  topBuilds: FullBuildEntry[];
  /** Number of combinations evaluated so far. */
  searchedCount: number;
  /** Total exact search space after removing strictly dominated gear candidates. */
  totalCombinationSpace: number;
  /** True only on the final event, after all combinations have been evaluated. */
  isComplete: boolean;
}

function createFullBuildEntry(
  baseParams: CalculatorParams,
  loadout: EquipmentLoadout,
  items: FullBuildEntry['items'],
): FullBuildEntry {
  const result = calculateOptimizerMetrics({ ...baseParams, loadout });
  return {
    loadout,
    items,
    expectedValuePerHour: result.expectedValuePerHour,
    expectedValuePerCatch: result.expectedValuePerCatch,
    totalFishProbability: result.totalFishProbability,
  };
}

function emitProgressEvent(
  heap: TopNHeap,
  searchedCount: number,
  onProgress?: (event: OptimizerProgressEvent) => void,
  isComplete = false,
): void {
  if (!onProgress) return;
  onProgress({
    topBuilds: heap.toSortedDesc(),
    searchedCount,
    totalCombinationSpace: TOTAL_COMBINATION_SPACE,
    isComplete,
  });
}

/**
 * Find the top full-build (rod+line+bobber+enchant) combinations for the given
 * base params using the exact safe-pruned search space.
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
  const heap = new TopNHeap(normalizeTopNResults(topNResults));
  let searchedCount = 0;

  for (const rod of OPTIMIZER_RODS) {
    for (const line of OPTIMIZER_LINES) {
      for (const bobber of OPTIMIZER_BOBBERS) {
        for (const enchant of ENCHANTS) {
          const loadout: EquipmentLoadout = {
            rodId: rod.id,
            lineId: line.id,
            bobberId: bobber.id,
            enchantId: enchant.id,
          };
          heap.consider(
            createFullBuildEntry(baseParams, loadout, { rod, line, bobber, enchant }),
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
    totalCombinationSpace: TOTAL_COMBINATION_SPACE,
  };
}

/**
 * Async, non-blocking variant of optimizeFullBuild with identical exact
 * search semantics. Yields to the main thread after each line-level chunk so
 * the browser stays responsive while the ranking streams in.
 *
 * Uses the same TopNHeap optimisation as the sync variant.
 *
 * Accepts a signal to cancel mid-flight; resolves with null when cancelled.
 *
 * onProgress is called after each line-level chunk (isComplete=false) and once
 * at the end (isComplete=true), allowing the UI to stream provisional top builds
 * before the exact search completes.
 */
export async function optimizeFullBuildAsync(
  baseParams: CalculatorParams,
  topNResults = 10,
  signal?: AbortSignal,
  onProgress?: (event: OptimizerProgressEvent) => void,
): Promise<FullBuildOptimizerResult | null> {
  if (signal?.aborted) return null;

  const heap = new TopNHeap(normalizeTopNResults(topNResults));
  let searchedCount = 0;

  for (const rod of OPTIMIZER_RODS) {
    for (const line of OPTIMIZER_LINES) {
      for (const bobber of OPTIMIZER_BOBBERS) {
        for (const enchant of ENCHANTS) {
          const loadout: EquipmentLoadout = {
            rodId: rod.id,
            lineId: line.id,
            bobberId: bobber.id,
            enchantId: enchant.id,
          };
          heap.consider(
            createFullBuildEntry(baseParams, loadout, { rod, line, bobber, enchant }),
            searchedCount,
          );
          searchedCount++;
        }
      }

      emitProgressEvent(heap, searchedCount, onProgress);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (signal?.aborted) return null;
    }
  }

  if (signal?.aborted) return null;

  const finalBuilds = heap.toSortedDesc();
  emitProgressEvent(heap, searchedCount, onProgress, true);

  return {
    topBuilds: finalBuilds,
    searchedCount,
    totalCombinationSpace: TOTAL_COMBINATION_SPACE,
  };
}
