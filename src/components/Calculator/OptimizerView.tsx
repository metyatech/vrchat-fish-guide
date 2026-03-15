'use client';

import React, { useEffect, useState } from 'react';
import { CalculatorParams, EnchantItem } from '@/types';
import {
  FULL_BUILD_SEARCH_SPACE,
  FullBuildEntry,
  FullBuildOptimizerResult,
  optimizeFullBuildAsync,
} from '@/lib/ranking';
import { formatCurrency } from '@/lib/calculator';

/** Buffer size for the optimizer heap. Larger than the initial display count so
 *  "もっと見る" can reveal additional builds without re-running the search. */
const OPTIMIZER_BUFFER_SIZE = 100;
const INITIAL_DISPLAY_COUNT = 10;
const LOAD_MORE_INCREMENT = 10;

interface OptimizerViewProps {
  /** Base params to optimize against (area, conditions, time model, etc.) */
  baseParams: CalculatorParams;
  /** Expand by default */
  initialExpanded?: boolean;
  /** Keep the optimizer visible in guided flows */
  alwaysOpen?: boolean;
  /** Add an optimized combination to the comparison list */
  onPickBuild?: (entry: FullBuildEntry, rank: number) => void;
}

function isEnchantItem(item: { category: string }): item is EnchantItem {
  return item.category === 'enchant';
}

