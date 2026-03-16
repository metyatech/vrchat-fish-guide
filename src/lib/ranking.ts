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
 *
 * Subset-build optimizer: arbitrary subset of {rod, line, bobber, enchant}.
 *   Non-varying slots are fixed at baseParams.loadout values.
 *   optimizeSubsetBuild / optimizeSubsetBuildAsync are the public API.
 *   When varyingSlots contains all four slots, results are identical to
 *   optimizeFullBuild / optimizeFullBuildAsync.
 */

import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import { AREA_MAP, FISHING_AREAS } from '@/data/fish';
import {
  CalculatorParams,
  EnchantItem,
  EquipmentItem,
  EquipmentLoadout,
  FishingArea,
} from '@/types';
import { BEST_AREA_ID, calculateDistribution, calculateOptimizerMetrics } from '@/lib/calculator';

export type RankSlot = 'rod' | 'line' | 'bobber' | 'enchant';
export type RankDimension = RankSlot | 'area';

export interface SlotRankEntry {
  item: EquipmentItem | EnchantItem | FishingArea;
  slot: RankDimension;
  expectedValuePerHour: number;
  expectedValuePerCatch: number;
  totalFishProbability: number;
  rankingKey: string;
  areaId?: string;
  areaName?: string;
}

export interface EquipmentSlotRankEntry extends SlotRankEntry {
  item: EquipmentItem | EnchantItem;
  slot: RankSlot;
}

export interface AreaRankEntry extends SlotRankEntry {
  item: FishingArea;
  slot: 'area';
}

const SLOT_DATA: Record<RankSlot, (EquipmentItem | EnchantItem)[]> = {
  rod: RODS,
  line: LINES,
  bobber: BOBBERS,
  enchant: ENCHANTS,
};

const AUTO_AREA_PLACEHOLDER: FishingArea = {
  id: BEST_AREA_ID,
  nameJa: 'Best Area',
  nameEn: 'Best Area',
  fishPool: [],
  waterTypes: [],
  sourceIds: [],
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
export function rankSlot(baseParams: CalculatorParams, slot: RankSlot): EquipmentSlotRankEntry[];
export function rankSlot(baseParams: CalculatorParams, slot: 'area'): AreaRankEntry[];
export function rankSlot(baseParams: CalculatorParams, slot: RankDimension): SlotRankEntry[] {
  if (slot === 'area') {
    const entries: SlotRankEntry[] = [];

    for (const area of FISHING_AREAS) {
      const result = calculateDistribution({
        ...baseParams,
        areaId: area.id,
      });
      entries.push({
        item: area,
        slot,
        expectedValuePerHour: result.expectedValuePerHour,
        expectedValuePerCatch: result.expectedValuePerCatch,
        totalFishProbability: result.totalFishProbability,
        rankingKey: area.id,
        areaId: area.id,
        areaName: area.nameEn,
      });
    }

    return entries.sort((a, b) => b.expectedValuePerHour - a.expectedValuePerHour);
  }

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
      rankingKey: item.id,
    });
  }

  return entries.sort((a, b) => b.expectedValuePerHour - a.expectedValuePerHour);
}

function getRankingAreaIds(areaId: string): string[] {
  if (areaId === BEST_AREA_ID) {
    return FISHING_AREAS.map((area) => area.id);
  }
  return [areaId];
}

/**
 * Compute EV/hour for every item in a single slot and, when the base params use
 * auto area selection, expand the ranking so the same item can appear once per
 * fishing area.
 */
