/**
 * URL hash-based state encoding/decoding for multi-build calculator state.
 *
 * Format: window.location.hash = "#b=<base64url>"
 * Payload (v1): { v: 1, builds: BuildConfig[], activeId: string }
 *
 * Validation strategy: any malformed/invalid payload is silently dropped and
 * the caller falls back to default state.  This ensures the page always loads.
 */

import { BuildConfig, CalculatorParams, EquipmentLoadout, ModifierAssumptions } from '@/types';
import { getDefaultParams } from '@/lib/calculator';

const HASH_KEY = 'b';
const PAYLOAD_VERSION = 1;

interface UrlPayloadV1 {
  v: 1;
  builds: BuildConfig[];
  activeId: string;
}

export interface UrlState {
  builds: BuildConfig[];
  activeId: string;
}

// ── Validation helpers ────────────────────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function validateLoadout(v: unknown): v is EquipmentLoadout {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return isString(o.rodId) && isString(o.lineId) && isString(o.bobberId) && isString(o.enchantId);
}

function validateModifierAssumptions(v: unknown): v is ModifierAssumptions {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return isBoolean(o.includeModifiers) && isBoolean(o.assumeCursedToBlessed);
}

const VALID_TIME_MODEL_MODES = ['observed', 'estimated'] as const;
const VALID_TIME_OF_DAY = ['any', 'morning', 'day', 'evening', 'night'] as const;
const VALID_WEATHER_TYPES = ['any', 'clear', 'rainy', 'moonrain', 'stormy', 'foggy'] as const;

function validateParams(v: unknown): v is CalculatorParams {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    isString(o.areaId) &&
    VALID_TIME_OF_DAY.includes(o.timeOfDay as never) &&
    VALID_WEATHER_TYPES.includes(o.weatherType as never) &&
    VALID_TIME_MODEL_MODES.includes(o.timeModelMode as never) &&
    validateLoadout(o.loadout) &&
    isFiniteNumber(o.observedAvgCatchTimeSec) &&
    isFiniteNumber(o.observedMissRate) &&
    isFiniteNumber(o.baseBiteTimeSec) &&
    isFiniteNumber(o.baseMinigameTimeSec) &&
    isFiniteNumber(o.baseMissRate) &&
    validateModifierAssumptions(o.modifierAssumptions)
  );
}

function validateBuildConfig(v: unknown): v is BuildConfig {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return isString(o.id) && o.id.length > 0 && isString(o.name) && validateParams(o.params);
}

function validatePayload(v: unknown): v is UrlPayloadV1 {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (o.v !== PAYLOAD_VERSION) return false;
  if (!Array.isArray(o.builds) || o.builds.length === 0) return false;
  if (!isString(o.activeId) || o.activeId.length === 0) return false;
  return o.builds.every(validateBuildConfig);
}

// ── Encode / Decode ───────────────────────────────────────────────────────────

function base64UrlEncode(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  return Buffer.from(str, 'utf8').toString('base64url');
}

function base64UrlDecode(str: string): string {
  // Restore standard base64 padding and chars
  let padded = str.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4 !== 0) padded += '=';
  if (typeof atob !== 'undefined') {
    return decodeURIComponent(escape(atob(padded)));
  }
  return Buffer.from(padded, 'base64').toString('utf8');
}

/** Serialise state to a hash string (include the leading '#'). */
export function encodeUrlState(state: UrlState): string {
  const payload: UrlPayloadV1 = {
    v: PAYLOAD_VERSION,
    builds: state.builds,
    activeId: state.activeId,
  };
  try {
    const encoded = base64UrlEncode(JSON.stringify(payload));
    return `#${HASH_KEY}=${encoded}`;
  } catch {
    return '';
  }
}

/**
 * Parse a raw hash string (e.g. from `window.location.hash`) into URL state.
 * Returns null when the hash is absent or invalid — caller should use defaults.
 */
export function decodeUrlState(hash: string): UrlState | null {
  try {
    if (!hash || !hash.includes(`${HASH_KEY}=`)) return null;
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const encoded = params.get(HASH_KEY);
    if (!encoded) return null;
    const json = base64UrlDecode(encoded);
    const parsed: unknown = JSON.parse(json);
    if (!validatePayload(parsed)) return null;
    // Ensure activeId refers to an existing build; fall back to first if not.
    const ids = parsed.builds.map((b) => b.id);
    const activeId = ids.includes(parsed.activeId) ? parsed.activeId : ids[0];
    return { builds: parsed.builds, activeId };
  } catch {
    return null;
  }
}

// ── Build management helpers ──────────────────────────────────────────────────

/** Generate a short random id (7 alphanumeric chars). */
export function generateBuildId(): string {
  return Math.random().toString(36).slice(2, 9);
}

/** Create a default first build. */
export function createDefaultBuild(areaId = 'coconut-bay'): BuildConfig {
  return {
    id: generateBuildId(),
    name: 'Build 1',
    params: getDefaultParams(areaId),
  };
}

/** Create a new empty build inheriting area/conditions from a reference build. */
export function createBuildFrom(reference: BuildConfig, existingCount: number): BuildConfig {
  return {
    id: generateBuildId(),
    name: `Build ${existingCount + 1}`,
    params: { ...reference.params },
  };
}

/** Duplicate an existing build with a new id and incremented label. */
export function duplicateBuild(build: BuildConfig, existingCount: number): BuildConfig {
  return {
    id: generateBuildId(),
    name: `${build.name} (copy)`,
    params: { ...build.params },
  };
}

/** Rename a build in the list; returns a new array. */
export function renameBuild(builds: BuildConfig[], id: string, name: string): BuildConfig[] {
  return builds.map((b) => (b.id === id ? { ...b, name } : b));
}

/** Update params for a build; returns a new array. */
export function updateBuildParams(
  builds: BuildConfig[],
  id: string,
  params: CalculatorParams,
): BuildConfig[] {
  return builds.map((b) => (b.id === id ? { ...b, params } : b));
}

/** Remove a build by id; returns { builds, nextActiveId }. */
export function removeBuild(
  builds: BuildConfig[],
  id: string,
  activeId: string,
): { builds: BuildConfig[]; nextActiveId: string } {
  const filtered = builds.filter((b) => b.id !== id);
  // If the active build was removed, select the nearest remaining build
  const nextActiveId =
    filtered.find((b) => b.id === activeId)?.id ?? filtered[filtered.length - 1]?.id ?? '';
  return { builds: filtered, nextActiveId };
}
