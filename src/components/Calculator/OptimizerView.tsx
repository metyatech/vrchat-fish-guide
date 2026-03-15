'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalculatorParams, EnchantItem } from '@/types';
import {
  computeSubsetSearchSpace,
  FullBuildEntry,
  optimizeSubsetBuildAsync,
  RankSlot,
  SubsetBuildOptimizerResult,
} from '@/lib/ranking';
import { formatCurrency } from '@/lib/calculator';

const INITIAL_WINDOW_SIZE = 10;
const LOAD_MORE_INCREMENT = 10;

const SLOT_LABELS: Record<RankSlot, string> = {
  rod: 'Rod',
  line: 'Line',
  bobber: 'Bobber',
  enchant: 'Enchant',
};

const ALL_SLOTS: RankSlot[] = ['rod', 'line', 'bobber', 'enchant'];
const EMPTY_BUILDS: FullBuildEntry[] = [];

interface OptimizerViewProps {
  /** Base params to optimize against (area, conditions, time model, etc.) */
  baseParams: CalculatorParams;
  /** Slots to vary in the search (default: all four). Fixed slots retain baseParams.loadout values. */
  varyingSlots?: RankSlot[];
  /** Expand by default */
  initialExpanded?: boolean;
  /** Keep the optimizer visible in guided flows */
  alwaysOpen?: boolean;
  /** Add an optimized combination to the comparison list */
  onPickBuild?: (entry: FullBuildEntry, rank: number) => void;
  /** Show compare CTA buttons inside the result list */
  showPickActions?: boolean;
  /** Optional explanation above the result list */
  helperText?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildKey(loadout: FullBuildEntry['loadout']): string {
  return `${loadout.rodId}|${loadout.lineId}|${loadout.bobberId}|${loadout.enchantId}`;
}

function isEnchantItem(item: { category: string }): item is EnchantItem {
  return item.category === 'enchant';
}

function ResultTable({
  rankedBuilds,
  bestValuePerHour,
  onPickBuild,
  showPickActions,
}: {
  rankedBuilds: Array<{ entry: FullBuildEntry; rank: number }>;
  bestValuePerHour: number;
  onPickBuild?: (entry: FullBuildEntry, rank: number) => void;
  showPickActions: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-3 md:hidden">
        {rankedBuilds.map(({ entry, rank }) => {
          const isBest = rank === 1;
          const deltaVsTop =
            bestValuePerHour > 0
              ? ((entry.expectedValuePerHour - bestValuePerHour) / bestValuePerHour) * 100
              : 0;

          return (
            <div
              key={buildKey(entry.loadout)}
              className={`rounded-xl border p-3 shadow-sm ${
                isBest ? 'border-green-200 bg-green-50/60' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-gray-500">
                    #{rank} {isBest ? 'ベスト' : ''}
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
                  {rank > 1 && bestValuePerHour > 0 && (
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
                {showPickActions ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1">
                    <span>操作</span>
                    <button
                      type="button"
                      onClick={() => onPickBuild?.(entry, rank - 1)}
                      className="rounded border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
                    >
                      追加
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1">
                    <span>順位</span>
                    <span className="font-semibold text-gray-800">#{rank}</span>
                  </div>
                )}
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
              {showPickActions ? (
                <th className="pb-2 text-right font-medium text-gray-500">操作</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rankedBuilds.map(({ entry, rank }) => {
              const isBest = rank === 1;
              const deltaVsTop =
                bestValuePerHour > 0
                  ? ((entry.expectedValuePerHour - bestValuePerHour) / bestValuePerHour) * 100
                  : 0;

              return (
                <tr
                  key={buildKey(entry.loadout)}
                  className={`border-b border-gray-50 ${isBest ? 'bg-green-50' : ''}`}
                >
                  <td className="py-1.5 font-medium text-gray-500">{rank}</td>
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
                    {rank > 1 && bestValuePerHour > 0 && (
                      <span className="ml-1 text-gray-400">({deltaVsTop.toFixed(1)}%)</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right text-gray-600">
                    {formatCurrency(entry.expectedValuePerCatch)}
                  </td>
                  {showPickActions ? (
                    <td className="py-1.5 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => onPickBuild?.(entry, rank - 1)}
                        className="w-full whitespace-normal rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
                      >
                        この組み合わせを追加
                      </button>
                    </td>
                  ) : null}
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
  varyingSlots = ALL_SLOTS,
  initialExpanded = false,
  alwaysOpen = false,
  onPickBuild,
  showPickActions = true,
  helperText,
}: OptimizerViewProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [provisionalResult, setProvisionalResult] = useState<SubsetBuildOptimizerResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<'desc' | 'asc'>('desc');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(INITIAL_WINDOW_SIZE);

  const paramsKey = JSON.stringify(baseParams);
  const orderedVaryingSlots = useMemo(
    () => ALL_SLOTS.filter((slot) => varyingSlots.includes(slot)),
    [varyingSlots],
  );
  const slotsKey = JSON.stringify(orderedVaryingSlots);
  const isVisible = alwaysOpen || isExpanded;
  const isFullBuild = orderedVaryingSlots.length === ALL_SLOTS.length;
  const totalCombinations = computeSubsetSearchSpace(orderedVaryingSlots);

  useEffect(() => {
    if (!isVisible) {
      setProvisionalResult(null);
      setIsLoading(false);
      setDisplayOrder('desc');
      setRangeStart(1);
      setRangeEnd(INITIAL_WINDOW_SIZE);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setProvisionalResult(null);
    setDisplayOrder('desc');
    setRangeStart(1);
    setRangeEnd(Math.min(INITIAL_WINDOW_SIZE, totalCombinations));

    optimizeSubsetBuildAsync(
      baseParams,
      orderedVaryingSlots,
      totalCombinations,
      controller.signal,
      (event) => {
        if (controller.signal.aborted) return;
        setProvisionalResult({
          topBuilds: event.topBuilds,
          searchedCount: event.searchedCount,
          totalCombinationSpace: event.totalCombinationSpace,
          varyingSlots: event.varyingSlots,
        });
        if (event.isComplete) {
          setIsLoading(false);
        }
      },
    );

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, paramsKey, slotsKey, totalCombinations]);

  const allBuilds = provisionalResult?.topBuilds ?? EMPTY_BUILDS;
  const totalResults = allBuilds.length;
  const normalizedStart =
    totalResults > 0 ? clamp(Math.min(rangeStart, rangeEnd), 1, totalResults) : 1;
  const normalizedEnd =
    totalResults > 0 ? clamp(Math.max(rangeStart, rangeEnd), normalizedStart, totalResults) : 0;
  const bestValuePerHour = allBuilds[0]?.expectedValuePerHour ?? 0;
  const searchedSoFar = provisionalResult?.searchedCount ?? 0;
  const progressPct =
    isLoading && totalCombinations > 0 ? (searchedSoFar / totalCombinations) * 100 : 0;
  const hasMore = normalizedEnd < totalResults;
  const rankByKey = useMemo(
    () => new Map(allBuilds.map((entry, index) => [buildKey(entry.loadout), index + 1])),
    [allBuilds],
  );
  const visibleBuilds = useMemo(() => {
    if (totalResults === 0) return [] as Array<{ entry: FullBuildEntry; rank: number }>;
    const rankWindow = allBuilds.slice(normalizedStart - 1, normalizedEnd);
    const orderedWindow = displayOrder === 'desc' ? rankWindow : [...rankWindow].reverse();
    return orderedWindow.map((entry) => ({
      entry,
      rank: rankByKey.get(buildKey(entry.loadout)) ?? 1,
    }));
  }, [allBuilds, displayOrder, normalizedEnd, normalizedStart, rankByKey, totalResults]);
  const varyingLabel = isFullBuild
    ? 'Rod / Line / Bobber / Enchant'
    : orderedVaryingSlots.map((slot) => SLOT_LABELS[slot]).join(' + ');
  const descriptionText = isFullBuild
    ? `Rod / Line / Bobber / Enchant の候補から、能力的に完全に劣る装備を先に外した ${totalCombinations.toLocaleString()} 通りを厳密に調べて、伸びやすい順に並べます。4つのスロットを同時に変えたいときに使ってください。`
    : `${varyingLabel} の組み合わせを厳密に調べて（${totalCombinations.toLocaleString()} 通り）、伸びやすい順に並べます。固定スロットはいまの装備のままです。`;
  const rangeLabel =
    totalResults > 0
      ? `第${normalizedStart}〜${normalizedEnd}位 / 全${totalResults.toLocaleString()}件`
      : `結果待ち / 全${totalCombinations.toLocaleString()}通り`;

  const handleRangeChange = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    rawValue: string,
  ) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || totalResults === 0) return;
    setter(clamp(Math.floor(parsed), 1, totalResults));
  };

  const handleTopWindow = () => {
    if (totalResults === 0) return;
    setDisplayOrder('desc');
    setRangeStart(1);
    setRangeEnd(Math.min(INITIAL_WINDOW_SIZE, totalResults));
  };

  const handleBottomWindow = () => {
    if (totalResults === 0) return;
    const size = Math.min(INITIAL_WINDOW_SIZE, totalResults);
    setDisplayOrder('asc');
    setRangeStart(totalResults - size + 1);
    setRangeEnd(totalResults);
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">
            {isFullBuild ? '4スロットを組み合わせて探す' : `${varyingLabel} を組み合わせて探す`}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">{descriptionText}</p>
        </div>
        {!alwaysOpen ? (
          <button
            onClick={() => setIsExpanded((value) => !value)}
            className="ml-4 shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
            aria-expanded={isExpanded}
            aria-controls="optimizer-results"
          >
            {isExpanded ? '閉じる' : '開く'}
          </button>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-gray-500">変えるスロット:</span>
        {ALL_SLOTS.map((slot) => {
          const isVarying = orderedVaryingSlots.includes(slot);
          return (
            <span
              key={slot}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                isVarying
                  ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                  : 'border-gray-200 bg-gray-100 text-gray-400 line-through'
              }`}
            >
              {SLOT_LABELS[slot]}
            </span>
          );
        })}
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
                {!isFullBuild && (
                  <li>
                    固定スロット（
                    {ALL_SLOTS.filter((slot) => !orderedVaryingSlots.includes(slot))
                      .map((slot) => SLOT_LABELS[slot])
                      .join(' / ')}
                    ）はいまの装備のまま固定されています。
                  </li>
                )}
                <li>
                  {helperText ??
                    (showPickActions
                      ? '上位/下位ショートカット、順位範囲、表示順の切り替えで、トップ帯から下位帯まで同じ検索結果を見返せます。'
                      : '上位/下位ショートカット、順位範囲、表示順の切り替えで、見たい順位帯だけを同じ検索結果のまま眺められます。')}
                </li>
              </ul>
            </div>

            {(isLoading || totalResults > 0) && (
              <div className="space-y-3 rounded-lg border border-white/80 bg-white/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">{rangeLabel}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDisplayOrder((order) => (order === 'desc' ? 'asc' : 'desc'))
                      }
                      disabled={totalResults === 0}
                      className="rounded border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`組み合わせ表示順: ${
                        displayOrder === 'desc' ? 'ベスト→ワースト' : 'ワースト→ベスト'
                      }`}
                    >
                      表示順: {displayOrder === 'desc' ? 'ベスト→ワースト' : 'ワースト→ベスト'}
                    </button>

                    <button
                      type="button"
                      onClick={handleTopWindow}
                      disabled={totalResults === 0}
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`上位${INITIAL_WINDOW_SIZE}を表示`}
                    >
                      上位{INITIAL_WINDOW_SIZE}
                    </button>

                    <button
                      type="button"
                      onClick={handleBottomWindow}
                      disabled={totalResults === 0}
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`下位${INITIAL_WINDOW_SIZE}を表示`}
                    >
                      下位{INITIAL_WINDOW_SIZE}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex items-center gap-1 text-[11px] text-gray-500">
                    開始
                    <input
                      type="number"
                      min={1}
                      max={Math.max(totalResults, 1)}
                      value={totalResults > 0 ? normalizedStart : 1}
                      onChange={(event) => handleRangeChange(setRangeStart, event.target.value)}
                      aria-label="組み合わせ開始順位"
                      disabled={totalResults === 0}
                      className="w-20 rounded border border-gray-200 bg-white px-2 py-1 text-right text-xs text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  <label className="flex items-center gap-1 text-[11px] text-gray-500">
                    終了
                    <input
                      type="number"
                      min={1}
                      max={Math.max(totalResults, 1)}
                      value={totalResults > 0 ? normalizedEnd : 1}
                      onChange={(event) => handleRangeChange(setRangeEnd, event.target.value)}
                      aria-label="組み合わせ終了順位"
                      disabled={totalResults === 0}
                      className="w-20 rounded border border-gray-200 bg-white px-2 py-1 text-right text-xs text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  <span className="text-[11px] text-gray-400">
                    {totalResults > 0
                      ? '入力した順位帯だけを再検索なしで切り替えます。'
                      : '途中結果が出るとここから範囲を切り替えられます。'}
                  </span>
                </div>
              </div>
            )}

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
                <ResultTable
                  rankedBuilds={visibleBuilds}
                  bestValuePerHour={bestValuePerHour}
                  onPickBuild={onPickBuild}
                  showPickActions={showPickActions}
                />
                {hasMore && (
                  <button
                    type="button"
                    onClick={() =>
                      setRangeEnd((current) =>
                        Math.min(current + LOAD_MORE_INCREMENT, totalResults),
                      )
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
                  >
                    もっと見る（残り {totalResults - normalizedEnd} 件）
                  </button>
                )}
              </div>
            ) : !isLoading ? (
              <p className="text-xs text-gray-500">結果がありません。</p>
            ) : null}

            {showPickActions ? (
              <p className="text-xs text-gray-400">
                ※ 気になる候補は「この組み合わせを追加」を押すと、上の比較一覧に追加できます。
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
