import { describe, expect, it } from 'vitest';
import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import { getDefaultParams } from '@/lib/calculator';
import { rankAllSlots, rankSlot } from '@/lib/ranking';

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
