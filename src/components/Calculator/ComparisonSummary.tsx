'use client';

import React from 'react';
import { BuildConfig, DistributionResult } from '@/types';
import { formatCurrency } from '@/lib/calculator';

interface ComparisonSummaryProps {
  builds: BuildConfig[];
  results: DistributionResult[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function ComparisonSummary({ builds, results, activeId, onSelect }: ComparisonSummaryProps) {
  if (builds.length < 2) return null;

  const evPerHour = results.map((r) => r.expectedValuePerHour);
  const evPerCatch = results.map((r) => r.expectedValuePerCatch);
  const catchProb = results.map((r) => r.totalFishProbability);

  const bestEvPerHour = Math.max(...evPerHour);
  const bestEvPerCatch = Math.max(...evPerCatch);
  const bestCatchProb = Math.max(...catchProb);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 text-base font-semibold text-gray-800">組み合わせを並べて比べる</h2>
      <p className="mb-4 text-xs text-gray-500">
        いま保存している組み合わせを横並びで比べます。
        <span className="ml-1 inline-block rounded bg-green-100 px-1.5 py-0.5 font-semibold text-green-700">
          緑
        </span>{' '}
        はその列で一番良い値です。名前を押すと、その組み合わせを上の入力欄に表示します。
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 text-left font-medium text-gray-500">組み合わせ</th>
              <th className="pb-2 text-right font-medium text-gray-500">期待値/時間</th>
              <th className="pb-2 text-right font-medium text-gray-500">期待値/回</th>
              <th className="pb-2 text-right font-medium text-gray-500">釣獲確率</th>
              <th className="pb-2 text-right font-medium text-gray-500">試行回数/時間</th>
            </tr>
          </thead>
          <tbody>
            {builds.map((build, i) => {
              const result = results[i];
              if (!result) return null;
              const isActive = build.id === activeId;
              const isTopEvHour = result.expectedValuePerHour === bestEvPerHour;
              const isTopEvCatch = result.expectedValuePerCatch === bestEvPerCatch;
              const isTopCatch = result.totalFishProbability === bestCatchProb;
              const catchesPerHour = 3600 / Math.max(1, result.model.effectiveAvgCatchTimeSec);

              return (
                <tr
                  key={build.id}
                  className={`border-b border-gray-50 transition-colors ${
                    isActive ? 'bg-ocean-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="py-2.5">
                    <button
                      onClick={() => onSelect(build.id)}
                      className={`text-left font-medium ${
                        isActive ? 'text-ocean-700' : 'text-gray-700 hover:text-ocean-600'
                      }`}
                    >
                      {isActive && (
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ocean-500 align-middle" />
                      )}
                      {build.name}
                    </button>
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`font-semibold ${isTopEvHour ? 'text-green-700' : 'text-gray-800'}`}
                    >
                      {formatCurrency(result.expectedValuePerHour)}
                    </span>
                    {isTopEvHour && (
                      <span className="ml-1 rounded bg-green-100 px-1 py-0.5 text-xs text-green-700">
                        ベスト
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`font-semibold ${isTopEvCatch ? 'text-green-700' : 'text-gray-800'}`}
                    >
                      {formatCurrency(result.expectedValuePerCatch)}
                    </span>
                    {isTopEvCatch && (
                      <span className="ml-1 rounded bg-green-100 px-1 py-0.5 text-xs text-green-700">
                        ベスト
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`font-semibold ${isTopCatch ? 'text-green-700' : 'text-gray-800'}`}
                    >
                      {(result.totalFishProbability * 100).toFixed(0)}%
                    </span>
                    {isTopCatch && (
                      <span className="ml-1 rounded bg-green-100 px-1 py-0.5 text-xs text-green-700">
                        ベスト
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-gray-700">{catchesPerHour.toFixed(0)}回</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※
        きちんと装備差だけを比べたいときは、場所・時間帯・天気をそろえてください。違う条件が混ざると、
        差の中に装備以外の影響も入ります。
      </p>
    </div>
  );
}

export default ComparisonSummary;
