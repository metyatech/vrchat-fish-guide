'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import { FISHING_AREAS } from '@/data/fish';
import { CalculatorParams, EnchantItem } from '@/types';
import {
  computeSubsetSearchSpace,
  FullBuildEntry,
  optimizeSubsetBuildAsync,
  RankDimension,
  RankSlot,
  SubsetBuildOptimizerResult,
} from '@/lib/ranking';
import { formatCurrency } from '@/lib/calculator';

const INITIAL_WINDOW_SIZE = 10;
const LOAD_MORE_INCREMENT = 10;

const SLOT_LABELS: Record<RankDimension, string> = {
  rod: 'Rod',
  line: 'Line',
  bobber: 'Bobber',
  enchant: 'Enchant',
  area: '釣り場',
};

const ALL_SLOTS: RankDimension[] = ['rod', 'line', 'bobber', 'enchant', 'area'];
const EQUIPMENT_SLOTS: RankSlot[] = ['rod', 'line', 'bobber', 'enchant'];
const EMPTY_BUILDS: FullBuildEntry[] = [];

type CombinationFilterField = RankDimension;
type CombinationFilterState = Record<CombinationFilterField, string[]>;
type CombinationFilterOption = {
  id: string;
  label: string;
  sublabel?: string;
};

const EMPTY_COMBINATION_FILTERS: CombinationFilterState = {
  rod: [],
  line: [],
  bobber: [],
  enchant: [],
  area: [],
};