export function rankSlotWithAreaBreakdown(
  baseParams: CalculatorParams,
  slot: RankSlot,
): EquipmentSlotRankEntry[];
export function rankSlotWithAreaBreakdown(
  baseParams: CalculatorParams,
  slot: 'area',
): AreaRankEntry[];
export function rankSlotWithAreaBreakdown(
  baseParams: CalculatorParams,
  slot: RankDimension,
): SlotRankEntry[] {
  if (slot === 'area') {
    return rankSlot(baseParams, slot);
  }
  const items = SLOT_DATA[slot];
  const areaIds = getRankingAreaIds(baseParams.areaId);
  const entries: SlotRankEntry[] = [];

  for (const item of items) {
    for (const areaId of areaIds) {
      const params: CalculatorParams = {
        ...baseParams,
        areaId,
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
        rankingKey: `${item.id}:${areaId}`,
        areaId,
        areaName: AREA_MAP[areaId]?.nameEn ?? areaId,
      });
    }
  }

  return entries.sort((a, b) => b.expectedValuePerHour - a.expectedValuePerHour);
}

/**
 * Rank all four slots simultaneously.
 * Returns a map from slot name to sorted entry list.
 */
export function rankAllSlots(baseParams: CalculatorParams): Record<RankDimension, SlotRankEntry[]> {
  return {
    rod: rankSlot(baseParams, 'rod'),
    line: rankSlot(baseParams, 'line'),
    bobber: rankSlot(baseParams, 'bobber'),
    enchant: rankSlot(baseParams, 'enchant'),
    area: rankSlot(baseParams, 'area'),
  };
}

/**
 * Rank all four slots simultaneously, expanding each item into one row per
 * fishing area when auto-area mode is enabled.
 */
