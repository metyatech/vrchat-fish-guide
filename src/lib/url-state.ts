/**
 * URL hash-based state encoding/decoding for multi-build calculator state.
 *
 * Format: window.location.hash = "#b=<base64url>"
 * Payload (v1): { v: 1, builds: BuildConfig[], activeId: string }
 *
 * Validation strategy: any malformed/invalid payload is silently dropped and
 * the caller falls back to default state.  This ensures the page always loads.
 *
 * Use decodeUrlStateWithReason() when the caller needs to show in-product
 * feedback about why restore failed.
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

const VALID_TIME_OF_DAY = ['any', 'morning', 'day', 'evening', 'night'] as const;
const VALID_WEATHER_TYPES = ['any', 'clear', 'rainy', 'moonrain', 'stormy', 'foggy'] as const;

function validateParams(v: unknown): v is CalculatorParams {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    isString(o.areaId) &&
    VALID_TIME_OF_DAY.includes(o.timeOfDay as never) &&
    VALID_WEATHER_TYPES.includes(o.weatherType as never) &&
    validateLoadout(o.loadout) &&
    isFiniteNumber(o.baseBiteTimeSec) &&
    isFiniteNumber(o.baseMinigameTimeSec) &&
    isFiniteNumber(o.baseMissRate) &&
    isFiniteNumber(o.castTimeSec) &&
    isFiniteNumber(o.hookReactionTimeSec) &&
    isFiniteNumber(o.playerMistakeRate) &&
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
  return decodeUrlStateWithReason(hash).state;
}

/**
 * Result from decodeUrlStateWithReason.
 * `state` is null when restore failed or no share hash was present.
 * `failureReason` is set (non-empty string) only when a `b=` share param was
 * present but decoding/validation failed — not when the hash is simply absent.
 */
export interface UrlDecodeResult {
  state: UrlState | null;
  failureReason?: string;
}

/**
 * Parse a raw hash string into URL state, returning a diagnostic reason when
 * a share link was present but could not be restored.
 *
 * - If the `b` URL param is absent (checked via URLSearchParams.has, not
 *   substring): returns { state: null } (no error — just no share link).
 * - If `b=` is present but decoding/validation fails: returns { state: null,
 *   failureReason: "<human-readable reason>" }.
 * - On success: returns { state: UrlState }.
 */
export function decodeUrlStateWithReason(hash: string): UrlDecodeResult {
  if (!hash) {
    return { state: null };
  }

  try {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    if (!params.has(HASH_KEY)) {
      return { state: null };
    }
    const encoded = params.get(HASH_KEY);
    if (!encoded) {
      return { state: null, failureReason: '共有リンクの b= パラメータが空です。' };
    }

    let json: string;
    try {
      json = base64UrlDecode(encoded);
    } catch {
      return {
        state: null,
        failureReason: '共有リンクのデータをデコードできませんでした（不正な base64）。',
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return {
        state: null,
        failureReason: '共有リンクのデータを解析できませんでした（不正な JSON）。',
      };
    }

    if (!validatePayload(parsed)) {
      const o = parsed as Record<string, unknown>;
      if (o && typeof o === 'object' && o.v !== undefined && o.v !== PAYLOAD_VERSION) {
        return {
          state: null,
          failureReason: `共有リンクのバージョン (v${String(o.v)}) は非対応です。最新の URL を使用してください。`,
        };
      }
      return {
        state: null,
        failureReason:
          '共有リンクのビルド設定が不正または古い形式です。デフォルト設定を使用します。',
      };
    }

    // Ensure activeId refers to an existing build; fall back to first if not.
    const ids = parsed.builds.map((b) => b.id);
    const activeId = ids.includes(parsed.activeId) ? parsed.activeId : ids[0];
    return { state: { builds: parsed.builds, activeId } };
  } catch {
    return { state: null, failureReason: '共有リンクの読み込みに失敗しました。' };
  }
}

// ── Build management helpers ──────────────────────────────────────────────────

/** Generate a short random id (7 alphanumeric chars). */
export function generateBuildId(): string {
  return Math.random().toString(36).slice(2, 9);
}

/** Create a default first build. */
export function createDefaultBuild(areaId = 'best-area'): BuildConfig {
  return {
    id: generateBuildId(),
    name: '現在の装備',
    params: getDefaultParams(areaId),
  };
}

/** Create a new empty build inheriting area/conditions from a reference build. */
export function createBuildFrom(reference: BuildConfig, existingCount: number): BuildConfig {
  return {
    id: generateBuildId(),
    name: `比較 ${existingCount}`,
    params: { ...reference.params },
  };
}

/** Duplicate an existing build with a new id and a "(copy)" label suffix. */
export function duplicateBuild(build: BuildConfig): BuildConfig {
  return {
    id: generateBuildId(),
    name: `${build.name} のコピー`,
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
