import { describe, expect, it } from 'vitest';
import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import { getDefaultParams } from '@/lib/calculator';
import { optimizeFullBuild, rankAllSlots, rankSlot } from '@/lib/ranking';

describe('rankSlot', () => {
  const baseParams = getDefaultParams('coconut-bay');

  it('returns one entry per available rod', () => {
    const entries = rankSlot(baseParams, 'rod');
    expect(entries).toHaveLength(RODS.length);
  });

  it('returns one entry per available line', () => {
    const entries = rankSlot(baseParams, 'line');
    expect(entries).toHaveLength(LINES.length);
  });

  it('returns one entry per available bobber', () => {
    const entries = rankSlot(baseParams, 'bobber');
    expect(entries).toHaveLength(BOBBERS.length);
  });

  it('returns one entry per available enchant', () => {
    const entries = rankSlot(baseParams, 'enchant');
    expect(entries).toHaveLength(ENCHANTS.length);
  });

  it('returns entries sorted by expectedValuePerHour descending', () => {
    const entries = rankSlot(baseParams, 'rod');
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].expectedValuePerHour).toBeGreaterThanOrEqual(
        entries[i].expectedValuePerHour,
      );
    }
  });

  it('all expectedValuePerHour values are non-negative', () => {
    const entries = rankSlot(baseParams, 'rod');
    entries.forEach((e) => expect(e.expectedValuePerHour).toBeGreaterThanOrEqual(0));
  });

  it('slot field matches requested slot', () => {
    const entries = rankSlot(baseParams, 'enchant');
    entries.forEach((e) => expect(e.slot).toBe('enchant'));
  });

  it('only modifies the requested slot in each entry', () => {
    const entries = rankSlot(baseParams, 'rod');
    entries.forEach((e) => {
      expect(e.item.category).toBe('rod');
    });
  });

  it('entry item ids are unique', () => {
    const entries = rankSlot(baseParams, 'bobber');
    const ids = entries.map((e) => e.item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('rankAllSlots', () => {
  it('returns results for all four slots', () => {
    const ranked = rankAllSlots(getDefaultParams('coconut-bay'));
    expect(Object.keys(ranked)).toEqual(
      expect.arrayContaining(['rod', 'line', 'bobber', 'enchant']),
    );
  });

  it('each slot list is sorted descending by EV/hour', () => {
    const ranked = rankAllSlots(getDefaultParams('coconut-bay'));
    for (const entries of Object.values(ranked)) {
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1].expectedValuePerHour).toBeGreaterThanOrEqual(
          entries[i].expectedValuePerHour,
        );
      }
    }
  });

  it('works for open-sea area', () => {
    const ranked = rankAllSlots(getDefaultParams('open-sea'));
    expect(ranked.rod.length).toBeGreaterThan(0);
  });
});

describe('optimizeFullBuild', () => {
  const baseParams = getDefaultParams('coconut-bay');

  it('returns topBuilds sorted descending by expectedValuePerHour', () => {
    const result = optimizeFullBuild(baseParams);
    for (let i = 1; i < result.topBuilds.length; i++) {
      expect(result.topBuilds[i - 1].expectedValuePerHour).toBeGreaterThanOrEqual(
        result.topBuilds[i].expectedValuePerHour,
      );
    }
  });

  it('returns at most topNResults entries', () => {
    const result = optimizeFullBuild(baseParams, 10);
    expect(result.topBuilds.length).toBeLessThanOrEqual(10);
  });

  it('searchedCount equals the full equipment combination space', () => {
    const result = optimizeFullBuild(baseParams);
    const fullSpace = RODS.length * LINES.length * BOBBERS.length * ENCHANTS.length;
    expect(result.searchedCount).toBe(fullSpace);
  });

  it('searchedCount equals totalCombinationSpace (exhaustive search covers everything)', () => {
    const result = optimizeFullBuild(baseParams);
    expect(result.searchedCount).toBe(result.totalCombinationSpace);
  });

  it('totalCombinationSpace equals full equipment product', () => {
    const result = optimizeFullBuild(baseParams);
    expect(result.totalCombinationSpace).toBe(
      RODS.length * LINES.length * BOBBERS.length * ENCHANTS.length,
    );
  });

  it('all topBuild entries have non-negative EV/hour', () => {
    const result = optimizeFullBuild(baseParams);
    result.topBuilds.forEach((entry) => {
      expect(entry.expectedValuePerHour).toBeGreaterThanOrEqual(0);
    });
  });

  it('each topBuild entry has all four item slots populated', () => {
    const result = optimizeFullBuild(baseParams);
    result.topBuilds.forEach((entry) => {
      expect(entry.items.rod).toBeDefined();
      expect(entry.items.line).toBeDefined();
      expect(entry.items.bobber).toBeDefined();
      expect(entry.items.enchant).toBeDefined();
      expect(entry.loadout.rodId).toBe(entry.items.rod.id);
      expect(entry.loadout.lineId).toBe(entry.items.line.id);
      expect(entry.loadout.bobberId).toBe(entry.items.bobber.id);
      expect(entry.loadout.enchantId).toBe(entry.items.enchant.id);
    });
  });

  it('works for open-sea area', () => {
    const result = optimizeFullBuild(getDefaultParams('open-sea'));
    expect(result.topBuilds.length).toBeGreaterThan(0);
  });

  it('topNResults=1 returns exactly 1 topBuild entry', () => {
    const result = optimizeFullBuild(baseParams, 1);
    expect(result.topBuilds.length).toBe(1);
    // But all combinations were still searched
    expect(result.searchedCount).toBe(result.totalCombinationSpace);
  });
});
