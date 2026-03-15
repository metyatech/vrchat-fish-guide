import { describe, expect, it, vi } from 'vitest';
import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import { getDefaultParams } from '@/lib/calculator';
import {
  optimizeFullBuild,
  optimizeFullBuildAsync,
  rankAllSlots,
  rankSlot,
  OptimizerProgressEvent,
} from '@/lib/ranking';

describe('rankSlot', () => {
  const baseParams = {
    ...getDefaultParams('coconut-bay'),
    timeOfDay: 'day' as const,
    weatherType: 'clear' as const,
  };

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
    const ranked = rankAllSlots({
      ...getDefaultParams('coconut-bay'),
      timeOfDay: 'day',
      weatherType: 'clear',
    });
    expect(Object.keys(ranked)).toEqual(
      expect.arrayContaining(['rod', 'line', 'bobber', 'enchant']),
    );
  });

  it('each slot list is sorted descending by EV/hour', () => {
    const ranked = rankAllSlots({
      ...getDefaultParams('coconut-bay'),
      timeOfDay: 'day',
      weatherType: 'clear',
    });
    for (const entries of Object.values(ranked)) {
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1].expectedValuePerHour).toBeGreaterThanOrEqual(
          entries[i].expectedValuePerHour,
        );
      }
    }
  });

  it('works for open-sea area', () => {
    const ranked = rankAllSlots({
      ...getDefaultParams('open-sea'),
      timeOfDay: 'day',
      weatherType: 'clear',
    });
    expect(ranked.rod.length).toBeGreaterThan(0);
  });
});

describe('optimizeFullBuild', () => {
  const baseParams = {
    ...getDefaultParams('coconut-bay'),
    timeOfDay: 'day' as const,
    weatherType: 'clear' as const,
  };

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
    const result = optimizeFullBuild({
      ...getDefaultParams('open-sea'),
      timeOfDay: 'day',
      weatherType: 'clear',
    });
    expect(result.topBuilds.length).toBeGreaterThan(0);
  });

  it('topNResults=1 returns exactly 1 topBuild entry', () => {
    const result = optimizeFullBuild(baseParams, 1);
    expect(result.topBuilds.length).toBe(1);
    // But all combinations were still searched
    expect(result.searchedCount).toBe(result.totalCombinationSpace);
  });

  it('topNResults=0 returns no builds but still evaluates the full search space', () => {
    const result = optimizeFullBuild(baseParams, 0);
    expect(result.topBuilds).toEqual([]);
    expect(result.searchedCount).toBe(result.totalCombinationSpace);
  });
});

describe('optimizeFullBuildAsync', () => {
  const baseParams = {
    ...getDefaultParams('coconut-bay'),
    timeOfDay: 'day' as const,
    weatherType: 'clear' as const,
  };

  it('returns the same top builds as the sync version', async () => {
    const syncResult = optimizeFullBuild(baseParams, 5);
    const asyncResult = await optimizeFullBuildAsync(baseParams, 5);
    expect(asyncResult).not.toBeNull();
    expect(asyncResult!.topBuilds).toHaveLength(syncResult.topBuilds.length);
    for (let i = 0; i < syncResult.topBuilds.length; i++) {
      expect(asyncResult!.topBuilds[i].expectedValuePerHour).toBeCloseTo(
        syncResult.topBuilds[i].expectedValuePerHour,
        5,
      );
      expect(asyncResult!.topBuilds[i].loadout).toEqual(syncResult.topBuilds[i].loadout);
    }
  }, 30000);

  it('returns null when aborted before starting', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await optimizeFullBuildAsync(baseParams, 5, controller.signal);
    expect(result).toBeNull();
  });

  it('returns null or a valid result when aborted mid-flight (no error thrown)', async () => {
    const controller = new AbortController();
    const promise = optimizeFullBuildAsync(baseParams, 5, controller.signal);
    setTimeout(() => controller.abort(), 0);
    const result = await promise;
    expect(result === null || typeof result === 'object').toBe(true);
  }, 30000);

  it('searchedCount and totalCombinationSpace match sync version', async () => {
    const syncResult = optimizeFullBuild(baseParams, 5);
    const asyncResult = await optimizeFullBuildAsync(baseParams, 5);
    expect(asyncResult).not.toBeNull();
    expect(asyncResult!.searchedCount).toBe(syncResult.searchedCount);
    expect(asyncResult!.totalCombinationSpace).toBe(syncResult.totalCombinationSpace);
  }, 30000);

  it('returns no builds when topNResults=0', async () => {
    const result = await optimizeFullBuildAsync(baseParams, 0);
    expect(result).not.toBeNull();
    expect(result!.topBuilds).toEqual([]);
    expect(result!.searchedCount).toBe(result!.totalCombinationSpace);
  }, 30000);
});

