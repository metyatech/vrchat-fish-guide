/**
 * Per-slot item ranking logic.
 *
 * Given base CalculatorParams, sweep all available items in a single equipment
 * slot while keeping other slots fixed.  Returns items ranked by expectedValuePerHour
 * descending, so the caller can show "best rod candidates given current conditions".
 */

import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import { CalculatorParams, EquipmentItem, EnchantItem } from '@/types';
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
