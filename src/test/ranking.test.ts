import { describe, expect, it, vi } from 'vitest';
import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import { FISHING_AREAS } from '@/data/fish';
import {
  calculateDistribution,
  calculateOptimizerMetrics,
  getDefaultParams,
} from '@/lib/calculator';
import {
  computeSubsetSearchSpace,
  optimizeFullBuild,
  optimizeFullBuildAsync,
  optimizeSubsetBuild,
  optimizeSubsetBuildAsync,
  rankAllSlots,
  rankAllSlotsWithAreaBreakdown,
  rankSlot,
  rankSlotWithAreaBreakdown,
  OptimizerProgressEvent,
  RankSlot,
  SubsetOptimizerProgressEvent,
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

  it('returns one entry per fishing area when ranking areas directly', () => {
    const entries = rankSlot(baseParams, 'area');
    expect(entries).toHaveLength(FISHING_AREAS.length);
    expect(entries.every((entry) => entry.slot === 'area')).toBe(true);
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

  it('can expand ranking into one row per area when auto area is selected', () => {
    const entries = rankSlotWithAreaBreakdown(
      {
        ...getDefaultParams(),
        timeOfDay: 'day',
        weatherType: 'clear',
      },
      'rod',
    );
    expect(entries).toHaveLength(RODS.length * FISHING_AREAS.length);
    expect(entries.every((entry) => entry.areaId && entry.areaName)).toBe(true);
    expect(new Set(entries.map((entry) => entry.rankingKey)).size).toBe(entries.length);
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
      expect.arrayContaining(['rod', 'line', 'bobber', 'enchant', 'area']),
    );
  });

  it('includes area rankings alongside equipment slots', () => {
    const ranked = rankAllSlots({
      ...getDefaultParams('coconut-bay'),
      timeOfDay: 'day',
      weatherType: 'clear',
    });
    expect(ranked.area).toHaveLength(FISHING_AREAS.length);
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

  it('can return per-area ranking rows when the base params use auto area', () => {
    const ranked = rankAllSlotsWithAreaBreakdown({
      ...getDefaultParams(),
      timeOfDay: 'day',
      weatherType: 'clear',
    });
    expect(ranked.rod.length).toBe(RODS.length * FISHING_AREAS.length);
    expect(ranked.line.length).toBe(LINES.length * FISHING_AREAS.length);
    expect(ranked.bobber.length).toBe(BOBBERS.length * FISHING_AREAS.length);
    expect(ranked.enchant.length).toBe(ENCHANTS.length * FISHING_AREAS.length);
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

  it('searchedCount equals totalCombinationSpace', () => {
    const result = optimizeFullBuild(baseParams);
    expect(result.searchedCount).toBe(result.totalCombinationSpace);
  });

  it('totalCombinationSpace is smaller than the raw full product because dominated gear is pruned', () => {
    const result = optimizeFullBuild(baseParams);
    const fullSpace = RODS.length * LINES.length * BOBBERS.length * ENCHANTS.length;
    expect(result.totalCombinationSpace).toBeLessThan(fullSpace);
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

  it('topNResults=0 returns no builds but still evaluates the exact search space', () => {
    const result = optimizeFullBuild(baseParams, 0);
    expect(result.topBuilds).toEqual([]);
    expect(result.searchedCount).toBe(result.totalCombinationSpace);
  });

  it('matches brute-force raw full-space search despite dominated-gear pruning', () => {
    const bruteForce = [];

    for (const rod of RODS) {
      for (const line of LINES) {
        for (const bobber of BOBBERS) {
          for (const enchant of ENCHANTS) {
            const loadout = {
              rodId: rod.id,
              lineId: line.id,
              bobberId: bobber.id,
              enchantId: enchant.id,
            };
            const metrics = calculateOptimizerMetrics({ ...baseParams, loadout });
            bruteForce.push({
              loadout,
              expectedValuePerHour: metrics.expectedValuePerHour,
            });
          }
        }
      }
    }

    const expectedTopFive = bruteForce
      .toSorted((a, b) => b.expectedValuePerHour - a.expectedValuePerHour)
      .slice(0, 5);
    const actual = optimizeFullBuild(baseParams, 5);

    expect(actual.topBuilds.map((entry) => entry.loadout)).toEqual(
      expectedTopFive.map((entry) => entry.loadout),
    );
    for (let i = 0; i < expectedTopFive.length; i++) {
      expect(actual.topBuilds[i].expectedValuePerHour).toBeCloseTo(
        expectedTopFive[i].expectedValuePerHour,
        8,
      );
    }
  }, 30000);
});

describe('calculateOptimizerMetrics', () => {
  it.each([
    {
      name: 'fixed daytime area',
      params: {
        ...getDefaultParams('coconut-bay'),
        timeOfDay: 'day' as const,
        weatherType: 'clear' as const,
      },
    },
    {
      name: 'best-area averaged conditions with a conditional enchant',
      params: {
        ...getDefaultParams(),
        loadout: {
          ...getDefaultParams().loadout,
          enchantId: 'day-walker',
        },
      },
    },
    {
      name: 'direct value multiplier enchant',
      params: {
        ...getDefaultParams('open-sea'),
        timeOfDay: 'night' as const,
        weatherType: 'rainy' as const,
        loadout: {
          ...getDefaultParams('open-sea').loadout,
          enchantId: 'money-maker',
        },
      },
    },
  ])('matches calculateDistribution for $name', ({ params }) => {
    const distribution = calculateDistribution(params);
    const optimizerMetrics = calculateOptimizerMetrics(params);

    expect(optimizerMetrics.expectedValuePerHour).toBeCloseTo(distribution.expectedValuePerHour, 8);
    expect(optimizerMetrics.expectedValuePerCatch).toBeCloseTo(
      distribution.expectedValuePerCatch,
      8,
    );
    expect(optimizerMetrics.totalFishProbability).toBeCloseTo(distribution.totalFishProbability, 8);
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
    expect(finalEvent!.totalCombinationSpace).toBeLessThan(fullSpace);
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

  it('top 1 from buffer-100 matches top 1 from buffer-1 (exact semantics preserved)', async () => {
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

// ─────────────────────────────────────────────────────────────────────────────
// computeSubsetSearchSpace
// ─────────────────────────────────────────────────────────────────────────────

describe('computeSubsetSearchSpace', () => {
  it('{rod} space equals pruned OPTIMIZER_RODS length', () => {
    const space = computeSubsetSearchSpace(['rod']);
    // Must be ≤ RODS.length (pruning removes dominated items)
    expect(space).toBeGreaterThan(0);
    expect(space).toBeLessThanOrEqual(RODS.length);
  });

  it('{rod, line} space equals pruned rod × pruned line counts', () => {
    const rodSpace = computeSubsetSearchSpace(['rod']);
    const lineSpace = computeSubsetSearchSpace(['line']);
    expect(computeSubsetSearchSpace(['rod', 'line'])).toBe(rodSpace * lineSpace);
  });

  it('{rod, line, bobber, enchant} matches full-build search space', () => {
    const subsetSpace = computeSubsetSearchSpace(['rod', 'line', 'bobber', 'enchant']);
    const fullResult = optimizeFullBuild(
      { ...getDefaultParams('coconut-bay'), timeOfDay: 'day', weatherType: 'clear' },
      1,
    );
    expect(subsetSpace).toBe(fullResult.totalCombinationSpace);
  });

  it('empty subset returns 1 (single implicit combination)', () => {
    expect(computeSubsetSearchSpace([])).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// optimizeSubsetBuild
// ─────────────────────────────────────────────────────────────────────────────

describe('optimizeSubsetBuild', () => {
  const baseParams = {
    ...getDefaultParams('coconut-bay'),
    timeOfDay: 'day' as const,
    weatherType: 'clear' as const,
  };

  it('varyingSlots is preserved in result', () => {
    const slots: RankSlot[] = ['rod', 'bobber'];
    const result = optimizeSubsetBuild(baseParams, slots, 5);
    expect(result.varyingSlots).toEqual(slots);
  });

  it('searchedCount equals totalCombinationSpace', () => {
    const result = optimizeSubsetBuild(baseParams, ['rod', 'line'], 5);
    expect(result.searchedCount).toBe(result.totalCombinationSpace);
  });

  it('totalCombinationSpace matches computeSubsetSearchSpace for {rod, line}', () => {
    const result = optimizeSubsetBuild(baseParams, ['rod', 'line'], 5);
    expect(result.totalCombinationSpace).toBe(computeSubsetSearchSpace(['rod', 'line']));
  });

  it('non-varying slots are fixed at baseParams.loadout values', () => {
    const result = optimizeSubsetBuild(baseParams, ['rod', 'enchant'], 10);
    result.topBuilds.forEach((entry) => {
      expect(entry.loadout.lineId).toBe(baseParams.loadout.lineId);
      expect(entry.loadout.bobberId).toBe(baseParams.loadout.bobberId);
    });
  });

  it('non-varying rod/line slots are fixed', () => {
    const result = optimizeSubsetBuild(baseParams, ['bobber', 'enchant'], 10);
    result.topBuilds.forEach((entry) => {
      expect(entry.loadout.rodId).toBe(baseParams.loadout.rodId);
      expect(entry.loadout.lineId).toBe(baseParams.loadout.lineId);
    });
  });

  it('topBuilds sorted descending by EV/hour', () => {
    const result = optimizeSubsetBuild(baseParams, ['rod', 'line'], 10);
    for (let i = 1; i < result.topBuilds.length; i++) {
      expect(result.topBuilds[i - 1].expectedValuePerHour).toBeGreaterThanOrEqual(
        result.topBuilds[i].expectedValuePerHour,
      );
    }
  });

  it('all-4-slots subset top-5 matches optimizeFullBuild top-5', () => {
    const fullResult = optimizeFullBuild(baseParams, 5);
    const subsetResult = optimizeSubsetBuild(baseParams, ['rod', 'line', 'bobber', 'enchant'], 5);
    expect(subsetResult.topBuilds.map((e) => e.loadout)).toEqual(
      fullResult.topBuilds.map((e) => e.loadout),
    );
    for (let i = 0; i < fullResult.topBuilds.length; i++) {
      expect(subsetResult.topBuilds[i].expectedValuePerHour).toBeCloseTo(
        fullResult.topBuilds[i].expectedValuePerHour,
        8,
      );
    }
  });

  it('matches brute-force raw search for {rod, enchant} subset', () => {
    const bruteForce: Array<{
      loadout: (typeof baseParams)['loadout'];
      expectedValuePerHour: number;
    }> = [];

    for (const rod of RODS) {
      for (const enchant of ENCHANTS) {
        const loadout = {
          rodId: rod.id,
          lineId: baseParams.loadout.lineId,
          bobberId: baseParams.loadout.bobberId,
          enchantId: enchant.id,
        };
        const metrics = calculateOptimizerMetrics({ ...baseParams, loadout });
        bruteForce.push({ loadout, expectedValuePerHour: metrics.expectedValuePerHour });
      }
    }

    const expectedTop5 = bruteForce
      .toSorted((a, b) => b.expectedValuePerHour - a.expectedValuePerHour)
      .slice(0, 5);
    const actual = optimizeSubsetBuild(baseParams, ['rod', 'enchant'], 5);

    expect(actual.topBuilds.map((e) => e.loadout)).toEqual(expectedTop5.map((e) => e.loadout));
    for (let i = 0; i < expectedTop5.length; i++) {
      expect(actual.topBuilds[i].expectedValuePerHour).toBeCloseTo(
        expectedTop5[i].expectedValuePerHour,
        8,
      );
    }
  }, 10000);

  it('matches brute-force raw search for {rod, line} subset', () => {
    const bruteForce: Array<{
      loadout: (typeof baseParams)['loadout'];
      expectedValuePerHour: number;
    }> = [];

    for (const rod of RODS) {
      for (const line of LINES) {
        const loadout = {
          rodId: rod.id,
          lineId: line.id,
          bobberId: baseParams.loadout.bobberId,
          enchantId: baseParams.loadout.enchantId,
        };
        const metrics = calculateOptimizerMetrics({ ...baseParams, loadout });
        bruteForce.push({ loadout, expectedValuePerHour: metrics.expectedValuePerHour });
      }
    }

    const expectedTop5 = bruteForce
      .toSorted((a, b) => b.expectedValuePerHour - a.expectedValuePerHour)
      .slice(0, 5);
    const actual = optimizeSubsetBuild(baseParams, ['rod', 'line'], 5);

    expect(actual.topBuilds.map((e) => e.loadout)).toEqual(expectedTop5.map((e) => e.loadout));
    for (let i = 0; i < expectedTop5.length; i++) {
      expect(actual.topBuilds[i].expectedValuePerHour).toBeCloseTo(
        expectedTop5[i].expectedValuePerHour,
        8,
      );
    }
  }, 10000);

  it('works for open-sea area with {line, bobber} subset', () => {
    const result = optimizeSubsetBuild(
      { ...getDefaultParams('open-sea'), timeOfDay: 'day', weatherType: 'clear' },
      ['line', 'bobber'],
      5,
    );
    expect(result.topBuilds.length).toBeGreaterThan(0);
  });

  it('topNResults=0 returns no builds but still evaluates the full subset space', () => {
    const result = optimizeSubsetBuild(baseParams, ['rod', 'enchant'], 0);
    expect(result.topBuilds).toEqual([]);
    expect(result.searchedCount).toBe(result.totalCombinationSpace);
  });

  it('adds fishing areas into subset search space when area is varied', () => {
    expect(computeSubsetSearchSpace(['area'])).toBe(FISHING_AREAS.length);
    expect(computeSubsetSearchSpace(['rod', 'area'])).toBe(RODS.length * FISHING_AREAS.length);
  });

  it('tracks the chosen area in subset optimizer results when area varies', () => {
    const result = optimizeSubsetBuild(baseParams, ['area'], 3);
    expect(result.topBuilds.length).toBeGreaterThan(0);
    expect(result.topBuilds.every((entry) => entry.areaId && entry.areaName)).toBe(true);
    expect(new Set(result.topBuilds.map((entry) => entry.areaId)).size).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// optimizeSubsetBuildAsync
// ─────────────────────────────────────────────────────────────────────────────

describe('optimizeSubsetBuildAsync', () => {
  const baseParams = {
    ...getDefaultParams('coconut-bay'),
    timeOfDay: 'day' as const,
    weatherType: 'clear' as const,
  };

  it('returns same results as sync for {rod, line} subset', async () => {
    const syncResult = optimizeSubsetBuild(baseParams, ['rod', 'line'], 5);
    const asyncResult = await optimizeSubsetBuildAsync(baseParams, ['rod', 'line'], 5);
    expect(asyncResult).not.toBeNull();
    expect(asyncResult!.topBuilds).toHaveLength(syncResult.topBuilds.length);
    for (let i = 0; i < syncResult.topBuilds.length; i++) {
      expect(asyncResult!.topBuilds[i].expectedValuePerHour).toBeCloseTo(
        syncResult.topBuilds[i].expectedValuePerHour,
        5,
      );
      expect(asyncResult!.topBuilds[i].loadout).toEqual(syncResult.topBuilds[i].loadout);
    }
  }, 10000);

  it('returns same results as sync for {rod, enchant} subset', async () => {
    const syncResult = optimizeSubsetBuild(baseParams, ['rod', 'enchant'], 5);
    const asyncResult = await optimizeSubsetBuildAsync(baseParams, ['rod', 'enchant'], 5);
    expect(asyncResult).not.toBeNull();
    for (let i = 0; i < syncResult.topBuilds.length; i++) {
      expect(asyncResult!.topBuilds[i].loadout).toEqual(syncResult.topBuilds[i].loadout);
    }
  }, 10000);

  it('all-4-slots async matches optimizeFullBuildAsync top-5', async () => {
    const [subsetResult, fullResult] = await Promise.all([
      optimizeSubsetBuildAsync(baseParams, ['rod', 'line', 'bobber', 'enchant'], 5),
      optimizeFullBuildAsync(baseParams, 5),
    ]);
    expect(subsetResult).not.toBeNull();
    expect(fullResult).not.toBeNull();
    expect(subsetResult!.topBuilds.map((e) => e.loadout)).toEqual(
      fullResult!.topBuilds.map((e) => e.loadout),
    );
  }, 60000);

  it('returns null when aborted before starting', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await optimizeSubsetBuildAsync(
      baseParams,
      ['rod', 'line'],
      5,
      controller.signal,
    );
    expect(result).toBeNull();
  });

  it('returns null or valid result when aborted mid-flight (no error thrown)', async () => {
    const controller = new AbortController();
    const promise = optimizeSubsetBuildAsync(baseParams, ['rod', 'line'], 5, controller.signal);
    setTimeout(() => controller.abort(), 0);
    const result = await promise;
    expect(result === null || typeof result === 'object').toBe(true);
  }, 10000);

  it('varyingSlots is preserved in result', async () => {
    const slots: RankSlot[] = ['rod', 'bobber'];
    const result = await optimizeSubsetBuildAsync(baseParams, slots, 5);
    expect(result).not.toBeNull();
    expect(Array.from(result!.varyingSlots)).toEqual(slots);
  }, 10000);

  it('searchedCount and totalCombinationSpace match sync for {rod, enchant}', async () => {
    const syncResult = optimizeSubsetBuild(baseParams, ['rod', 'enchant'], 5);
    const asyncResult = await optimizeSubsetBuildAsync(baseParams, ['rod', 'enchant'], 5);
    expect(asyncResult).not.toBeNull();
    expect(asyncResult!.searchedCount).toBe(syncResult.searchedCount);
    expect(asyncResult!.totalCombinationSpace).toBe(syncResult.totalCombinationSpace);
  }, 10000);

  it('progress events are non-decreasing in searchedCount for {rod, line}', async () => {
    const counts: number[] = [];
    await optimizeSubsetBuildAsync(baseParams, ['rod', 'line'], 5, undefined, (e) =>
      counts.push(e.searchedCount),
    );
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
  }, 10000);

  it('final progress event has isComplete=true and searchedCount equals totalCombinationSpace', async () => {
    let finalEvent: SubsetOptimizerProgressEvent | null = null;
    await optimizeSubsetBuildAsync(baseParams, ['rod', 'line'], 5, undefined, (e) => {
      if (e.isComplete) finalEvent = e;
    });
    expect(finalEvent).not.toBeNull();
    expect(finalEvent!.searchedCount).toBe(finalEvent!.totalCombinationSpace);
  }, 10000);

  it('does not call onProgress when aborted before the first yield', async () => {
    const controller = new AbortController();
    controller.abort();
    let callCount = 0;
    const result = await optimizeSubsetBuildAsync(
      baseParams,
      ['rod', 'line'],
      5,
      controller.signal,
      () => {
        callCount++;
      },
    );
    expect(result).toBeNull();
    expect(callCount).toBe(0);
  });

  it('non-varying slots are fixed in async results', async () => {
    const result = await optimizeSubsetBuildAsync(baseParams, ['rod', 'enchant'], 10);
    expect(result).not.toBeNull();
    result!.topBuilds.forEach((entry) => {
      expect(entry.loadout.lineId).toBe(baseParams.loadout.lineId);
      expect(entry.loadout.bobberId).toBe(baseParams.loadout.bobberId);
    });
  }, 10000);

  it('full leaderboard progress stays lightweight until completion', async () => {
    const slots = ['rod', 'line', 'bobber', 'enchant', 'area'] as const;
    const total = computeSubsetSearchSpace(slots);
    const intermediateSizes: number[] = [];
    let finalSize = 0;

    const result = await optimizeSubsetBuildAsync(baseParams, slots, total, undefined, (event) => {
      if (event.isComplete) {
        finalSize = event.topBuilds.length;
        return;
      }
      intermediateSizes.push(event.topBuilds.length);
    });

    expect(result).not.toBeNull();
    expect(intermediateSizes.length).toBeGreaterThan(0);
    expect(intermediateSizes.every((size) => size === 0)).toBe(true);
    expect(finalSize).toBe(total);
    expect(result!.topBuilds).toHaveLength(total);
  }, 60000);
});

describe('optimizeSubsetBuild (additional)', () => {
  const baseParams = {
    ...getDefaultParams('coconut-bay'),
    timeOfDay: 'day' as const,
    weatherType: 'clear' as const,
  };

  it('subset {rod} top-5 matches raw brute-force over all rods', () => {
    const bruteForce = RODS.map((rod) => {
      const loadout = {
        ...baseParams.loadout,
        rodId: rod.id,
      };
      const metrics = calculateOptimizerMetrics({ ...baseParams, loadout });
      return { loadout, expectedValuePerHour: metrics.expectedValuePerHour };
    })
      .toSorted((a, b) => b.expectedValuePerHour - a.expectedValuePerHour)
      .slice(0, 5);

    const result = optimizeSubsetBuild(baseParams, ['rod'], 5);
    expect(result.varyingSlots).toEqual(['rod']);
    expect(result.topBuilds).toHaveLength(5);
    // Only compare EV/hour values (not exact rod IDs) because ties in EV/hour
    // can produce different but equally valid orderings between the two methods.
    const resultEvs = result.topBuilds.map((b) => b.expectedValuePerHour).toSorted((a, b) => b - a);
    const bruteForceEvs = bruteForce.map((b) => b.expectedValuePerHour).toSorted((a, b) => b - a);
    for (let i = 0; i < 5; i++) {
      expect(resultEvs[i]).toBeCloseTo(bruteForceEvs[i], 8);
    }
  });

  it('subset {rod, enchant} top-5 matches raw brute-force', () => {
    const bruteForce: { loadout: typeof baseParams.loadout; expectedValuePerHour: number }[] = [];
    for (const rod of RODS) {
      for (const enchant of ENCHANTS) {
        const loadout = {
          ...baseParams.loadout,
          rodId: rod.id,
          enchantId: enchant.id,
        };
        const metrics = calculateOptimizerMetrics({ ...baseParams, loadout });
        bruteForce.push({ loadout, expectedValuePerHour: metrics.expectedValuePerHour });
      }
    }
    const expectedTop5 = bruteForce
      .toSorted((a, b) => b.expectedValuePerHour - a.expectedValuePerHour)
      .slice(0, 5);

    const result = optimizeSubsetBuild(baseParams, ['rod', 'enchant'], 5);
    expect(result.varyingSlots).toEqual(['rod', 'enchant']);
    expect(result.totalCombinationSpace).toBeLessThanOrEqual(RODS.length * ENCHANTS.length);
    for (let i = 0; i < 5; i++) {
      expect(result.topBuilds[i].loadout.rodId).toBe(expectedTop5[i].loadout.rodId);
      expect(result.topBuilds[i].loadout.enchantId).toBe(expectedTop5[i].loadout.enchantId);
      expect(result.topBuilds[i].expectedValuePerHour).toBeCloseTo(
        expectedTop5[i].expectedValuePerHour,
        8,
      );
    }
  }, 30000);

  it('subset {line, bobber, enchant} top-5 matches raw brute-force', () => {
    const bruteForce: { loadout: typeof baseParams.loadout; expectedValuePerHour: number }[] = [];
    for (const line of LINES) {
      for (const bobber of BOBBERS) {
        for (const enchant of ENCHANTS) {
          const loadout = {
            ...baseParams.loadout,
            lineId: line.id,
            bobberId: bobber.id,
            enchantId: enchant.id,
          };
          const metrics = calculateOptimizerMetrics({ ...baseParams, loadout });
          bruteForce.push({ loadout, expectedValuePerHour: metrics.expectedValuePerHour });
        }
      }
    }
    const expectedTop5 = bruteForce
      .toSorted((a, b) => b.expectedValuePerHour - a.expectedValuePerHour)
      .slice(0, 5);

    const result = optimizeSubsetBuild(baseParams, ['line', 'bobber', 'enchant'], 5);
    expect(result.varyingSlots).toEqual(['line', 'bobber', 'enchant']);
    for (let i = 0; i < 5; i++) {
      expect(result.topBuilds[i].loadout.lineId).toBe(expectedTop5[i].loadout.lineId);
      expect(result.topBuilds[i].loadout.bobberId).toBe(expectedTop5[i].loadout.bobberId);
      expect(result.topBuilds[i].loadout.enchantId).toBe(expectedTop5[i].loadout.enchantId);
      expect(result.topBuilds[i].expectedValuePerHour).toBeCloseTo(
        expectedTop5[i].expectedValuePerHour,
        8,
      );
    }
  }, 30000);

  it('all-4-slot subset top builds match optimizeFullBuild', () => {
    const fullResult = optimizeFullBuild(baseParams, 5);
    const subsetResult = optimizeSubsetBuild(baseParams, ['rod', 'line', 'bobber', 'enchant'], 5);
    expect(subsetResult.topBuilds).toHaveLength(fullResult.topBuilds.length);
    for (let i = 0; i < fullResult.topBuilds.length; i++) {
      expect(subsetResult.topBuilds[i].loadout).toEqual(fullResult.topBuilds[i].loadout);
      expect(subsetResult.topBuilds[i].expectedValuePerHour).toBeCloseTo(
        fullResult.topBuilds[i].expectedValuePerHour,
        8,
      );
    }
  }, 30000);

  it('fixed slots use the baseParams loadout values', () => {
    const result = optimizeSubsetBuild(baseParams, ['enchant'], 5);
    result.topBuilds.forEach((entry) => {
      expect(entry.loadout.rodId).toBe(baseParams.loadout.rodId);
      expect(entry.loadout.lineId).toBe(baseParams.loadout.lineId);
      expect(entry.loadout.bobberId).toBe(baseParams.loadout.bobberId);
    });
  });

  it('searchedCount equals totalCombinationSpace', () => {
    const result = optimizeSubsetBuild(baseParams, ['rod', 'enchant'], 5);
    expect(result.searchedCount).toBe(result.totalCombinationSpace);
  });

  it('single-slot {enchant} totalCombinationSpace equals ENCHANTS.length', () => {
    const result = optimizeSubsetBuild(baseParams, ['enchant'], 10);
    expect(result.totalCombinationSpace).toBe(ENCHANTS.length);
    expect(result.searchedCount).toBe(ENCHANTS.length);
  });
});

describe('rankSlot ascending/descending order', () => {
  const baseParams = {
    ...getDefaultParams('coconut-bay'),
    timeOfDay: 'day' as const,
    weatherType: 'clear' as const,
  };

  it('rankSlot returns descending by default', () => {
    const entries = rankSlot(baseParams, 'rod');
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].expectedValuePerHour).toBeGreaterThanOrEqual(
        entries[i].expectedValuePerHour,
      );
    }
  });

  it('reversed rankSlot entries are ascending by EV/hour', () => {
    const entries = rankSlot(baseParams, 'enchant');
    const ascending = [...entries].reverse();
    for (let i = 1; i < ascending.length; i++) {
      expect(ascending[i - 1].expectedValuePerHour).toBeLessThanOrEqual(
        ascending[i].expectedValuePerHour,
      );
    }
  });

  it('first and last entries are most/least EV respectively', () => {
    const entries = rankSlot(baseParams, 'rod');
    const best = entries[0];
    const worst = entries[entries.length - 1];
    expect(best.expectedValuePerHour).toBeGreaterThanOrEqual(worst.expectedValuePerHour);
  });
});