interface OptimizerViewProps {
  /** Base params to optimize against (area, conditions, time model, etc.) */
  baseParams: CalculatorParams;
  /** Slots to vary in the search (default: all four). Fixed slots retain baseParams.loadout values. */
  varyingSlots?: RankDimension[];
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
  /** Optional heading override shown above the result list */
  title?: string;
  /** Optional description override shown below the heading */
  description?: string;
  /** Show leaderboard-style filters above the result list. */
  enableCombinationFilters?: boolean;
  /** Hide the inner heading/description when an outer section already owns that framing. */
  showHeader?: boolean;
  /** Show the "順位に含める欄" chip row. */
  showScopeSummary?: boolean;
  /** Visual emphasis level for the usage guidance box. */
  guideVariant?: 'warning' | 'muted';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildKey(entry: FullBuildEntry): string {
  return `${entry.areaId}|${entry.loadout.rodId}|${entry.loadout.lineId}|${entry.loadout.bobberId}|${entry.loadout.enchantId}`;
}

function buildCombinationFilterOptions(): Record<
  CombinationFilterField,
  CombinationFilterOption[]
> {
  return {
    rod: RODS.map((item) => ({ id: item.id, label: item.nameEn, sublabel: item.location })),
    line: LINES.map((item) => ({ id: item.id, label: item.nameEn, sublabel: item.location })),
    bobber: BOBBERS.map((item) => ({ id: item.id, label: item.nameEn, sublabel: item.location })),
    enchant: ENCHANTS.map((item) => ({
      id: item.id,
      label: item.nameEn,
      sublabel: item.specialEffect !== '-' ? item.specialEffect : undefined,
    })),
    area: FISHING_AREAS.map((area) => ({ id: area.id, label: area.nameEn })),
  };
}

function hasActiveCombinationFilters(
  filters: CombinationFilterState,
  searchQuery: string,
): boolean {
  return (
    searchQuery.trim().length > 0 ||
    Object.values(filters).some((selectedValues) => selectedValues.length > 0)
  );
}

function filterBuilds(
  builds: FullBuildEntry[],
  filters: CombinationFilterState,
  searchQuery: string,
): FullBuildEntry[] {
  const term = searchQuery.trim().toLowerCase();

  return builds.filter((entry) => {
    if (filters.rod.length > 0 && !filters.rod.includes(entry.loadout.rodId)) return false;
    if (filters.line.length > 0 && !filters.line.includes(entry.loadout.lineId)) return false;
    if (filters.bobber.length > 0 && !filters.bobber.includes(entry.loadout.bobberId)) return false;
    if (filters.enchant.length > 0 && !filters.enchant.includes(entry.loadout.enchantId))
      return false;
    if (filters.area.length > 0 && !filters.area.includes(entry.areaId)) return false;

    if (!term) return true;

    return (
      entry.areaName.toLowerCase().includes(term) ||
      entry.items.rod.nameEn.toLowerCase().includes(term) ||
      entry.items.line.nameEn.toLowerCase().includes(term) ||
      entry.items.bobber.nameEn.toLowerCase().includes(term) ||
      entry.items.enchant.nameEn.toLowerCase().includes(term)
    );
  });
}

function isEnchantItem(item: { category: string }): item is EnchantItem {
  return item.category === 'enchant';
}

function ResultTable({
  rankedBuilds,
  bestValuePerHour,
  onPickBuild,
  showPickActions,
  showAreaColumn,
}: {
  rankedBuilds: Array<{ entry: FullBuildEntry; rank: number }>;
  bestValuePerHour: number;
  onPickBuild?: (entry: FullBuildEntry, rank: number) => void;
  showPickActions: boolean;
  showAreaColumn: boolean;
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
              key={buildKey(entry)}
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
                    {showAreaColumn ? (
                      <div className="truncate">
                        <span className="font-semibold">Area:</span> {entry.areaName}
                      </div>
                    ) : null}
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
              {showAreaColumn ? (
                <th className="pb-2 text-left font-medium text-gray-500">釣り場</th>
              ) : null}
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
                  key={buildKey(entry)}
                  className={`border-b border-gray-50 ${isBest ? 'bg-green-50' : ''}`}
                >
                  <td className="py-1.5 font-medium text-gray-500">{rank}</td>
                  {showAreaColumn ? (
                    <td className="py-1.5 break-words text-gray-700">{entry.areaName}</td>
                  ) : null}
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
  title,
  description,
  enableCombinationFilters = false,
  showHeader = true,
  showScopeSummary = true,
  guideVariant = 'warning',
}: OptimizerViewProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [provisionalResult, setProvisionalResult] = useState<SubsetBuildOptimizerResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<'desc' | 'asc'>('desc');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(INITIAL_WINDOW_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CombinationFilterState>(EMPTY_COMBINATION_FILTERS);

  const paramsKey = JSON.stringify(baseParams);
  const orderedVaryingSlots = useMemo(
    () => ALL_SLOTS.filter((slot) => varyingSlots.includes(slot)),
    [varyingSlots],
  );
  const slotsKey = JSON.stringify(orderedVaryingSlots);
  const isVisible = alwaysOpen || isExpanded;
  const isFullBuild =
    orderedVaryingSlots.length === EQUIPMENT_SLOTS.length &&
    EQUIPMENT_SLOTS.every((slot) => orderedVaryingSlots.includes(slot));
  const showAreaColumn = orderedVaryingSlots.includes('area');
  const totalCombinations = computeSubsetSearchSpace(orderedVaryingSlots);
  const filterOptions = useMemo(buildCombinationFilterOptions, []);
  const filtersKey = JSON.stringify({ searchQuery, filters });

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
  const filteredBuilds = useMemo(
    () => (enableCombinationFilters ? filterBuilds(allBuilds, filters, searchQuery) : allBuilds),
    [allBuilds, enableCombinationFilters, filters, searchQuery],
  );
  const totalResults = filteredBuilds.length;
  const normalizedStart =
    totalResults > 0 ? clamp(Math.min(rangeStart, rangeEnd), 1, totalResults) : 1;
  const normalizedEnd =
    totalResults > 0 ? clamp(Math.max(rangeStart, rangeEnd), normalizedStart, totalResults) : 0;
  const bestValuePerHour = filteredBuilds[0]?.expectedValuePerHour ?? 0;
  const searchedSoFar = provisionalResult?.searchedCount ?? 0;
  const progressPct =
    isLoading && totalCombinations > 0 ? (searchedSoFar / totalCombinations) * 100 : 0;
  const hasMore = normalizedEnd < totalResults;
  const rankByKey = useMemo(
    () => new Map(filteredBuilds.map((entry, index) => [buildKey(entry), index + 1])),
    [filteredBuilds],
  );
  const visibleBuilds = useMemo(() => {
    if (totalResults === 0) return [] as Array<{ entry: FullBuildEntry; rank: number }>;
    const rankWindow = filteredBuilds.slice(normalizedStart - 1, normalizedEnd);
    const orderedWindow = displayOrder === 'desc' ? rankWindow : [...rankWindow].reverse();
    return orderedWindow.map((entry) => ({
      entry,
      rank: rankByKey.get(buildKey(entry)) ?? 1,
    }));
  }, [displayOrder, filteredBuilds, normalizedEnd, normalizedStart, rankByKey, totalResults]);
  const varyingLabel = isFullBuild
    ? 'Rod / Line / Bobber / Enchant'
    : orderedVaryingSlots.map((slot) => SLOT_LABELS[slot]).join(' + ');
  const descriptionText = isFullBuild
    ? `Rod / Line / Bobber / Enchant の候補から、能力的に完全に劣る装備を先に外した ${totalCombinations.toLocaleString()} 通りを厳密に調べて、伸びやすい順に並べます。4つのスロットを同時に変えたいときに使ってください。`
    : `${varyingLabel} の組み合わせを厳密に調べて（${totalCombinations.toLocaleString()} 通り）、伸びやすい順に並べます。固定スロットはいまの装備のままです。`;
  const rangeLabel =
    totalResults > 0
      ? `${hasActiveCombinationFilters(filters, searchQuery) ? '絞り込み後 ' : ''}第${normalizedStart}〜${normalizedEnd}位 / 全${totalResults.toLocaleString()}件`
      : `結果待ち / 全${totalCombinations.toLocaleString()}通り`;
  const conciseGuideItems =
    enableCombinationFilters && orderedVaryingSlots.length === ALL_SLOTS.length
      ? [
          '最初は何も固定しない順位です。気になる条件だけ後から絞り込めます。',
          'Luck など、ゲーム内部の正確式が分かっていない部分は推定で計算しています。',
          helperText ?? '同じ欄の複数選択は「または」、欄が違う条件は「かつ」で絞り込まれます。',
        ]
      : [
          'Luck や Big Catch Rate など、ゲーム内部の正確式が分かっていない部分は推定で計算しています。',
          '完全に劣る Rod / Line / Bobber は先に外していますが、順位の結果は変わりません。',
          ...(!isFullBuild
            ? [
                `固定スロット（${ALL_SLOTS.filter((slot) => !orderedVaryingSlots.includes(slot))
                  .map((slot) => SLOT_LABELS[slot])
                  .join(' / ')}）はいまの装備のまま固定されています。`,
              ]
            : []),
          helperText ??
            (showPickActions
              ? '上位/下位ショートカット、順位範囲、表示順の切り替えで、トップ帯から下位帯まで同じ検索結果を見返せます。'
              : '上位/下位ショートカット、順位範囲、表示順の切り替えで、見たい順位帯だけを同じ検索結果のまま眺められます。'),
        ];
  const guideClasses =
    guideVariant === 'muted'
      ? 'rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700'
      : 'rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800';
  const guideTitle = guideVariant === 'muted' ? 'このランキングの前提' : '見方:';

  useEffect(() => {
    if (!isVisible) return;
    setDisplayOrder('desc');
    setRangeStart(1);
    setRangeEnd(INITIAL_WINDOW_SIZE);
  }, [filtersKey, isVisible]);

  const toggleFilterValue = (field: CombinationFilterField, value: string) => {
    setFilters((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((entry) => entry !== value)
        : [...current[field], value].sort((a, b) => a.localeCompare(b, 'en')),
    }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters(EMPTY_COMBINATION_FILTERS);
  };

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

  const resolvedDescription = description ?? descriptionText;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      {showHeader ? (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              {title ??
                (isFullBuild
                  ? '4スロットを組み合わせて探す'
                  : `${varyingLabel} を組み合わせて探す`)}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">{resolvedDescription}</p>
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
      ) : null}

      {!showHeader ? <p className="text-xs text-gray-500">{resolvedDescription}</p> : null}

      {showScopeSummary ? (
        <div className={`${showHeader ? 'mt-2' : ''} flex flex-wrap items-center gap-1.5`}>
          <span className="text-[11px] text-gray-500">順位に含める欄:</span>
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
      ) : null}

      {enableCombinationFilters ? (
        <div
          className="mt-4 rounded-2xl border border-white/85 bg-white/80 p-4 shadow-sm"
          data-testid="optimizer-filter-panel"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">ランキングの絞り込み</h3>
              <p className="mt-1 text-xs text-gray-500">
                いま見えている順位表だけを後から絞ります。同じ欄の複数選択は「または」、欄が違う条件は「かつ」です。
              </p>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveCombinationFilters(filters, searchQuery)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              フィルターをリセット
            </button>
          </div>

          <label className="mt-4 block">
            <span className="sr-only">ランキングを検索</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="ランキングを検索"
              placeholder="装備名・釣り場で検索..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-ocean-300 focus:ring-2 focus:ring-ocean-200/60"
            />
          </label>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {orderedVaryingSlots.map((field) => {
              const selectedCount = filters[field].length;
              const options = filterOptions[field];

              return (
                <details
                  key={field}
                  className="group rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                    <span>{SLOT_LABELS[field]} で絞る</span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      {selectedCount > 0 ? `${selectedCount}件` : 'すべて'}
                    </span>
                  </summary>
                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                    {options.map((option) => {
                      const checked = filters[field].includes(option.id);

                      return (
                        <label
                          key={`${field}-${option.id}`}
                          className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                            checked
                              ? 'border-ocean-300 bg-ocean-50 text-ocean-900'
                              : 'border-white bg-white text-slate-700 hover:border-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFilterValue(field, option.id)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-ocean-600 focus:ring-ocean-300"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">{option.label}</span>
                            {option.sublabel ? (
                              <span className="block text-xs text-slate-500">
                                {option.sublabel}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>

          {hasActiveCombinationFilters(filters, searchQuery) ? (
            <div className="mt-4 flex flex-wrap gap-2" data-testid="ranking-active-filter-chips">
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="rounded-full border border-ocean-200 bg-ocean-50 px-3 py-1 text-xs font-semibold text-ocean-800"
                >
                  検索: {searchQuery.trim()} ×
                </button>
              ) : null}
              {orderedVaryingSlots.flatMap((field) =>
                filters[field].map((value) => {
                  const label =
                    filterOptions[field].find((option) => option.id === value)?.label ?? value;
                  return (
                    <button
                      key={`${field}-chip-${value}`}
                      type="button"
                      onClick={() => toggleFilterValue(field, value)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {SLOT_LABELS[field]}: {label} ×
                    </button>
                  );
                }),
              )}
            </div>
          ) : null}
        </div>
      ) : null}

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
            <div className={guideClasses}>
              <strong>{guideTitle}</strong>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {conciseGuideItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
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
                  aria-label={`${varyingLabel} の検索進捗`}
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
                  showAreaColumn={showAreaColumn}
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
