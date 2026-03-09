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
import { WarningBanner } from '@/components/Calculator/WarningBanner';
import { Sidebar } from '@/components/Layout/Sidebar';
import { RARITY_LABELS, TIME_OF_DAY_LABELS, WEATHER_TYPE_LABELS } from '@/data/fish';
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

type CompareTarget = RankSlot | 'full-build';

const COMPARE_TARGET_LABELS: Record<CompareTarget, string> = {
  rod: 'Rod',
  line: 'Line',
  bobber: 'Bobber',
  enchant: 'Enchant',
  'full-build': '全部まとめて',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initState(): {
  builds: BuildConfig[];
  activeId: string;
  urlRestoreError?: string;
} {
  if (typeof window === 'undefined') {
    const first = createDefaultBuild('coconut-bay');
    return { builds: [first], activeId: first.id };
  }
  const hash = window.location.hash;
  const { state, failureReason } = decodeUrlStateWithReason(hash);
  if (state) return { ...state };
  const first = createDefaultBuild('coconut-bay');
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
    <div className="mx-auto max-w-7xl px-4 py-8">
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

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📊 装備込みの期待値比較</h1>
        <p className="mt-1 text-sm text-gray-500">
          いまの装備から何を変えると一番伸びるかを、1回ごと・1時間ごとの期待値で比べます。
        </p>
      </div>

      <section className="mb-6 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">まず何を比べたいですか？</h2>
        <p className="mb-4 text-sm text-gray-500">
          場所と現在の装備を入れたら、次は 1
          つだけ比べます。目的を選ぶと、次に試す候補を先に出します。
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(COMPARE_TARGET_LABELS) as CompareTarget[]).map((target) => (
            <button
              key={target}
              onClick={() => setCompareTarget(target)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                compareTarget === target
                  ? 'bg-ocean-600 text-white'
                  : 'border border-gray-200 bg-gray-50 text-gray-700 hover:border-ocean-300 hover:text-ocean-700'
              }`}
            >
              {COMPARE_TARGET_LABELS[target]}
            </button>
          ))}
        </div>

        <p className="mb-4 text-xs text-gray-500">
          ゲーム内の装備欄名です。Rod = 竿 / Line = ライン / Bobber = ウキ / Enchant = エンチャント
        </p>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-ocean-200 bg-ocean-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ocean-700">
              次にやること
            </div>
            {compareTarget === 'full-build' ? (
              <div className="mt-2 space-y-3 text-sm text-ocean-950">
                <p>
                  1 つずつではなく、全部まとめて比べたい状態です。下の
                  <strong>「全部まとめて比べる」</strong>{' '}
                  を見ると、全組み合わせから上位候補を出します。
                </p>
                <p className="text-xs text-ocean-900">
                  まずは左で場所・条件・現在の装備を入れてから、候補一覧を見てください。
                </p>
              </div>
            ) : bestNextTry ? (
              <div className="mt-2 space-y-3 text-sm text-ocean-950">
                <p>
                  いまの <strong>{COMPARE_TARGET_LABELS[compareTarget]}</strong>{' '}
                  を比べるなら、次に試す候補は <strong>{bestNextTry.bestEntry.item.nameEn}</strong>{' '}
                  です。
                </p>
                <div className="rounded-xl border border-white/60 bg-white/80 p-3 text-xs text-gray-700">
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
                    className="rounded-lg bg-ocean-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ocean-700"
                  >
                    この候補で比べる組み合わせを追加
                  </button>
                ) : (
                  <p className="text-xs text-ocean-900">
                    いまの装備がこの枠ではすでに最上位です。別の枠に切り替えて比較してください。
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ocean-950">
                まず左の入力で場所と現在の装備を入れてください。
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ocean-700">
              使い方
            </div>
            <ol className="space-y-2 text-sm leading-relaxed">
              <li>1. 左で場所と現在の装備を入れる</li>
              <li>2. 上で比べたい枠を 1 つ選ぶ</li>
              <li>3. おすすめ候補を比較一覧に追加する</li>
              <li>4. 下の一覧で期待値/時間を見る</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Build tabs */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">比べる組み合わせ</h2>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
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
        <p className="mt-2 text-xs text-gray-400">
          今の装備を基準に、1 か所だけ変えた組み合わせを増やして比べる使い方を想定しています。
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <Sidebar>
          <ParameterForm
            params={activeBuild.params}
            model={activeResult.model}
            onChange={handleParamsChange}
          />
        </Sidebar>

        <div className="flex-1 space-y-6">
          <WarningBanner warnings={activeResult.warnings} />

          <div className="rounded-xl border border-ocean-100 bg-ocean-50 px-4 py-3 text-xs text-ocean-900">
            <span className="font-semibold">見る順番:</span> まず
            <strong>期待値/時間</strong> を見て、次に <strong>期待値/回</strong> と
            <strong>魚が釣れる確率</strong> を確認してください。
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div
              className="rounded-xl border border-gray-200 bg-white p-4 text-center"
              data-testid="summary-expected-value-per-catch"
            >
              <div className="text-2xl font-bold text-ocean-700">
                {formatCurrency(activeResult.expectedValuePerCatch)}
              </div>
              <div className="mt-1 text-xs text-gray-500">期待値/回</div>
            </div>
            <div
              className="rounded-xl border border-gray-200 bg-white p-4 text-center"
              data-testid="summary-expected-value-per-hour"
            >
              <div className="text-2xl font-bold text-ocean-700">
                {formatCurrency(activeResult.expectedValuePerHour)}
              </div>
              <div className="mt-1 text-xs text-gray-500">期待値/時間</div>
            </div>
            <div
              className="rounded-xl border border-gray-200 bg-white p-4 text-center"
              data-testid="summary-catches-per-hour"
            >
              <div className="text-2xl font-bold text-gray-700">{catchesPerHour.toFixed(0)}回</div>
              <div className="mt-1 text-xs text-gray-500">試行回数/時間</div>
            </div>
            <div
              className="rounded-xl border border-gray-200 bg-white p-4 text-center"
              data-testid="summary-total-fish-probability"
            >
              <div className="text-2xl font-bold text-gray-700">
                {(activeResult.totalFishProbability * 100).toFixed(0)}%
              </div>
              <div className="mt-1 text-xs text-gray-500">魚が釣れる確率</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">期待値/回</div>
              1回投げたとき、平均するとどれくらい稼げるかです。
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">期待値/時間</div>
              周回効率を比べるときに一番見る数字です。実測値を使うと、よりプレイ感に近づきます。
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">試行回数/時間</div>
              1回にかかる時間から逆算した、1 時間に何回投げられるかです。
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">魚が釣れる確率</div>
              逃がす割合を引いた値です。Double Up!! のような追加効果はこの数字には入りません。
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
              対象魚種: {activeResult.fishResults.length}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
              価格レンジ未取得: {activeResult.missingPriceFish.length}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
              時間帯: {TIME_OF_DAY_LABELS[activeResult.params.timeOfDay]}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
              天気: {WEATHER_TYPE_LABELS[activeResult.params.weatherType]}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
              時間の計算方法:{' '}
              {activeResult.params.timeModelMode === 'observed' ? '実測値' : '装備から見積もる'}
            </div>
          </div>

          {/* Multi-build comparison — shown only when there are 2+ builds */}
          <ComparisonSummary
            builds={builds}
            results={results}
            activeId={activeId}
            onSelect={setActiveId}
          />

          {/* Per-slot ranking */}
          <RankingView
            key={`ranking-${compareTarget}`}
            baseParams={activeBuild.params}
            focusSlot={compareTarget === 'full-build' ? 'rod' : compareTarget}
            initialExpanded={compareTarget !== 'full-build'}
            onPickItem={handleCreateSlotComparison}
          />

          {/* Full-build optimizer */}
          <OptimizerView
            key={`optimizer-${compareTarget}`}
            baseParams={activeBuild.params}
            initialExpanded={compareTarget === 'full-build'}
            onPickBuild={handleCreateOptimizedBuild}
          />

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">確率・期待値グラフ</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setChartMode('per-catch')}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    chartMode === 'per-catch'
                      ? 'bg-ocean-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  1回あたり
                </button>
                <button
                  onClick={() => setChartMode('per-hour')}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    chartMode === 'per-hour'
                      ? 'bg-ocean-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-800">魚種別詳細</h2>
            <ResultTable result={activeResult} />
            <p className="mt-4 text-xs leading-relaxed text-gray-500">
              表では、各魚の `条件`, `売値レンジ`, `重量レンジ`, `釣獲率`, `期待値/回`,
              `期待値/時間` を確認できます。どの魚が全体期待値を押し上げているかを見るための欄です。
            </p>
          </div>

          <details className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-xs leading-relaxed text-gray-600">
            <summary className="cursor-pointer list-none font-semibold text-gray-700">
              📝 この数字の出し方を見る
            </summary>
            <ul className="mt-3 space-y-1.5">
              <li>
                • <strong>対象魚の絞り込み</strong>:
                場所ごとの魚一覧と、時間帯・天気の条件タグを使います。
              </li>
              <li>
                • <strong>装備のステータス</strong>: 公開されている Rod / Line / Bobber / Enchant
                の値を合計します。
              </li>
              <li>
                • <strong>レア度の出やすさ</strong>: 公開 rarity table
                を基準に、同じレア度の中では等分配します。
              </li>
              <li>
                • <strong>Luck の扱い</strong>:{' '}
                {activeResult.model.effectiveLuckMultiplier.toFixed(2)}x
                の補正として入れています。ここはまだ正確式が分かっていないため推定です。
              </li>
              <li>
                • <strong>Big Catch / Max Weight の扱い</strong>:{' '}
                {(activeResult.model.weightPercentile * 100).toFixed(0)}%
                ぶん重さを上に寄せる推定で入れています。
              </li>
              <li>
                • <strong>見た目・サイズ補正</strong>:{' '}
                {activeResult.params.modifierAssumptions.includeModifiers
                  ? `${activeResult.model.modifierEvFactor.toFixed(3)}x の補正を入れています。ここも推定です。`
                  : '現在は入れていません。左の「詳細調整」でオンにできます。'}
              </li>
              <li>
                • <strong>期待値/回</strong>: 各魚の確率 × 推定売値 × 直接効果
                {activeResult.params.modifierAssumptions.includeModifiers
                  ? ' × 見た目・サイズ補正'
                  : ''}
                です。
              </li>
              <li>
                • <strong>期待値/時間</strong>: 期待値/回 × (3600 ÷ 1回にかかる時間) です。
              </li>
              <li>
                • <strong>いま使っているレア度の重み</strong>:{' '}
                {Object.entries(activeResult.effectiveRarityWeights)
                  .map(
                    ([rarity, weight]) =>
                      `${RARITY_LABELS[rarity as Rarity]} ${weight?.toFixed(2)}`,
                  )
                  .join(', ') || 'なし'}
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}

export default CalculatorPageClient;
