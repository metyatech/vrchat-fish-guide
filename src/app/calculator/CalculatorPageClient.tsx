'use client';

import React, { useMemo, useState } from 'react';
import { AdSlot } from '@/components/AdSlot';
import { DistributionChart } from '@/components/Calculator/DistributionChart';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { ResultTable } from '@/components/Calculator/ResultTable';
import { WarningBanner } from '@/components/Calculator/WarningBanner';
import { Sidebar } from '@/components/Layout/Sidebar';
import { RARITY_LABELS, TIME_OF_DAY_LABELS, WEATHER_TYPE_LABELS } from '@/data/fish';
import { calculateDistribution, formatCurrency, getDefaultParams } from '@/lib/calculator';
import { CalculatorParams, DistributionResult, Rarity } from '@/types';

export function CalculatorPageClient() {
  const [params, setParams] = useState<CalculatorParams>(getDefaultParams('coconut-bay'));
  const [chartMode, setChartMode] = useState<'per-catch' | 'per-hour'>('per-hour');

  const result: DistributionResult = useMemo(() => calculateDistribution(params), [params]);
  const catchesPerHour = 3600 / Math.max(1, result.params.avgCatchTimeSec);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📊 確率・収益計算機</h1>
        <p className="mt-1 text-sm text-gray-500">
          エリア、時間帯、天候、平均試行時間、空振り率をもとに、公開 community data
          から期待値分布を近似計算します。
        </p>
      </div>

      <section className="mb-6 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">このページの見方</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 text-sm font-semibold text-ocean-700">1. 左で条件を入れる</div>
            <p className="text-sm leading-relaxed text-gray-600">
              まずは既定値のままでも構いません。実プレイに近づけたいときだけ `平均試行時間` と
              `空振り確率` を触ってください。
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 text-sm font-semibold text-ocean-700">
              2. 上の 4 指標で効率を見る
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              まず比較に使うのは `期待値/時間` です。`期待値/回` は一投の強さ、`魚が釣れる確率`
              は空振り込みの安定度を表します。
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 text-sm font-semibold text-ocean-700">3. 表で原因を特定する</div>
            <p className="text-sm leading-relaxed text-gray-600">
              結果が高い理由や低い理由は `魚種別詳細`
              に出ます。高額魚が少し混ざるのか、安定して釣れる魚が多いのかを確認できます。
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6 md:flex-row">
        <Sidebar>
          <ParameterForm params={params} onChange={setParams} />
        </Sidebar>

        <div className="flex-1 space-y-6">
          <WarningBanner warnings={result.warnings} />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div
              className="rounded-xl border border-gray-200 bg-white p-4 text-center"
              data-testid="summary-expected-value-per-catch"
            >
              <div className="text-2xl font-bold text-ocean-700">
                {formatCurrency(result.expectedValuePerCatch)}
              </div>
              <div className="mt-1 text-xs text-gray-500">期待値/回</div>
            </div>
            <div
              className="rounded-xl border border-gray-200 bg-white p-4 text-center"
              data-testid="summary-expected-value-per-hour"
            >
              <div className="text-2xl font-bold text-ocean-700">
                {formatCurrency(result.expectedValuePerHour)}
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
                {(result.totalFishProbability * 100).toFixed(0)}%
              </div>
              <div className="mt-1 text-xs text-gray-500">魚が釣れる確率</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">期待値/回</div>
              一投ごとの平均売値です。単発の強さを見たいときに使います。
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">期待値/時間</div>
              周回効率の比較用です。基本的にはこの数値を主指標として見れば十分です。
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">試行回数/時間</div>
              入れた平均試行時間から逆算した、1 時間に何回投げられるかです。
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="mb-1 font-semibold text-gray-800">魚が釣れる確率</div>
              空振り込みで、何かしらの魚が釣れる確率です。安定度の目安に使います。
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
              対象魚種: {result.fishResults.length}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
              価格レンジ未取得: {result.missingPriceFish.length}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
              時間帯: {TIME_OF_DAY_LABELS[result.params.timeOfDay]}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600">
              天候: {WEATHER_TYPE_LABELS[result.params.weatherType]}
            </div>
          </div>

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
            <DistributionChart result={result} mode={chartMode} />
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              `1回あたり` は一投ごとの寄与、`1時間あたり`
              は平均試行時間を反映した時給寄与です。比較したい軸に合わせて切り替えてください。
            </p>
          </div>

          <div className="flex justify-center">
            <AdSlot position="in-content" size="leaderboard" showPlaceholder={false} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-800">魚種別詳細</h2>
            <ResultTable result={result} />
            <p className="mt-4 text-xs leading-relaxed text-gray-500">
              表では、各魚の `条件`, `売値レンジ`, `重量レンジ`, `釣獲率`, `期待値/回`,
              `期待値/時間` を確認できます。どの魚が全体期待値を押し上げているかを見るための欄です。
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-xs leading-relaxed text-gray-600">
            <h3 className="mb-2 font-semibold text-gray-700">📝 計算方法・前提条件</h3>
            <ul className="space-y-1.5">
              <li>
                • <strong>対象魚プール</strong>: Fish! TrickForge Studios Fandom Index
                のエリア一覧と条件タグを使います。
              </li>
              <li>
                • <strong>時間帯 / 天候</strong>:
                公開タグ一致で対象魚を絞り込みます。内部の倍率ボーナス式は反映していません。
              </li>
              <li>
                • <strong>釣獲率</strong>: rarity tier の既定相対重みを使い、同じ tier
                内では等分配します。
              </li>
              <li>
                • <strong>期待値/回</strong>: 各魚の確率 × 売値レンジ中央値で計算します。
              </li>
              <li>
                • <strong>期待値/時間</strong>: 期待値/回 × (3600 ÷ 平均試行時間) です。
              </li>
              <li>
                • <strong>未対応</strong>: 正確な Luck / Big Catch / Attraction
                の内部式、重量から売値への厳密曲線。
              </li>
              <li>
                • <strong>現在の有効 rarity tier</strong>:{' '}
                {Object.entries(result.effectiveRarityWeights)
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
