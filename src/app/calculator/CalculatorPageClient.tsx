'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AdSlot } from '@/components/AdSlot';
import { BuildTabs } from '@/components/Calculator/BuildTabs';
import { ComparisonSummary } from '@/components/Calculator/ComparisonSummary';
import { DistributionChart } from '@/components/Calculator/DistributionChart';
import { OptimizerView } from '@/components/Calculator/OptimizerView';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { RankingView } from '@/components/Calculator/RankingView';
import { ResultTable } from '@/components/Calculator/ResultTable';
import { CompareTarget, SLOT_THEME } from '@/components/Calculator/slotTheme';
import { WarningBanner } from '@/components/Calculator/WarningBanner';
import { AREA_MAP, RARITY_LABELS, TIME_OF_DAY_LABELS, WEATHER_TYPE_LABELS } from '@/data/fish';
import { calculateDistribution, formatCurrency, getDefaultParams } from '@/lib/calculator';
import { rankAllSlots, RankSlot } from '@/lib/ranking';
import {
  createBuildFrom,
  createDefaultBuild,
  decodeUrlStateWithReason,
  duplicateBuild,
  encodeUrlState,
  removeBuild,
  renameBuild,
  updateBuildParams,
} from '@/lib/url-state';
import { BuildConfig, CalculatorParams, DistributionResult, Rarity } from '@/types';

const COMPARE_TARGET_LABELS: Record<CompareTarget, string> = {
  rod: 'Rod',
  line: 'Line',
  bobber: 'Bobber',
  enchant: 'Enchant',
  'full-build': '全部まとめて',
};

function formatSelectedTimeLabel(value: CalculatorParams['timeOfDay']): string {
  return value === 'any' ? '平均で見る' : TIME_OF_DAY_LABELS[value];
}