describe('optimizeFullBuildAsync onProgress callback', () => {
  const baseParams = {
    ...getDefaultParams('coconut-bay'),
    timeOfDay: 'day' as const,
    weatherType: 'clear' as const,
  };

  it('calls onProgress at least once with isComplete=false before the final isComplete=true event', async () => {
    const events: OptimizerProgressEvent[] = [];
    await optimizeFullBuildAsync(baseParams, 5, undefined, (e) => events.push(e));
    const intermediates = events.filter((e) => !e.isComplete);
    const finals = events.filter((e) => e.isComplete);
    expect(intermediates.length).toBeGreaterThan(0);
    expect(finals).toHaveLength(1);
    // Final event must be last
    expect(events[events.length - 1].isComplete).toBe(true);
  }, 30000);

  it('searchedCount is non-decreasing across all progress events', async () => {
    const counts: number[] = [];
    await optimizeFullBuildAsync(baseParams, 5, undefined, (e) => counts.push(e.searchedCount));
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
  }, 30000);

  it('final progress event searchedCount equals totalCombinationSpace', async () => {
    let finalEvent: OptimizerProgressEvent | null = null;
    await optimizeFullBuildAsync(baseParams, 5, undefined, (e) => {
      if (e.isComplete) finalEvent = e;
    });
    expect(finalEvent).not.toBeNull();
    expect(finalEvent!.searchedCount).toBe(finalEvent!.totalCombinationSpace);
    const fullSpace = RODS.length * LINES.length * BOBBERS.length * ENCHANTS.length;
    expect(finalEvent!.searchedCount).toBe(fullSpace);
  }, 30000);

  it('all but the last intermediate progress event have searchedCount < totalCombinationSpace', async () => {
    const intermediates: OptimizerProgressEvent[] = [];
    await optimizeFullBuildAsync(baseParams, 5, undefined, (e) => {
      if (!e.isComplete) intermediates.push(e);
    });
    // At least one intermediate should exist before the full space is covered.
    expect(intermediates.length).toBeGreaterThan(1);
    // All but the final intermediate (last-rod chunk) must be strictly partial.
    const allButLast = intermediates.slice(0, -1);
    for (const e of allButLast) {
      expect(e.searchedCount).toBeLessThan(e.totalCombinationSpace);
    }
  }, 30000);

  it('does not call onProgress when aborted before the first yield', async () => {
    const controller = new AbortController();
    controller.abort();
    const callCount = { n: 0 };
    const result = await optimizeFullBuildAsync(baseParams, 5, controller.signal, () => {
      callCount.n++;
    });
    expect(result).toBeNull();
    expect(callCount.n).toBe(0);
  });

  it('top 1 from buffer-100 matches top 1 from buffer-1 (exhaustive semantics preserved)', async () => {
    const [r1, r100] = await Promise.all([
      optimizeFullBuildAsync(baseParams, 1),
      optimizeFullBuildAsync(baseParams, 100),
    ]);
    expect(r1).not.toBeNull();
    expect(r100).not.toBeNull();
    expect(r100!.topBuilds[0].expectedValuePerHour).toBeCloseTo(
      r1!.topBuilds[0].expectedValuePerHour,
      5,
    );
    expect(r100!.topBuilds[0].loadout).toEqual(r1!.topBuilds[0].loadout);
  }, 60000);

  it('buffer-100 returns up to 100 builds', async () => {
    const result = await optimizeFullBuildAsync(baseParams, 100);
    expect(result).not.toBeNull();
    expect(result!.topBuilds.length).toBe(100);
    expect(result!.searchedCount).toBe(result!.totalCombinationSpace);
  }, 30000);
});
