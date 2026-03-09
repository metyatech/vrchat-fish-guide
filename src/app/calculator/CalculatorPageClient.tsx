'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AdSlot } from '@/components/AdSlot';
import { BuildTabs } from '@/components/Calculator/BuildTabs';
import { ComparisonSummary } from '@/components/Calculator/ComparisonSummary';
import { DistributionChart } from '@/components/Calculator/DistributionChart';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { RankingView } from '@/components/Calculator/RankingView';
import { ResultTable } from '@/components/Calculator/ResultTable';
import { WarningBanner } from '@/components/Calculator/WarningBanner';
import { Sidebar } from '@/components/Layout/Sidebar';
import { RARITY_LABELS, TIME_OF_DAY_LABELS, WEATHER_TYPE_LABELS } from '@/data/fish';
import { calculateDistribution, formatCurrency, getDefaultParams } from '@/lib/calculator';
import {
  createBuildFrom,
  createDefaultBuild,
  decodeUrlState,
  duplicateBuild,
  encodeUrlState,
  removeBuild,
  renameBuild,
  updateBuildParams,
} from '@/lib/url-state';
import { BuildConfig, CalculatorParams, DistributionResult, Rarity } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function readHashState(): { builds: BuildConfig[]; activeId: string } | null {
  if (typeof window === 'undefined') return null;
  return decodeUrlState(window.location.hash);
}