function formatSelectedWeatherLabel(value: CalculatorParams['weatherType']): string {
  return value === 'any' ? '平均で見る' : WEATHER_TYPE_LABELS[value];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initState(): {
  builds: BuildConfig[];
  activeId: string;
  urlRestoreError?: string;
} {
  if (typeof window === 'undefined') {
    const first = createDefaultBuild();
    return { builds: [first], activeId: first.id };
  }
  const hash = window.location.hash;
  const { state, failureReason } = decodeUrlStateWithReason(hash);
  if (state) return { ...state };
  const first = createDefaultBuild();
  return { builds: [first], activeId: first.id, urlRestoreError: failureReason };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalculatorPageClient() {
  // initState() must only be called ONCE — two separate lazy initialisers would each call
  // generateBuildId(), producing mismatched ids between builds and activeId.
  const [{ builds: initialBuilds, activeId: initialActiveId, urlRestoreError: initialUrlError }] =
    useState(initState);
  const [builds, setBuilds] = useState(initialBuilds);
  const [activeId, setActiveId] = useState(initialActiveId);
  const [chartMode, setChartMode] = useState<'per-catch' | 'per-hour'>('per-hour');
  const [urlRestoreError, setUrlRestoreError] = useState<string | undefined>(initialUrlError);
  const [compareTarget, setCompareTarget] = useState<CompareTarget>('rod');
  const [notesOpen, setNotesOpen] = useState(false);

  // Sync URL hash whenever builds/activeId change
  useEffect(() => {
    const hash = encodeUrlState({ builds, activeId });
    if (hash) {
      window.history.replaceState(null, '', hash);
    }
  }, [builds, activeId]);

  // On mount, restore from hash (handles direct navigation with a share URL).
  // We already seeded state from initState(), so this is a no-op if the hash
  // was already applied in SSR — but it also handles browser back/forward.
  useEffect(() => {
    function onHashChange() {
      const { state: restored, failureReason } = decodeUrlStateWithReason(window.location.hash);
      if (restored) {
        setBuilds(restored.builds);
        setActiveId(restored.activeId);
        setUrlRestoreError(undefined);
      } else if (failureReason) {
        // A share hash was present but could not be decoded — show feedback.
        setUrlRestoreError(failureReason);
      } else {
        // No b= param — navigated away from a share URL; clear any stale error.
        setUrlRestoreError(undefined);
      }
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // ── Build operations ───────────────────────────────────────────────────────

  const activeBuild = builds.find((b) => b.id === activeId) ?? builds[0];

  const handleParamsChange = useCallback(
    (params: CalculatorParams) => {
      setBuilds((prev) => updateBuildParams(prev, activeId, params));
    },
    [activeId],
  );

  const handleAddBuild = useCallback(() => {
    const ref = builds.find((b) => b.id === activeId) ?? builds[0];
    const newBuild = createBuildFrom(ref, builds.length);
    setBuilds((prev) => [...prev, newBuild]);
    setActiveId(newBuild.id);
  }, [builds, activeId]);

  const handleDuplicateBuild = useCallback(
    (id: string) => {
      const src = builds.find((b) => b.id === id);
      if (!src) return;
      const dup = duplicateBuild(src);
      setBuilds((prev) => {
        const idx = prev.findIndex((b) => b.id === id);
        const next = [...prev];
        next.splice(idx + 1, 0, dup);
        return next;
      });
      setActiveId(dup.id);
    },
    [builds],
  );

  const handleRemoveBuild = useCallback(
    (id: string) => {
      const { builds: next, nextActiveId } = removeBuild(builds, id, activeId);
      setBuilds(next);
      setActiveId(nextActiveId);
    },
    [builds, activeId],
  );

  const handleRenameBuild = useCallback((id: string, name: string) => {
    setBuilds((prev) => renameBuild(prev, id, name));
  }, []);

  const handleCreateSlotComparison = useCallback(
    (slot: RankSlot, itemId: string, itemName: string) => {
      if (!activeBuild) return;

      const currentItemId =
        slot === 'rod'
          ? activeBuild.params.loadout.rodId
          : slot === 'line'
            ? activeBuild.params.loadout.lineId
            : slot === 'bobber'
              ? activeBuild.params.loadout.bobberId
              : activeBuild.params.loadout.enchantId;

      if (itemId === currentItemId) return;

      const nextBuild = createBuildFrom(activeBuild, builds.length);
      nextBuild.name = `${itemName} を試す`;
      nextBuild.params = {
        ...nextBuild.params,
        loadout: {
          ...nextBuild.params.loadout,
          [`${slot}Id`]: itemId,
        },
      };

      setBuilds((prev) => [...prev, nextBuild]);
      setActiveId(nextBuild.id);
    },
    [activeBuild, builds.length],
  );

  const handleCreateRecommendationBuild = useCallback(() => {
    if (!activeBuild || compareTarget === 'full-build') return;
    const rankedBySlot = rankAllSlots(activeBuild.params);
    const bestEntry = rankedBySlot[compareTarget][0];
    if (!bestEntry) return;

    const currentItemId =
      compareTarget === 'rod'
        ? activeBuild.params.loadout.rodId
        : compareTarget === 'line'
          ? activeBuild.params.loadout.lineId
          : compareTarget === 'bobber'
            ? activeBuild.params.loadout.bobberId
            : activeBuild.params.loadout.enchantId;

    if (bestEntry.item.id === currentItemId) return;

    handleCreateSlotComparison(compareTarget, bestEntry.item.id, bestEntry.item.nameEn);
  }, [activeBuild, compareTarget, handleCreateSlotComparison]);

  const handleCreateOptimizedBuild = useCallback(
    (
      entry: {
        loadout: { rodId: string; lineId: string; bobberId: string; enchantId: string };
      },
      rank: number,
    ) => {
      if (!activeBuild) return;
      const nextBuild = createBuildFrom(activeBuild, builds.length);
      nextBuild.name = rank === 0 ? '全部比較のおすすめ' : `全部比較 ${rank + 1}`;
      nextBuild.params = {
        ...nextBuild.params,
        loadout: {
          ...nextBuild.params.loadout,
          ...entry.loadout,
        },
      };

      setBuilds((prev) => [...prev, nextBuild]);
      setActiveId(nextBuild.id);
    },
    [activeBuild, builds.length],
  );

  // ── Calculations ───────────────────────────────────────────────────────────

  const results: DistributionResult[] = useMemo(
    () => builds.map((b) => calculateDistribution(b.params)),
    [builds],
  );

  const activeResult = results[builds.findIndex((b) => b.id === activeId)] ?? results[0];
  const catchesPerHour = 3600 / Math.max(1, activeResult.model.effectiveAvgCatchTimeSec);
  const rankedBySlot = useMemo(() => rankAllSlots(activeBuild.params), [activeBuild.params]);

  const bestNextTry = useMemo(() => {
    if (compareTarget === 'full-build') return null;

    const entries = rankedBySlot[compareTarget];
    const bestEntry = entries[0];
    const currentItemId =
      compareTarget === 'rod'
        ? activeBuild.params.loadout.rodId
        : compareTarget === 'line'
          ? activeBuild.params.loadout.lineId
          : compareTarget === 'bobber'
            ? activeBuild.params.loadout.bobberId
            : activeBuild.params.loadout.enchantId;
    const currentEntry = entries.find((entry) => entry.item.id === currentItemId);

    if (!bestEntry || !currentEntry) return null;

    return {
      bestEntry,
      currentEntry,
      alreadyBest: bestEntry.item.id === currentEntry.item.id,
      upliftPct:
        currentEntry.expectedValuePerHour > 0
          ? ((bestEntry.expectedValuePerHour - currentEntry.expectedValuePerHour) /
              currentEntry.expectedValuePerHour) *
            100
          : 0,
    };
  }, [activeBuild.params, compareTarget, rankedBySlot]);

  // Key that changes when result values change meaningfully — drives the CSS update animation.
  const resultAnimKey = `${Math.round(activeResult.expectedValuePerHour)}-${Math.round(activeResult.expectedValuePerCatch)}-${activeResult.fishResults.length}`;

  const compareTargetTheme = SLOT_THEME[compareTarget];
  const compareTargetActionLabel =
    compareTarget === 'full-build'
      ? '全部まとめて入れ替える'
      : `${COMPARE_TARGET_LABELS[compareTarget]} を変える`;

  const hasComparisons = builds.length > 1;

  // ── Share URL ──────────────────────────────────────────────────────────────

  const [copied, setCopied] = useState(false);
  const handleCopyLink = useCallback(() => {
    const hash = encodeUrlState({ builds, activeId });
    const url = window.location.origin + window.location.pathname + hash;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [builds, activeId]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!activeBuild) return null;

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden"
      >
        <div className="absolute left-[-5%] top-10 h-56 w-56 rounded-full bg-ocean-200/40 blur-3xl" />
        <div className="absolute right-[5%] top-0 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="absolute left-[35%] top-32 h-48 w-48 rounded-full bg-white/60 blur-3xl" />
      </div>
      {/* URL restore failure banner — shown only when a share link was present but invalid */}
      {urlRestoreError && (
        <div
          role="alert"
          data-testid="url-restore-error"
          className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <div>
            <span className="font-semibold">共有リンクの復元に失敗しました。</span>{' '}
            {urlRestoreError} デフォルト設定を使用しています。
          </div>
          <button
            onClick={() => setUrlRestoreError(undefined)}
            className="shrink-0 rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-100"
            aria-label="エラーバナーを閉じる"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mb-8">
        <div className="overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top_left,_rgba(147,209,252,0.34),_rgba(37,120,232,0.98)_36%,_rgba(12,74,153,1)_100%)] px-6 py-6 text-white shadow-[0_28px_90px_rgba(37,120,232,0.28)] ring-1 ring-white/20">
          <h1 className="text-2xl font-bold tracking-tight">📊 装備込みの期待値比較</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ocean-100">
            装備と条件を入れると、期待値/時間で装備差を並べて比べられます。
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <ParameterForm
          params={activeBuild.params}
          model={activeResult.model}
          onChange={handleParamsChange}
        />

        <section className="rounded-[30px] border border-white/80 bg-white/82 p-6 shadow-[0_24px_72px_rgba(15,23,42,0.10)] backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">比べる部位を選ぶ</h2>
            <p className="mt-1 text-sm text-gray-500">1 か所ずつ切り替えると差が見えやすいです。</p>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(COMPARE_TARGET_LABELS) as CompareTarget[]).map((target) => (
              <button
                key={target}
                onClick={() => setCompareTarget(target)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                  compareTarget === target
                    ? SLOT_THEME[target].buttonActiveClassName
                    : SLOT_THEME[target].buttonIdleClassName
                }`}
              >
                {target === 'full-build'
                  ? '全部まとめて入れ替える'
                  : `${COMPARE_TARGET_LABELS[target]} を変える`}
              </button>
            ))}
          </div>

          <div
            className={`rounded-2xl border p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${compareTargetTheme.panelClassName}`}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">
              選択中の部位
            </div>
            <p className="mt-2 text-sm text-gray-900">
              <strong>{compareTargetActionLabel}</strong>{' '}
              を切り替えます。候補を選んで比較に追加します。
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-[30px] border border-white/80 bg-white/82 p-6 shadow-[0_24px_72px_rgba(15,23,42,0.10)] backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {compareTarget === 'full-build'
                ? '装備一式の候補を追加'
                : `${COMPARE_TARGET_LABELS[compareTarget]} の候補を追加`}
            </h2>
            <p className="mt-1 text-sm text-gray-500">1 件追加すると、下の比較に並びます。</p>
          </div>

          {compareTarget !== 'full-build' && bestNextTry ? (
            <div
              className={`rounded-2xl border p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${compareTargetTheme.panelClassName}`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                おすすめ候補
              </div>
              <div className="mt-2 rounded-xl border border-white/60 bg-white/80 p-3 text-sm text-gray-700">
                現在: <strong>{bestNextTry.currentEntry.item.nameEn}</strong>
                <br />
                候補: <strong>{bestNextTry.bestEntry.item.nameEn}</strong>
                <br />
                期待値/時間:{' '}
                <strong>{formatCurrency(bestNextTry.currentEntry.expectedValuePerHour)}</strong>
                {' → '}
                <strong>{formatCurrency(bestNextTry.bestEntry.expectedValuePerHour)}</strong>
                {!bestNextTry.alreadyBest ? (
                  <>
                    <br />
                    伸び幅: <strong>{bestNextTry.upliftPct.toFixed(1)}%</strong>
                  </>
                ) : null}
              </div>
              {!bestNextTry.alreadyBest ? (
                <button
                  onClick={handleCreateRecommendationBuild}
                  className={`mt-3 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${compareTargetTheme.buttonActiveClassName}`}
                >
                  この候補を比較に追加
                </button>
              ) : (
                <p className="mt-3 text-xs text-gray-700">
                  いまの装備がこの欄では一番良い状態です。別の欄を選ぶと、次に試す候補が出ます。
                </p>
              )}
            </div>
          ) : null}

          {compareTarget !== 'full-build' ? (
            <RankingView
              key={`ranking-${compareTarget}`}
              baseParams={activeBuild.params}
              focusSlot={compareTarget}
              initialExpanded={true}
              alwaysOpen={true}
              onPickItem={handleCreateSlotComparison}
            />
          ) : (
            <OptimizerView
              key="optimizer-full-build"
              baseParams={activeBuild.params}
              initialExpanded={true}
              alwaysOpen={true}
              onPickBuild={handleCreateOptimizedBuild}
            />
          )}
        </section>

        <section className="space-y-4 rounded-[30px] border border-white/80 bg-white/82 p-6 shadow-[0_24px_72px_rgba(15,23,42,0.10)] backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">比較一覧</h2>
              <p className="mt-1 text-sm text-gray-500">追加した候補がここに並びます。</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm transition-all duration-150 hover:border-ocean-300 hover:shadow-md hover:text-ocean-700"
              title="今の比較内容を URL で共有"
            >
              {copied ? '✓ コピー済み' : '🔗 この比較を URL で共有'}
            </button>
          </div>

          <BuildTabs
            builds={builds}
            activeId={activeId}
            onSelect={setActiveId}
            onAdd={handleAddBuild}
            onDuplicate={handleDuplicateBuild}
            onRemove={handleRemoveBuild}
            onRename={handleRenameBuild}
          />

          {!hasComparisons ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              まだ比較する候補がありません。上の候補から 1 件追加すると、ここに比較結果が出ます。
            </div>
          ) : (
            <ComparisonSummary
              builds={builds}
              results={results}
              activeId={activeId}
              onSelect={setActiveId}
            />
          )}
        </section>

        <section className="space-y-6" data-testid="result-summary-section">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">結果サマリー</h2>
            <p className="mt-1 text-sm text-gray-500">
              主要指標は <strong>期待値/時間</strong> です。
            </p>
          </div>

          <WarningBanner
            warnings={activeResult.warnings.map((warning) =>
              warning.replaceAll('Time of Day', '時間帯').replaceAll('Weather', '天気'),
            )}
          />

          <div
            key={resultAnimKey}
            className="animate-flash-update grid grid-cols-2 gap-3 md:grid-cols-4"
          >
            <div
              className="rounded-2xl border border-ocean-200/80 bg-[linear-gradient(145deg,rgba(239,248,255,0.95),rgba(255,255,255,1))] p-4 text-center shadow-[0_16px_40px_rgba(37,120,232,0.10)]"
              data-testid="summary-expected-value-per-catch"
            >
              <div className="text-2xl font-bold text-ocean-700">
                {formatCurrency(activeResult.expectedValuePerCatch)}
              </div>
              <div className="mt-1.5 text-xs font-medium text-ocean-500">期待値/回</div>
            </div>
            <div
              className="rounded-2xl border-2 border-ocean-400 bg-[linear-gradient(145deg,rgba(219,238,254,0.95),rgba(239,248,255,0.96))] p-4 text-center shadow-[0_18px_48px_rgba(37,120,232,0.20)]"
              data-testid="summary-expected-value-per-hour"
            >
              <div className="text-3xl font-bold text-ocean-700">
                {formatCurrency(activeResult.expectedValuePerHour)}
              </div>
              <div className="mt-1.5 text-xs font-semibold text-ocean-600">期待値/時間</div>
            </div>
            <div
              className="rounded-2xl border border-white/80 bg-[linear-gradient(145deg,rgba(249,250,251,0.92),rgba(255,255,255,1))] p-4 text-center shadow-[0_14px_36px_rgba(15,23,42,0.08)]"
              data-testid="summary-catches-per-hour"
            >
              <div className="text-2xl font-bold text-gray-700">{catchesPerHour.toFixed(0)}回</div>
              <div className="mt-1.5 text-xs font-medium text-gray-500">試行回数/時間</div>
            </div>
            <div
              className="rounded-2xl border border-white/80 bg-[linear-gradient(145deg,rgba(249,250,251,0.92),rgba(255,255,255,1))] p-4 text-center shadow-[0_14px_36px_rgba(15,23,42,0.08)]"
              data-testid="summary-total-fish-probability"
            >
              <div className="text-2xl font-bold text-gray-700">
                {(activeResult.totalFishProbability * 100).toFixed(0)}%
              </div>
              <div className="mt-1.5 text-xs font-medium text-gray-500">魚が釣れる確率</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">期待値/回</div>
              {'1回あたりの平均収益です。'}
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">期待値/時間</div>
              周回効率の比較に使う指標です。
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">試行回数/時間</div>
              {'1時間に投げられる回数です。'}
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">魚が釣れる確率</div>
              逃がしを差し引いた確率です。
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">確率・期待値グラフ</h2>
              <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  onClick={() => setChartMode('per-catch')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-150 ${
                    chartMode === 'per-catch'
                      ? 'bg-white text-ocean-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  1回あたり
                </button>
                <button
                  onClick={() => setChartMode('per-hour')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-150 ${
                    chartMode === 'per-hour'
                      ? 'bg-white text-ocean-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  1時間あたり
                </button>
              </div>
            </div>
            <DistributionChart result={activeResult} mode={chartMode} />
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              `1回あたり` は1投ごとの寄与、`1時間あたり` は1回にかかる時間を反映した時給寄与です。
              見たい軸に合わせて切り替えてください。
            </p>
          </div>

          <div className="flex justify-center">
            <AdSlot position="in-content" size="leaderboard" showPlaceholder={false} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">魚種別詳細</h2>
            <ResultTable result={activeResult} />
            <p className="mt-4 text-xs leading-relaxed text-gray-500">
              各魚の条件や売値レンジ、釣獲率、期待値を確認できます。
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-xs leading-relaxed text-gray-600">
            <button
              type="button"
              onClick={() => setNotesOpen((current) => !current)}
              aria-expanded={notesOpen}
              aria-controls="calculation-notes-panel"
              className="flex w-full items-center justify-between gap-3 text-left font-semibold text-gray-700"
            >
              <span>📝 この計算について</span>
              <span className="text-xs text-gray-500">{notesOpen ? '閉じる' : '開く'}</span>
            </button>
            <div
              id="calculation-notes-panel"
              data-testid="calculation-notes-panel"
              aria-hidden={!notesOpen}
              className="mt-3 grid transition-[grid-template-rows,opacity] duration-300 ease-out"
              style={{
                gridTemplateRows: notesOpen ? '1fr' : '0fr',
                opacity: notesOpen ? 1 : 0,
              }}
            >
              <div className="overflow-hidden">
                <ul className="space-y-1.5">
                  <li>
                    • <strong>いま見ている条件</strong>: 釣り場{' '}
                    {AREA_MAP[activeResult.model.autoSelectedAreaId ?? activeResult.params.areaId]
                      ?.nameEn ?? '—'}
                    、時間帯 {formatSelectedTimeLabel(activeResult.params.timeOfDay)}、天気{' '}
                    {formatSelectedWeatherLabel(activeResult.params.weatherType)}
                  </li>
                  <li>
                    • <strong>計算に入っている魚</strong>: {activeResult.fishResults.length} 種{' '}
                    {activeResult.missingPriceFish.length > 0
                      ? `(価格情報が未取得の魚 ${activeResult.missingPriceFish.length} 種を除く)`
                      : ''}
                  </li>
                  <li>
                    • <strong>どの魚が釣れるか</strong>:
                    各釣り場の魚リストから、時間帯と天気の条件に合う魚を選んでいます。
                  </li>
                  <li>
                    • <strong>装備の効果</strong>: 選んだ Rod / Line / Bobber / Enchant
                    のステータスを合算しています。
                  </li>
                  <li>
                    • <strong>レア度の影響</strong>:
                    公開されているレア度テーブルを基準に、同じレア度の魚は同じ確率で出るように計算しています。
                  </li>
                  <li>
                    • <strong>Luck の効果</strong>:{' '}
                    {activeResult.model.effectiveLuckMultiplier.toFixed(2)}x
                    の補正として反映しています。(※内部計算式は未公開のため推定値)
                  </li>
                  <li>
                    • <strong>Big Catch / Max Weight の効果</strong>: 魚の重さを上位{' '}
                    {(activeResult.model.weightPercentile * 100).toFixed(0)}%
                    の範囲に寄せる形で反映しています。(※推定式)
                  </li>
                  <li>
                    • <strong>見た目・サイズボーナス</strong>:{' '}
                    {activeResult.params.modifierAssumptions.includeModifiers
                      ? `約 ${activeResult.model.modifierEvFactor.toFixed(3)}x のボーナスとして計算に入れています。(※コミュニティ観測値に基づく推定)`
                      : '現在はオフです。左の「詳細設定」からオンにできます。'}
                  </li>
                  <li>
                    • <strong>期待値/回</strong>: 各魚の釣れる確率 × 推定売値
                    {activeResult.params.modifierAssumptions.includeModifiers
                      ? ' × 見た目・サイズボーナス'
                      : ''}
                    を全魚種で合計した値です。
                  </li>
                  <li>
                    • <strong>期待値/時間</strong>: 期待値/回 × (1時間 ÷ 1回の所要時間)
                    で計算しています。
                  </li>
                  <li>
                    • <strong>使用中のレア度重み</strong>:{' '}
                    {Object.entries(activeResult.effectiveRarityWeights)
                      .map(
                        ([rarity, weight]) =>
                          `${RARITY_LABELS[rarity as Rarity]} ${weight?.toFixed(2)}`,
                      )
                      .join(', ') || 'なし'}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CalculatorPageClient;