function ResultTable({
  builds,
  onPickBuild,
}: {
  builds: FullBuildEntry[];
  onPickBuild?: (entry: FullBuildEntry, rank: number) => void;
}) {
  const best = builds[0]?.expectedValuePerHour ?? 0;

  return (
    <div className="space-y-3">
      <div className="space-y-3 md:hidden">
        {builds.map((entry: FullBuildEntry, i: number) => {
          const isBest = i === 0;
          const deltaVsTop = best > 0 ? ((entry.expectedValuePerHour - best) / best) * 100 : 0;

          return (
            <div
              key={`${entry.loadout.rodId}-${entry.loadout.lineId}-${entry.loadout.bobberId}-${entry.loadout.enchantId}`}
              className={`rounded-xl border p-3 shadow-sm ${
                isBest ? 'border-green-200 bg-green-50/60' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-gray-500">
                    #{i + 1} {isBest ? 'ベスト' : ''}
                  </div>
                  <div className="mt-1 space-y-1 text-xs text-gray-700">
                    <div className="truncate">
                      <span className="font-semibold">Rod:</span> {entry.items.rod.nameEn}
                    </div>
                    <div className="truncate">
                      <span className="font-semibold">Line:</span> {entry.items.line.nameEn}
                    </div>
                    <div className="truncate">
                      <span className="font-semibold">Bobber:</span> {entry.items.bobber.nameEn}
                    </div>
                    <div className="truncate">
                      <span className="font-semibold">Enchant:</span> {entry.items.enchant.nameEn}
                      {isEnchantItem(entry.items.enchant) && entry.items.enchant.rarityLabel ? (
                        <span className="ml-1 text-gray-400">
                          ({entry.items.enchant.rarityLabel})
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">EV/h</div>
                  <div
                    className={`text-sm font-semibold ${isBest ? 'text-green-700' : 'text-gray-700'}`}
                  >
                    {formatCurrency(entry.expectedValuePerHour)}
                  </div>
                  {i > 0 && best > 0 && (
                    <div className="text-[10px] text-gray-400">({deltaVsTop.toFixed(1)}%)</div>
                  )}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1">
                  <span>期待値/回</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(entry.expectedValuePerCatch)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1">
                  <span>操作</span>
                  <button
                    type="button"
                    onClick={() => onPickBuild?.(entry, i)}
                    className="rounded border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <table className="w-full table-fixed text-xs md:table-auto">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-8 pb-2 text-left font-medium text-gray-500 md:w-auto">#</th>
              <th className="pb-2 text-left font-medium text-gray-500">Rod</th>
              <th className="pb-2 text-left font-medium text-gray-500">Line</th>
              <th className="pb-2 text-left font-medium text-gray-500">Bobber</th>
              <th className="pb-2 text-left font-medium text-gray-500">Enchant</th>
              <th className="pb-2 text-right font-medium text-gray-500">期待値/時間</th>
              <th className="pb-2 text-right font-medium text-gray-500">期待値/回</th>
              <th className="pb-2 text-right font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {builds.map((entry: FullBuildEntry, i: number) => {
              const isBest = i === 0;
              const deltaVsTop = best > 0 ? ((entry.expectedValuePerHour - best) / best) * 100 : 0;

              return (
                <tr
                  key={`${entry.loadout.rodId}-${entry.loadout.lineId}-${entry.loadout.bobberId}-${entry.loadout.enchantId}`}
                  className={`border-b border-gray-50 ${isBest ? 'bg-green-50' : ''}`}
                >
                  <td className="py-1.5 font-medium text-gray-500">{i + 1}</td>
                  <td className="py-1.5">
                    <span
                      className={`break-words font-medium ${
                        isBest ? 'text-green-700' : 'text-gray-700'
                      }`}
                    >
                      {entry.items.rod.nameEn}
                    </span>
                    {isBest && (
                      <span className="ml-1.5 rounded bg-green-100 px-1 py-0.5 text-xs text-green-700">
                        ベスト
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 break-words text-gray-700">{entry.items.line.nameEn}</td>
                  <td className="py-1.5 break-words text-gray-700">{entry.items.bobber.nameEn}</td>
                  <td className="py-1.5 break-words">
                    <span className="text-gray-700">{entry.items.enchant.nameEn}</span>
                    {isEnchantItem(entry.items.enchant) && entry.items.enchant.rarityLabel ? (
                      <span className="ml-1 text-gray-400">
                        ({entry.items.enchant.rarityLabel})
                      </span>
                    ) : null}
                  </td>
                  <td className="py-1.5 text-right">
                    <span
                      className={`font-semibold ${isBest ? 'text-green-700' : 'text-gray-700'}`}
                    >
                      {formatCurrency(entry.expectedValuePerHour)}
                    </span>
                    {i > 0 && best > 0 && (
                      <span className="ml-1 text-gray-400">({deltaVsTop.toFixed(1)}%)</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right text-gray-600">
                    {formatCurrency(entry.expectedValuePerCatch)}
                  </td>
                  <td className="py-1.5 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => onPickBuild?.(entry, i)}
                      className="w-full whitespace-normal rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
                    >
                      この組み合わせを追加
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OptimizerView({
  baseParams,
  initialExpanded = false,
  alwaysOpen = false,
  onPickBuild,
}: OptimizerViewProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [provisionalResult, setProvisionalResult] = useState<FullBuildOptimizerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_COUNT);

  // Stable serialized key so re-runs only happen when params actually change.
  const paramsKey = JSON.stringify(baseParams);

  const isVisible = alwaysOpen || isExpanded;

  useEffect(() => {
    if (!isVisible) {
      setProvisionalResult(null);
      setIsLoading(false);
      setDisplayLimit(INITIAL_DISPLAY_COUNT);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setProvisionalResult(null);
    setDisplayLimit(INITIAL_DISPLAY_COUNT);

    optimizeFullBuildAsync(baseParams, OPTIMIZER_BUFFER_SIZE, controller.signal, (event) => {
      if (controller.signal.aborted) return;
      setProvisionalResult({
        topBuilds: event.topBuilds,
        searchedCount: event.searchedCount,
        totalCombinationSpace: event.totalCombinationSpace,
      });
      if (event.isComplete) {
        setIsLoading(false);
      }
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, paramsKey]);

  const totalCombinations = provisionalResult?.totalCombinationSpace ?? FULL_BUILD_SEARCH_SPACE;
  const searchedSoFar = provisionalResult?.searchedCount ?? 0;
  const progressPct =
    isLoading && totalCombinations > 0 ? (searchedSoFar / totalCombinations) * 100 : 0;

  const visibleBuilds = provisionalResult?.topBuilds.slice(0, displayLimit) ?? [];
  const totalInBuffer = provisionalResult?.topBuilds.length ?? 0;
  const hasMore = !isLoading && totalInBuffer > displayLimit;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">全部入れ替えて一気に探す</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Rod / Line / Bobber / Enchant の候補から、能力的に完全に劣る装備を先に外した{' '}
            {totalCombinations.toLocaleString()}{' '}
            通りを厳密に調べて、伸びやすい順に並べます。1欄ずつではなく、全部まとめて入れ替えたいときだけ使ってください。
          </p>
        </div>
        {!alwaysOpen ? (
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="ml-4 shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
            aria-expanded={isExpanded}
            aria-controls="optimizer-results"
          >
            {isExpanded ? '閉じる' : '開く'}
          </button>
        ) : null}
      </div>

      <div
        id="optimizer-results"
        aria-hidden={!isVisible}
        className="mt-4 grid transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{
          gridTemplateRows: isVisible ? '1fr' : '0fr',
          opacity: isVisible ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              <strong>見方:</strong>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>
                  Luck や Big Catch Rate
                  など、ゲーム内部の正確式が分かっていない部分は推定で計算しています。
                </li>
                <li>
                  完全に劣る Rod / Line / Bobber は先に外していますが、順位の結果は変わりません。
                </li>
                <li>
                  1欄だけの比較とは結果が変わることがあります。ここでは全部まとめて入れ替えた場合を見ています。
                </li>
              </ul>
            </div>

            {isLoading && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600"
                    aria-hidden="true"
                  />
                  <span>
                    {searchedSoFar > 0
                      ? `${searchedSoFar.toLocaleString()} / ${totalCombinations.toLocaleString()} 通り検索中…`
                      : `計算中… (${totalCombinations.toLocaleString()} 通り)`}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                  role="progressbar"
                  aria-valuenow={Math.round(progressPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progressPct > 0 ? Math.max(2, progressPct) : 0}%` }}
                  />
                </div>
              </div>
            )}

            {visibleBuilds.length > 0 ? (
              <div className="space-y-3">
                {isLoading && (
                  <p className="text-[11px] text-gray-400">
                    ※ 検索途中の速報です。完了後に順位が変わる場合があります。
                  </p>
                )}
                <ResultTable builds={visibleBuilds} onPickBuild={onPickBuild} />
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setDisplayLimit((l) => l + LOAD_MORE_INCREMENT)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
                  >
                    もっと見る（残り {totalInBuffer - displayLimit} 件）
                  </button>
                )}
              </div>
            ) : !isLoading ? (
              <p className="text-xs text-gray-500">結果がありません。</p>
            ) : null}

            <p className="text-xs text-gray-400">
              ※ 気になる候補は「この組み合わせを追加」を押すと、上の比較一覧に追加できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OptimizerView;
