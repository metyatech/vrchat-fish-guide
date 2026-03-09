'use client';

import React, { useEffect, useState } from 'react';
import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import { CalculatorParams, EnchantItem } from '@/types';
import { optimizeFullBuildAsync, FullBuildEntry, FullBuildOptimizerResult } from '@/lib/ranking';
import { formatCurrency } from '@/lib/calculator';

// Derived once from the actual equipment arrays — stays in sync automatically.
const TOTAL_COMBINATIONS = RODS.length * LINES.length * BOBBERS.length * ENCHANTS.length;

interface OptimizerViewProps {
  /** Base params to optimize against (area, conditions, time model, etc.) */
  baseParams: CalculatorParams;
}

function isEnchantItem(item: { category: string }): item is EnchantItem {
  return item.category === 'enchant';
}

function ResultTable({ result }: { result: FullBuildOptimizerResult }) {
  const best = result.topBuilds[0]?.expectedValuePerHour ?? 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-2 text-left font-medium text-gray-500">#</th>
            <th className="pb-2 text-left font-medium text-gray-500">Rod</th>
            <th className="pb-2 text-left font-medium text-gray-500">Line</th>
            <th className="pb-2 text-left font-medium text-gray-500">Bobber</th>
            <th className="pb-2 text-left font-medium text-gray-500">Enchant</th>
            <th className="pb-2 text-right font-medium text-gray-500">EV/時間</th>
            <th className="pb-2 text-right font-medium text-gray-500">EV/回</th>
          </tr>
        </thead>
        <tbody>
          {result.topBuilds.map((entry: FullBuildEntry, i: number) => {
            const isBest = i === 0;
            const deltaVsTop = best > 0 ? ((entry.expectedValuePerHour - best) / best) * 100 : 0;

            return (
              <tr key={i} className={`border-b border-gray-50 ${isBest ? 'bg-green-50' : ''}`}>
                <td className="py-1.5 font-medium text-gray-500">{i + 1}</td>
                <td className="py-1.5">
                  <span className={`font-medium ${isBest ? 'text-green-700' : 'text-gray-700'}`}>
                    {entry.items.rod.nameEn}
                  </span>
                  {isBest && (
                    <span className="ml-1.5 rounded bg-green-100 px-1 py-0.5 text-xs text-green-700">
                      ベスト
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-gray-700">{entry.items.line.nameEn}</td>
                <td className="py-1.5 text-gray-700">{entry.items.bobber.nameEn}</td>
                <td className="py-1.5">
                  <span className="text-gray-700">{entry.items.enchant.nameEn}</span>
                  {isEnchantItem(entry.items.enchant) && entry.items.enchant.rarityLabel ? (
                    <span className="ml-1 text-gray-400">({entry.items.enchant.rarityLabel})</span>
                  ) : null}
                </td>
                <td className="py-1.5 text-right">
                  <span className={`font-semibold ${isBest ? 'text-green-700' : 'text-gray-700'}`}>
                    {formatCurrency(entry.expectedValuePerHour)}
                  </span>
                  {i > 0 && best > 0 && (
                    <span className="ml-1 text-gray-400">({deltaVsTop.toFixed(1)}%)</span>
                  )}
                </td>
                <td className="py-1.5 text-right text-gray-600">
                  {formatCurrency(entry.expectedValuePerCatch)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OptimizerView({ baseParams }: OptimizerViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [result, setResult] = useState<FullBuildOptimizerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Stable serialized key so re-runs only happen when params actually change.
  const paramsKey = JSON.stringify(baseParams);

  useEffect(() => {
    if (!isExpanded) {
      setResult(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setResult(null);

    optimizeFullBuildAsync(baseParams, 10, controller.signal).then((r) => {
      if (!controller.signal.aborted) {
        setResult(r);
        setIsLoading(false);
      }
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, paramsKey]);

  const displayedTotal = result?.totalCombinationSpace ?? TOTAL_COMBINATIONS;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">フルビルド最適化</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            全装備 {displayedTotal.toLocaleString()} 通りを完全に総当たりして EV/時間 でランキング。
            <span className="text-amber-700"> experimental モデル前提</span>の推定値です。
          </p>
        </div>
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="ml-4 shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
          aria-expanded={isExpanded}
          aria-controls="optimizer-results"
        >
          {isExpanded ? '閉じる ▲' : '表示 ▼'}
        </button>
      </div>

      {isExpanded && (
        <div id="optimizer-results" className="mt-4 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            <strong>⚠ experimental モデル使用中 — 推定値に過ぎません:</strong>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>
                Luck スケーリング・時間モデル・Big Catch weight percentile
                などゲーム内部確認がとれていない近似モデルを含みます。
              </li>
              <li>
                全 <strong>{(result?.searchedCount ?? displayedTotal).toLocaleString()}</strong>{' '}
                通り（
                {displayedTotal.toLocaleString()}
                通り全組み合わせ）を完全に評価しています。除外された装備はありません。
              </li>
              <li>
                複数スロットの統計が加算されるため、単スロット独立ランキングとは順位が異なる場合があります。
              </li>
            </ul>
          </div>

          {isLoading && (
            <p className="text-xs text-gray-500">
              計算中… ({displayedTotal.toLocaleString()} 通り)
            </p>
          )}

          {!isLoading && result && result.topBuilds.length > 0 ? (
            <ResultTable result={result} />
          ) : !isLoading ? (
            <p className="text-xs text-gray-500">結果がありません。</p>
          ) : null}

          <p className="text-xs text-gray-400">
            ※
            このランキングはフォームの装備設定には自動反映されません。参考にして手動で設定してください。
          </p>
        </div>
      )}
    </div>
  );
}

export default OptimizerView;