export function rankAllSlotsWithAreaBreakdown(
  baseParams: CalculatorParams,
): Record<RankDimension, SlotRankEntry[]> {
  return {
    rod: rankSlotWithAreaBreakdown(baseParams, 'rod'),
    line: rankSlotWithAreaBreakdown(baseParams, 'line'),
    bobber: rankSlotWithAreaBreakdown(baseParams, 'bobber'),
    enchant: rankSlotWithAreaBreakdown(baseParams, 'enchant'),
    area: rankSlotWithAreaBreakdown(baseParams, 'area'),
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
  areaId: string;
  areaName: string;
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
  areaId: string,
  loadout: EquipmentLoadout,
  items: FullBuildEntry['items'],
): FullBuildEntry {
  const result = calculateOptimizerMetrics({ ...baseParams, areaId, loadout });
  return {
    areaId: result.areaId,
    areaName:
      result.areaId === BEST_AREA_ID
        ? 'Best Area'
        : (AREA_MAP[result.areaId]?.nameEn ?? result.areaId),
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
            createFullBuildEntry(baseParams, baseParams.areaId, loadout, {
              rod,
              line,
              bobber,
              enchant,
            }),
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
            createFullBuildEntry(baseParams, baseParams.areaId, loadout, {
              rod,
              line,
              bobber,
              enchant,
            }),
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

// ── Subset-build optimizer ────────────────────────────────────────────────────

/** Resolve the current loadout item for a given slot from baseParams. */
function getFixedItemForSlot(
  slot: RankSlot,
  baseParams: CalculatorParams,
): EquipmentItem | EnchantItem {
  const itemId =
    slot === 'rod'
      ? baseParams.loadout.rodId
      : slot === 'line'
        ? baseParams.loadout.lineId
        : slot === 'bobber'
          ? baseParams.loadout.bobberId
          : baseParams.loadout.enchantId;
  return (
    (SLOT_DATA[slot] as (EquipmentItem | EnchantItem)[]).find((i) => i.id === itemId) ??
    SLOT_DATA[slot][0]
  );
}

// Dominance pruning is only safe when ALL four slots are searched together.
// When any slot is fixed the pruned superset rod/line/bobber may outperform in
// that specific fixed context, so we must use the full arrays for subset builds.
const FULL_BUILD_SLOTS = new Set<RankSlot>(['rod', 'line', 'bobber', 'enchant']);
function isFullBuildSearch(varyingSlots: readonly RankDimension[]): boolean {
  return (
    varyingSlots.length === 4 &&
    FULL_BUILD_SLOTS.size === 4 &&
    varyingSlots.every((s): s is RankSlot => FULL_BUILD_SLOTS.has(s as RankSlot))
  );
}

/**
 * Compute the total search space for a given varyingSlots subset.
 * Non-varying slots contribute a factor of 1.
 * Dominance pruning is applied to rod/line/bobber only when all four slots vary.
 */
export function computeSubsetSearchSpace(varyingSlots: readonly RankDimension[]): number {
  const full = isFullBuildSearch(varyingSlots);
  const rodCount = varyingSlots.includes('rod') ? (full ? OPTIMIZER_RODS.length : RODS.length) : 1;
  const lineCount = varyingSlots.includes('line')
    ? full
      ? OPTIMIZER_LINES.length
      : LINES.length
    : 1;
  const bobberCount = varyingSlots.includes('bobber')
    ? full
      ? OPTIMIZER_BOBBERS.length
      : BOBBERS.length
    : 1;
  const enchantCount = varyingSlots.includes('enchant') ? ENCHANTS.length : 1;
  const areaCount = varyingSlots.includes('area') ? FISHING_AREAS.length : 1;
  return rodCount * lineCount * bobberCount * enchantCount * areaCount;
}

/** Result returned by the subset-build optimizer. */
export interface SubsetBuildOptimizerResult extends FullBuildOptimizerResult {
  /** The slots that were varied. Non-varying slots retain their baseParams.loadout values. */
  varyingSlots: readonly RankDimension[];
}

/** Progress event emitted by optimizeSubsetBuildAsync. */
export interface SubsetOptimizerProgressEvent extends OptimizerProgressEvent {
  /** The slots being varied. */
  varyingSlots: readonly RankDimension[];
}

/**
 * Find the top combinations for the given varyingSlots subset.
 * Non-varying slots are held fixed at baseParams.loadout values.
 * Dominance pruning is applied to varying rod/line/bobber candidates.
 *
 * When varyingSlots contains all four slots the results are identical to
 * optimizeFullBuild.
 */
export function optimizeSubsetBuild(
  baseParams: CalculatorParams,
  varyingSlots: readonly RankDimension[],
  topNResults = 10,
): SubsetBuildOptimizerResult {
  const heap = new TopNHeap(normalizeTopNResults(topNResults));
  let searchedCount = 0;

  const full = isFullBuildSearch(varyingSlots);
  const rodCandidates: EquipmentItem[] = varyingSlots.includes('rod')
    ? full
      ? OPTIMIZER_RODS
      : RODS
    : [getFixedItemForSlot('rod', baseParams) as EquipmentItem];
  const lineCandidates: EquipmentItem[] = varyingSlots.includes('line')
    ? full
      ? OPTIMIZER_LINES
      : LINES
    : [getFixedItemForSlot('line', baseParams) as EquipmentItem];
  const bobberCandidates: EquipmentItem[] = varyingSlots.includes('bobber')
    ? full
      ? OPTIMIZER_BOBBERS
      : BOBBERS
    : [getFixedItemForSlot('bobber', baseParams) as EquipmentItem];
  const enchantCandidates: (EquipmentItem | EnchantItem)[] = varyingSlots.includes('enchant')
    ? ENCHANTS
    : [getFixedItemForSlot('enchant', baseParams)];
  const areaCandidates = varyingSlots.includes('area')
    ? FISHING_AREAS
    : baseParams.areaId === BEST_AREA_ID
      ? [AUTO_AREA_PLACEHOLDER]
      : [AREA_MAP[baseParams.areaId]!];

  const totalSpace = computeSubsetSearchSpace(varyingSlots);

  for (const area of areaCandidates) {
    for (const rod of rodCandidates) {
      for (const line of lineCandidates) {
        for (const bobber of bobberCandidates) {
          for (const enchant of enchantCandidates) {
            const loadout: EquipmentLoadout = {
              rodId: rod.id,
              lineId: line.id,
              bobberId: bobber.id,
              enchantId: enchant.id,
            };
            heap.consider(
              createFullBuildEntry(baseParams, area.id, loadout, { rod, line, bobber, enchant }),
              searchedCount,
            );
            searchedCount++;
          }
        }
      }
    }
  }

  return {
    topBuilds: heap.toSortedDesc(),
    searchedCount,
    totalCombinationSpace: totalSpace,
    varyingSlots,
  };
}

/**
 * Async, non-blocking variant of optimizeSubsetBuild with identical exact
 * search semantics. Yields to the main thread after each line-level chunk so
 * the browser stays responsive while provisional top builds stream into the UI.
 *
 * When varyingSlots contains all four slots, results are identical to
 * optimizeFullBuildAsync.
 */
export async function optimizeSubsetBuildAsync(
  baseParams: CalculatorParams,
  varyingSlots: readonly RankDimension[],
  topNResults = 10,
  signal?: AbortSignal,
  onProgress?: (event: SubsetOptimizerProgressEvent) => void,
): Promise<SubsetBuildOptimizerResult | null> {
  if (signal?.aborted) return null;

  const heap = new TopNHeap(normalizeTopNResults(topNResults));
  let searchedCount = 0;

  const full = isFullBuildSearch(varyingSlots);
  const rodCandidates: EquipmentItem[] = varyingSlots.includes('rod')
    ? full
      ? OPTIMIZER_RODS
      : RODS
    : [getFixedItemForSlot('rod', baseParams) as EquipmentItem];
  const lineCandidates: EquipmentItem[] = varyingSlots.includes('line')
    ? full
      ? OPTIMIZER_LINES
      : LINES
    : [getFixedItemForSlot('line', baseParams) as EquipmentItem];
  const bobberCandidates: EquipmentItem[] = varyingSlots.includes('bobber')
    ? full
      ? OPTIMIZER_BOBBERS
      : BOBBERS
    : [getFixedItemForSlot('bobber', baseParams) as EquipmentItem];
  const enchantCandidates: (EquipmentItem | EnchantItem)[] = varyingSlots.includes('enchant')
    ? ENCHANTS
    : [getFixedItemForSlot('enchant', baseParams)];
  const areaCandidates = varyingSlots.includes('area')
    ? FISHING_AREAS
    : baseParams.areaId === BEST_AREA_ID
      ? [AUTO_AREA_PLACEHOLDER]
      : [AREA_MAP[baseParams.areaId]!];

  const totalSpace = computeSubsetSearchSpace(varyingSlots);

  for (const area of areaCandidates) {
    for (const rod of rodCandidates) {
      for (const line of lineCandidates) {
        for (const bobber of bobberCandidates) {
          for (const enchant of enchantCandidates) {
            const loadout: EquipmentLoadout = {
              rodId: rod.id,
              lineId: line.id,
              bobberId: bobber.id,
              enchantId: enchant.id,
            };
            heap.consider(
              createFullBuildEntry(baseParams, area.id, loadout, { rod, line, bobber, enchant }),
              searchedCount,
            );
            searchedCount++;
          }
        }
        if (onProgress) {
          onProgress({
            topBuilds: heap.toSortedDesc(),
            searchedCount,
            totalCombinationSpace: totalSpace,
            isComplete: false,
            varyingSlots,
          });
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (signal?.aborted) return null;
      }
    }
  }

  if (signal?.aborted) return null;

  const finalBuilds = heap.toSortedDesc();
  if (onProgress) {
    onProgress({
      topBuilds: finalBuilds,
      searchedCount,
      totalCombinationSpace: totalSpace,
      isComplete: true,
      varyingSlots,
    });
  }

  return {
    topBuilds: finalBuilds,
    searchedCount,
    totalCombinationSpace: totalSpace,
    varyingSlots,
  };
}
