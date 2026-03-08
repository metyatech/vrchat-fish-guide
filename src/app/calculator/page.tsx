'use client';

import React, { useState, useMemo } from 'react';
import { CalculatorParams, DistributionResult } from '@/types';
import { calculateDistribution, getDefaultParams, formatCurrency } from '@/lib/calculator';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { DistributionChart } from '@/components/Calculator/DistributionChart';
import { ResultTable } from '@/components/Calculator/ResultTable';
import { WarningBanner } from '@/components/Calculator/WarningBanner';
import { Sidebar } from '@/components/Layout/Sidebar';
import { AdSlot } from '@/components/AdSlot';

export default function CalculatorPage() {
  const [params, setParams] = useState<CalculatorParams>(getDefaultParams('lake'));
  const [chartMode, setChartMode] = useState<'per-catch' | 'per-hour'>('per-hour');

  const result: DistributionResult = useMemo(() => calculateDistribution(params), [params]);
  const catchesPerHour = 3600 / Math.max(1, params.avgCatchTimeSec);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📊 確率・収益計算機</h1>
        <p className="text-sm text-gray-500 mt-1">
          釣りパラメータを設定して、魚種ごとの釣獲確率と期待値を計算します。
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <Sidebar>
          <ParameterForm params={params} onChange={setParams} />
        </Sidebar>

        {/* Main content */}
        <div className="flex-1 space-y-6">
          {/* Warnings */}
          <WarningBanner warnings={result.warnings} />

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-ocean-700">
                {formatCurrency(result.expectedValuePerCatch)}
              </div>
              <div className="text-xs text-gray-500 mt-1">期待値/回</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-ocean-700">
                {formatCurrency(result.expectedValuePerHour)}
              </div>
              <div className="text-xs text-gray-500 mt-1">期待値/時間</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-700">{catchesPerHour.toFixed(0)}回</div>
              <div className="text-xs text-gray-500 mt-1">釣り回数/時間</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-700">
                {(result.totalFishProbability * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">魚が釣れる確率</div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">確率・期待値グラフ</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setChartMode('per-catch')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    chartMode === 'per-catch'
                      ? 'bg-ocean-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  1回あたり
                </button>
                <button
                  onClick={() => setChartMode('per-hour')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
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
          </div>

          {/* In-content ad */}
          <div className="flex justify-center">
            <AdSlot position="in-content" size="leaderboard" showPlaceholder={false} />
          </div>

          {/* Result table */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">魚種別詳細</h2>
            <ResultTable result={result} />
          </div>

          {/* Methodology note */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-xs text-gray-600 leading-relaxed">
            <h3 className="font-semibold text-gray-700 mb-2">📝 計算方法・前提条件</h3>
            <ul className="space-y-1.5">
              <li>
                • <strong>釣獲確率</strong>: コミュニティ報告の相対重み（catch
                weight）から算出。相対値のため実際の確率とは異なる場合があります。
              </li>
              <li>
                • <strong>期待値/回</strong>: 各魚の確率 × 基本価格の加重平均。Big
                Catch・重量ボーナスは含みません。
              </li>
              <li>
                • <strong>期待値/時間</strong>: 期待値/回 × （3600秒 ÷
                平均釣り時間）。実際の操作時間は含みません。
              </li>
              <li>
                • <strong>ラック</strong>:
                内部計算式が非公開のため、簡略化近似モデルを使用しています。
              </li>
              <li>
                • <strong>データ出典</strong>: コミュニティwiki（数値のみ抽出）+
                自己計測。全データは推定値です。
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
