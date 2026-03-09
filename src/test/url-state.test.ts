import { describe, expect, it } from 'vitest';
import {
  createBuildFrom,
  createDefaultBuild,
  decodeUrlState,
  duplicateBuild,
  encodeUrlState,
  generateBuildId,
  removeBuild,
  renameBuild,
  updateBuildParams,
} from '@/lib/url-state';
import { getDefaultParams } from '@/lib/calculator';
import { BuildConfig } from '@/types';

describe('generateBuildId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateBuildId()).toBe('string');
    expect(generateBuildId().length).toBeGreaterThan(0);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateBuildId()));
    expect(ids.size).toBe(100);
  });
});

describe('createDefaultBuild', () => {
  it('creates a build with the given areaId', () => {
    const build = createDefaultBuild('open-sea');
    expect(build.params.areaId).toBe('open-sea');
  });

  it('defaults to coconut-bay', () => {
    const build = createDefaultBuild();
    expect(build.params.areaId).toBe('coconut-bay');
  });

  it('has a non-empty id and name', () => {
    const build = createDefaultBuild();
    expect(build.id.length).toBeGreaterThan(0);
    expect(build.name.length).toBeGreaterThan(0);
  });
});

describe('encodeUrlState / decodeUrlState round-trip', () => {
  function makeBuild(name: string, area = 'coconut-bay'): BuildConfig {
    return { id: generateBuildId(), name, params: getDefaultParams(area) };
  }

  it('round-trips a single build', () => {
    const build = makeBuild('My Build');
    const state = { builds: [build], activeId: build.id };
    const encoded = encodeUrlState(state);
    const decoded = decodeUrlState(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.builds).toHaveLength(1);
    expect(decoded!.builds[0].id).toBe(build.id);
    expect(decoded!.builds[0].name).toBe('My Build');
    expect(decoded!.activeId).toBe(build.id);
  });

  it('round-trips multiple builds', () => {
    const b1 = makeBuild('Build 1', 'coconut-bay');
    const b2 = makeBuild('Build 2', 'open-sea');
    const state = { builds: [b1, b2], activeId: b2.id };
    const encoded = encodeUrlState(state);
    const decoded = decodeUrlState(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.builds).toHaveLength(2);
    expect(decoded!.activeId).toBe(b2.id);
    expect(decoded!.builds[1].params.areaId).toBe('open-sea');
  });

  it('preserves all CalculatorParams fields', () => {
    const build = makeBuild('Params Build');
    build.params.observedAvgCatchTimeSec = 73;
    build.params.observedMissRate = 0.15;
    build.params.modifierAssumptions = { includeModifiers: true, assumeCursedToBlessed: true };

    const state = { builds: [build], activeId: build.id };
    const decoded = decodeUrlState(encodeUrlState(state));

    expect(decoded).not.toBeNull();
    expect(decoded!.builds[0].params.observedAvgCatchTimeSec).toBe(73);
    expect(decoded!.builds[0].params.observedMissRate).toBe(0.15);
    expect(decoded!.builds[0].params.modifierAssumptions.includeModifiers).toBe(true);
  });
});

describe('decodeUrlState', () => {
  it('returns null for empty string', () => {
    expect(decodeUrlState('')).toBeNull();
  });

  it('returns null for a hash without the expected key', () => {
    expect(decodeUrlState('#foo=bar')).toBeNull();
  });

  it('returns null for invalid base64', () => {
    expect(decodeUrlState('#b=!!!notbase64!!!')).toBeNull();
  });

  it('returns null for a valid base64 but malformed payload', () => {
    const bad = Buffer.from(JSON.stringify({ v: 1 })).toString('base64url');
    expect(decodeUrlState(`#b=${bad}`)).toBeNull();
  });

  it('returns null for wrong version', () => {
    const build = createDefaultBuild();
    const payload = {
      v: 99,
      builds: [build],
      activeId: build.id,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    expect(decodeUrlState(`#b=${encoded}`)).toBeNull();
  });

  it('falls back to first build when activeId is missing from builds', () => {
    const build = createDefaultBuild();
    const payload = { v: 1, builds: [build], activeId: 'nonexistent-id' };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const decoded = decodeUrlState(`#b=${encoded}`);
    expect(decoded).not.toBeNull();
    expect(decoded!.activeId).toBe(build.id);
  });
});

describe('build management helpers', () => {
  const baseBuilds: BuildConfig[] = [
    { id: 'a', name: 'Build 1', params: getDefaultParams('coconut-bay') },
    { id: 'b', name: 'Build 2', params: getDefaultParams('open-sea') },
  ];

  it('renameBuild updates the name of the target build', () => {
    const result = renameBuild(baseBuilds, 'a', 'Renamed');
    expect(result.find((b) => b.id === 'a')!.name).toBe('Renamed');
    expect(result.find((b) => b.id === 'b')!.name).toBe('Build 2');
  });

  it('updateBuildParams updates params of the target build only', () => {
    const newParams = { ...getDefaultParams('coconut-bay'), observedAvgCatchTimeSec: 99 };
    const result = updateBuildParams(baseBuilds, 'a', newParams);
    expect(result.find((b) => b.id === 'a')!.params.observedAvgCatchTimeSec).toBe(99);
    expect(result.find((b) => b.id === 'b')!.params.observedAvgCatchTimeSec).toBe(
      getDefaultParams().observedAvgCatchTimeSec,
    );
  });

  it('removeBuild removes the target build', () => {
    const { builds } = removeBuild(baseBuilds, 'a', 'a');
    expect(builds.find((b) => b.id === 'a')).toBeUndefined();
    expect(builds).toHaveLength(1);
  });

  it('removeBuild selects a remaining build as nextActiveId when active is removed', () => {
    const { builds, nextActiveId } = removeBuild(baseBuilds, 'a', 'a');
    expect(nextActiveId).toBe(builds[0].id);
  });

  it('removeBuild keeps activeId unchanged when non-active build is removed', () => {
    const { nextActiveId } = removeBuild(baseBuilds, 'b', 'a');
    expect(nextActiveId).toBe('a');
  });

  it('duplicateBuild copies params and assigns a new id', () => {
    const src = baseBuilds[0];
    const dup = duplicateBuild(src, baseBuilds.length);
    expect(dup.id).not.toBe(src.id);
    expect(dup.params).toEqual(src.params);
    expect(dup.name).toContain(src.name);
  });

  it('createBuildFrom inherits params from reference', () => {
    const ref = baseBuilds[1];
    const newBuild = createBuildFrom(ref, baseBuilds.length);
    expect(newBuild.params.areaId).toBe(ref.params.areaId);
    expect(newBuild.id).not.toBe(ref.id);
  });
});