function initState(): { builds: BuildConfig[]; activeId: string } {
  const fromHash = readHashState();
  if (fromHash) return fromHash;
  const first = createDefaultBuild('coconut-bay');
  return { builds: [first], activeId: first.id };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalculatorPageClient() {
  // initState() must only be called ONCE — two separate lazy initialisers would each call
  // generateBuildId(), producing mismatched ids between builds and activeId.
  const [{ builds: initialBuilds, activeId: initialActiveId }] = useState(initState);
  const [builds, setBuilds] = useState(initialBuilds);
  const [activeId, setActiveId] = useState(initialActiveId);
  const [chartMode, setChartMode] = useState<'per-catch' | 'per-hour'>('per-hour');

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
      const restored = decodeUrlState(window.location.hash);
      if (restored) {
        setBuilds(restored.builds);
        setActiveId(restored.activeId);
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
      const dup = duplicateBuild(src, builds.length);
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

  // ── Calculations ───────────────────────────────────────────────────────────

  const results: DistributionResult[] = useMemo(
    () => builds.map((b) => calculateDistribution(b.params)),
    [builds],
  );

  const activeResult = results[builds.findIndex((b) => b.id === activeId)] ?? results[0];
  const catchesPerHour = 3600 / Math.max(1, activeResult.model.effectiveAvgCatchTimeSec);

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          📊 Equipment-aware probability calculator
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          エリア、Time of Day、Weather、Rod / Line / Bobber / Enchant、時間モデルをもとに、 公開
          community data から期待値分布を近似計算します。
        </p>
      </div>

      <section className="mb-6 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">ギア比較の手順</h2>
        <p className="mb-4 text-xs text-gray-500">
          「どの Rod / Enchant が一番稼げるか」を探す場合、この順で操作してください。
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-1 text-xs font-bold text-ocean-700">Step 1 — エリアと条件</div>
            <p className="text-xs leading-relaxed text-gray-600">
              Fishing Area を選び、Time of Day / Weather
              を実際の環境に合わせる。ここを変えると候補魚が大きく変わります。
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-1 text-xs font-bold text-ocean-700">Step 2 — ベース loadout</div>
            <p className="text-xs leading-relaxed text-gray-600">
              現在の Rod / Line / Bobber / Enchant を選択。これが比較の基準になります。`Observed
              values` に実測値を入れると最も正確です。
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-1 text-xs font-bold text-ocean-700">
              Step 3 — ビルドを追加して比較
            </div>
            <p className="text-xs leading-relaxed text-gray-600">
              タブの <strong>「+ 追加」</strong> や <strong>「複製」</strong>{' '}
              で新しいビルドを作り、1 スロットだけ変えて <strong>「ビルド比較」</strong>{' '}
              テーブルで期待値/時間を比較します。
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-1 text-xs font-bold text-ocean-700">Step 4 — 前提を確認</div>
            <p className="text-xs leading-relaxed text-gray-600">
              `Derived model` で supported / experimental
              の範囲を確認。数字が大きく変わった場合、experimental
              な仮定が効いている可能性があります。
            </p>
          </div>
        </div>
      </section>

      {/* Build tabs */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">ビルド管理</h2>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
            title="現在の全ビルドを URL に保存してコピー"
          >
            {copied ? '✓ コピー済み' : '🔗 URL をコピー'}
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
          ダブルクリックまたは ✏ で名前変更、⧉ で複製、✕ で削除。URL
          をコピーして他の人と共有できます。
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
            <span className="font-semibold">比較の見方:</span> ギアを変えたとき、
            <strong>期待値/時間</strong> が上がれば周回効率が改善しています。
            <strong>期待値/回</strong> は一投の強さ、<strong>魚が釣れる確率</strong> は miss
            込みの安定度の指標です。複数ビルドを作ると下の「ビルド比較」テーブルで並べて確認できます。
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
              rarity、weight、direct value effects を織り込んだ、一投あたりの平均収益です。
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">期待値/時間</div>
              周回効率の比較用です。実測 `Observed values`
              を使うと、よりプレイ実感に近い比較になります。
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">試行回数/時間</div>
              effective attempt time から逆算した、1 時間に何回投げられるかです。
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">魚が釣れる確率</div>
              effective miss rate を引いた値です。Double Up!! のような追加 catch
              効果はこの数字には入りません。
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
              Time of Day: {TIME_OF_DAY_LABELS[activeResult.params.timeOfDay]}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
              Weather: {WEATHER_TYPE_LABELS[activeResult.params.weatherType]}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
              Time model: {activeResult.params.timeModelMode}
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
          <RankingView baseParams={activeBuild.params} />

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
              `1回あたり` は一投ごとの寄与、`1時間あたり` は effective attempt time
              を反映した時給寄与です。比較したい軸に合わせて切り替えてください。
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

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-xs leading-relaxed text-gray-600">
            <h3 className="mb-2 font-semibold text-gray-700">📝 計算方法・前提条件</h3>
            <ul className="space-y-1.5">
              <li>
                • <strong>対象魚 pool</strong>: Fish! TrickForge Studios Fandom Index の area
                一覧と条件タグを使います。
              </li>
              <li>
                • <strong>装備 stat</strong>: public Fandom の Rod / Rod Accessories / Enchantments
                table を使います。
              </li>
              <li>
                • <strong>時間帯 / 天候</strong>: 公開タグ一致で対象魚を絞り込み、条件付き enchant
                の active 判定にも使います。
              </li>
              <li>
                • <strong>釣獲率</strong>: rarity tier の既定相対重みを使い、同じ tier
                内では等分配します。
              </li>
              <li>
                • <strong>Luck</strong>: {activeResult.model.effectiveLuckMultiplier.toFixed(2)}x の
                rarity-weight multiplier として experimental に反映しています。
              </li>
              <li>
                • <strong>Big Catch / Max Weight</strong>:{' '}
                {(activeResult.model.weightPercentile * 100).toFixed(0)}% weight percentile と
                current Max Weight cap を使う experimental price model です。
              </li>
              <li>
                • <strong>Modifier 期待値補正</strong>:{' '}
                {activeResult.params.modifierAssumptions.includeModifiers
                  ? `Modifier EV factor ${activeResult.model.modifierEvFactor.toFixed(3)}x を期待値に反映中 (experimental — community 近似モデル)`
                  : '現在は無効。左の「Modifier assumptions」でオンにできます (experimental)。'}
              </li>
              <li>
                • <strong>期待値/回</strong>: 各魚の確率 × modeled value × direct catch effect
                {activeResult.params.modifierAssumptions.includeModifiers
                  ? ' × modifier EV factor'
                  : ''}
                です。
              </li>
              <li>
                • <strong>期待値/時間</strong>: 期待値/回 × (3600 ÷ effective attempt time) です。
              </li>
              <li>
                • <strong>現在の有効 rarity tier</strong>:{' '}
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
    </div>
  );
}

export default CalculatorPageClient;
