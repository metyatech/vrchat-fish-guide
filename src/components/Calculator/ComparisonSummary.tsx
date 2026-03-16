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
    <div className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur-sm">
      <h2 className="mb-1 text-base font-semibold text-gray-800">組み合わせを並べて比べる</h2>
      <p className="mb-4 text-xs text-gray-500">
        いま保存している組み合わせを横並びで比べます。
        <span className="ml-1 inline-block rounded bg-green-100 px-1.5 py-0.5 font-semibold text-green-700">
          緑
        </span>{' '}
        はその列で一番良い値です。名前を押すと、その組み合わせを上の入力欄に表示します。
      </p>

      <div className="space-y-3 md:hidden">
        {builds.map((build, i) => {
          const result = results[i];
          if (!result) return null;
          const isActive = build.id === activeId;
          const isTopEvHour = result.expectedValuePerHour === bestEvPerHour;
          const isTopEvCatch = result.expectedValuePerCatch === bestEvPerCatch;
          const isTopCatch = result.totalFishProbability === bestCatchProb;
          const catchesPerHour = 3600 / Math.max(1, result.model.effectiveAvgCatchTimeSec);

          return (
            <button
              key={build.id}
              type="button"
              onClick={() => onSelect(build.id)}
              className={`w-full rounded-xl border p-3 text-left shadow-sm transition ${
                isActive
                  ? 'border-ocean-200 bg-ocean-50/80'
                  : 'border-gray-200 bg-white hover:border-ocean-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className={`flex flex-wrap items-center gap-1.5 text-sm font-semibold ${
                      isActive ? 'text-ocean-700' : 'text-gray-800'
                    }`}
                  >
                    {i === 0 && (
                      <span
                        className="shrink-0 rounded-full border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600"
                        data-testid="comparison-baseline-badge"
                      >
                        基準
                      </span>
                    )}
                    {isActive && (
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-ocean-500 align-middle" />
                    )}
                    <span className="truncate">{build.name}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">EV/h</div>
                  <div
                    className={`text-sm font-semibold ${
                      isTopEvHour ? 'text-green-700' : 'text-ocean-700'
                    }`}
                  >
                    {formatCurrency(result.expectedValuePerHour)}
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1">
                  <span>期待値/回</span>
                  <span
                    className={`font-semibold ${isTopEvCatch ? 'text-green-700' : 'text-gray-800'}`}
                  >
                    {formatCurrency(result.expectedValuePerCatch)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1">
                  <span>釣獲確率</span>
                  <span
                    className={`font-semibold ${isTopCatch ? 'text-green-700' : 'text-gray-800'}`}
                  >
                    {(result.totalFishProbability * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1">
                  <span>試行回数/時間</span>
                  <span className="font-semibold text-gray-800">{catchesPerHour.toFixed(0)}回</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden md:block">
        <table className="w-full table-fixed text-sm md:table-auto">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="w-1/3 pb-2 text-left font-semibold text-gray-600 md:w-auto">
                組み合わせ
              </th>
              <th className="w-1/6 pb-2 text-right font-semibold text-gray-600 md:w-auto">
                期待値/時間
              </th>
              <th className="w-1/6 pb-2 text-right font-semibold text-gray-600 md:w-auto">
                期待値/回
              </th>
              <th className="w-1/6 pb-2 text-right font-semibold text-gray-600 md:w-auto">
                釣獲確率
              </th>
              <th className="w-1/6 pb-2 text-right font-semibold text-gray-600 md:w-auto">
                試行回数/時間
              </th>
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
                  className={`border-b border-gray-50 transition-all duration-150 ${
                    isActive
                      ? 'bg-[linear-gradient(90deg,rgba(239,248,255,0.92),rgba(255,255,255,1))]'
                      : 'hover:bg-gray-50/70'
                  }`}
                >
                  <td className="py-2.5">
                    <button
                      onClick={() => onSelect(build.id)}
                      className={`flex min-w-0 flex-wrap items-center gap-1.5 text-left font-medium transition-colors ${
                        isActive ? 'text-ocean-700' : 'text-gray-700 hover:text-ocean-600'
                      }`}
                    >
                      {i === 0 && (
                        <span
                          className="shrink-0 rounded-full border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600"
                          data-testid="comparison-baseline-badge"
                        >
                          基準
                        </span>
                      )}
                      {isActive && (
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-ocean-500 align-middle" />
                      )}
                      <span className="min-w-0 break-words">{build.name}</span>
                    </button>
                  </td>
                  <td className={`py-2.5 text-right ${isTopEvHour ? 'rounded-lg' : ''}`}>
                    <span
                      className={`font-semibold ${isTopEvHour ? 'text-green-700' : 'text-gray-800'}`}
                    >
                      {formatCurrency(result.expectedValuePerHour)}
                    </span>
                    {isTopEvHour && (
                      <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
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
                      <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
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
                      <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
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
