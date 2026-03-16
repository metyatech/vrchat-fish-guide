'use client';

import React, { useMemo, useState } from 'react';
import { CalculatorParams, EquipmentItem, EnchantItem } from '@/types';
import {
  rankAllSlots,
  rankAllSlotsWithAreaBreakdown,
  RankSlot,
  SlotRankEntry,
} from '@/lib/ranking';
import { formatCurrency } from '@/lib/calculator';
import { SLOT_THEME } from '@/components/Calculator/slotTheme';

interface RankingViewProps {
  /** Base params to rank against (area, conditions, time model, etc.) */
  baseParams: CalculatorParams;
  /** Top-N entries to show per slot initially (default: 5) */
  topN?: number;
  /** Slot to emphasize first in the UI */
  focusSlot?: RankSlot;
  /** Expand by default */
  initialExpanded?: boolean;
  /** Keep the chosen slot open in guided flows */
  alwaysOpen?: boolean;
  /** Create a comparison pattern from a ranked item */
  onPickItem?: (slot: RankSlot, itemId: string, itemName: string) => void;
  /** Show compare CTA buttons inside the ranking table */
  showPickActions?: boolean;
  /** Optional explanation above the table */
  helperText?: string;
  /** Show one row per fishing area when the base params use auto-area selection. */
  includeAreaBreakdown?: boolean;
  /** Override heading shown above the ranking table. */
  title?: string;
  /** Override description shown below the heading. */
  description?: string;
}

const SLOT_LABELS: Record<RankSlot, string> = {
  rod: 'Rod',
  line: 'Line',
  bobber: 'Bobber',
  enchant: 'Enchant',
};

const SLOT_ORDER: RankSlot[] = ['rod', 'line', 'bobber', 'enchant'];
const LOAD_MORE_INCREMENT = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isEnchantItem(item: EquipmentItem | EnchantItem): item is EnchantItem {
  return item.category === 'enchant';
}

function SlotTable({
  slot,
  entries,
  topN,
  activeItemId,
  onPickItem,
  showPickActions,
  showAreaBreakdown,
}: {
  slot: RankSlot;
  entries: SlotRankEntry[];
  topN: number;
  activeItemId: string;
  onPickItem?: (slot: RankSlot, itemId: string, itemName: string) => void;
  showPickActions: boolean;
  showAreaBreakdown: boolean;
}) {
  const [displayOrder, setDisplayOrder] = useState<'desc' | 'asc'>('desc');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(Math.min(topN, entries.length));
  const [prevEntries, setPrevEntries] = useState(entries);
  const [prevTopN, setPrevTopN] = useState(topN);

  if (prevEntries !== entries || prevTopN !== topN) {
    setPrevEntries(entries);
    setPrevTopN(topN);
    setDisplayOrder('desc');
    setRangeStart(1);
    setRangeEnd(Math.min(topN, entries.length));
  }

  const totalEntries = entries.length;
  const normalizedStart =
    totalEntries > 0 ? clamp(Math.min(rangeStart, rangeEnd), 1, totalEntries) : 1;
  const normalizedEnd =
    totalEntries > 0 ? clamp(Math.max(rangeStart, rangeEnd), normalizedStart, totalEntries) : 0;
  const rankWindow = totalEntries > 0 ? entries.slice(normalizedStart - 1, normalizedEnd) : [];
  const displayedEntries = displayOrder === 'desc' ? rankWindow : [...rankWindow].reverse();
  const hasMore = normalizedEnd < totalEntries;
  const best = entries[0]?.expectedValuePerHour ?? 0;
  const rankById = useMemo(
    () => new Map(entries.map((entry, index) => [entry.rankingKey, index + 1])),
    [entries],
  );
  const rangeLabel =
    totalEntries > 0
      ? `第${normalizedStart}〜${normalizedEnd}位 / 全${totalEntries}件`
      : '候補なし';

  const handleTopWindow = () => {
    if (totalEntries === 0) return;
    setDisplayOrder('desc');
    setRangeStart(1);
    setRangeEnd(Math.min(topN, totalEntries));
  };

  const handleBottomWindow = () => {
    if (totalEntries === 0) return;
    const size = Math.min(topN, totalEntries);
    setDisplayOrder('asc');
    setRangeStart(totalEntries - size + 1);
    setRangeEnd(totalEntries);
  };

  const handleRangeChange = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    rawValue: string,
  ) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || totalEntries === 0) return;
    setter(clamp(Math.floor(parsed), 1, totalEntries));
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-800">{SLOT_LABELS[slot]}</h3>
          <span className="text-[10px] text-gray-400">{rangeLabel}</span>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-100 bg-gray-50/80 p-2.5">
          <button
            type="button"
            onClick={() => setDisplayOrder((order) => (order === 'desc' ? 'asc' : 'desc'))}
            className="rounded border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
            aria-label={`${SLOT_LABELS[slot]} 表示順: ${
              displayOrder === 'desc' ? 'ベスト→ワースト' : 'ワースト→ベスト'
            }`}
          >
            表示順: {displayOrder === 'desc' ? 'ベスト→ワースト' : 'ワースト→ベスト'}
          </button>

          <button
            type="button"
            onClick={handleTopWindow}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
            aria-label={`${SLOT_LABELS[slot]} の上位${topN}件を表示`}
          >
            上位{topN}
          </button>

          <button
            type="button"
            onClick={handleBottomWindow}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
            aria-label={`${SLOT_LABELS[slot]} の下位${topN}件を表示`}
          >
            下位{topN}
          </button>

          <label className="flex items-center gap-1 text-[11px] text-gray-500">
            開始
            <input
              type="number"
              min={1}
              max={Math.max(totalEntries, 1)}
              value={totalEntries > 0 ? normalizedStart : 1}
              onChange={(event) => handleRangeChange(setRangeStart, event.target.value)}
              aria-label={`${SLOT_LABELS[slot]} の開始順位`}
              className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-right text-xs text-gray-700"
            />
          </label>

          <label className="flex items-center gap-1 text-[11px] text-gray-500">
            終了
            <input
              type="number"
              min={1}
              max={Math.max(totalEntries, 1)}
              value={totalEntries > 0 ? normalizedEnd : 1}
              onChange={(event) => handleRangeChange(setRangeEnd, event.target.value)}
              aria-label={`${SLOT_LABELS[slot]} の終了順位`}
              className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-right text-xs text-gray-700"
            />
          </label>
        </div>
      </div>

      <table className="w-full table-fixed text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <th
              className={
                showPickActions
                  ? 'w-1/2 pb-1.5 text-left font-medium text-gray-500'
                  : 'w-2/3 pb-1.5 text-left font-medium text-gray-500'
              }
            >
              装備
            </th>
            <th
              className={
                showPickActions
                  ? 'w-1/6 pb-1.5 text-right font-medium text-gray-500'
                  : 'w-1/6 pb-1.5 text-right font-medium text-gray-500'
              }
            >
              期待値/時間
            </th>
            <th
              className={
                showPickActions
                  ? 'w-1/6 pb-1.5 text-right font-medium text-gray-500'
                  : 'w-1/6 pb-1.5 text-right font-medium text-gray-500'
              }
            >
              期待値/回
            </th>
            {showPickActions ? (
              <th className="w-1/6 pb-1.5 text-right font-medium text-gray-500">操作</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {displayedEntries.map((entry) => {
            const rank = rankById.get(entry.rankingKey) ?? 1;
            const isBest = rank === 1;
            const isActive = entry.item.id === activeItemId;
            const deltaVsTop = best > 0 ? ((entry.expectedValuePerHour - best) / best) * 100 : 0;

            return (
              <tr
                key={entry.rankingKey}
                className={`border-b border-gray-50 transition-colors ${
                  isActive ? 'bg-ocean-50/70' : isBest ? 'bg-green-50/40' : 'hover:bg-gray-50/60'
                }`}
              >
                <td className="py-1.5 pr-2 align-top">
                  <span
                    className={`break-words font-medium ${
                      isBest ? 'text-green-700' : isActive ? 'text-ocean-700' : 'text-gray-700'
                    }`}
                  >
                    {rank}. {entry.item.nameEn}
                  </span>
                  {isActive && (
                    <span className="ml-1.5 rounded bg-ocean-100 px-1 py-0.5 text-xs text-ocean-700">
                      現在
                    </span>
                  )}
                  {isBest && !isActive && (
                    <span className="ml-1.5 rounded bg-green-100 px-1 py-0.5 text-xs text-green-700">
                      ベスト
                    </span>
                  )}
                  {isEnchantItem(entry.item) && entry.item.rarityLabel ? (
                    <span className="ml-1 text-gray-400">({entry.item.rarityLabel})</span>
                  ) : null}
                  {showAreaBreakdown && entry.areaName ? (
                    <div className="mt-1">
                      <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        釣り場: {entry.areaName}
                      </span>
                    </div>
                  ) : null}
                </td>
                <td className="py-1.5 text-right align-top">
                  <span className={`font-semibold ${isBest ? 'text-green-700' : 'text-gray-700'}`}>
                    {formatCurrency(entry.expectedValuePerHour)}
                  </span>
                  {rank > 1 && best > 0 && (
                    <span className="ml-1 text-gray-400">({deltaVsTop.toFixed(1)}%)</span>
                  )}
                </td>
                <td className="py-1.5 text-right align-top text-gray-600">
                  {formatCurrency(entry.expectedValuePerCatch)}
                </td>
                {showPickActions ? (
                  <td className="py-1.5 pl-2 text-right align-top">
                    <button
                      type="button"
                      onClick={() => onPickItem?.(slot, entry.item.id, entry.item.nameEn)}
                      className="w-full rounded-lg border border-ocean-200 bg-ocean-50 px-2.5 py-1 text-[11px] font-medium text-ocean-700 shadow-sm transition-all duration-150 hover:border-ocean-400 hover:bg-ocean-100 hover:shadow-md active:scale-95"
                    >
                      この候補を追加
                    </button>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>

      {hasMore && (
        <button
          type="button"
          onClick={() =>
            setRangeEnd((current) => Math.min(current + LOAD_MORE_INCREMENT, totalEntries))
          }
          className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
        >
          もっと見る（残り {totalEntries - normalizedEnd} 件）
        </button>
      )}
    </div>
  );
}

export function RankingView({
  baseParams,
  topN = 5,
  focusSlot = 'rod',
  initialExpanded = false,
  alwaysOpen = false,
  onPickItem,
  showPickActions = true,
  helperText,
  includeAreaBreakdown = false,
  title,
  description,
}: RankingViewProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showOtherSlots, setShowOtherSlots] = useState(false);

  const ranked = useMemo(
    () =>
      includeAreaBreakdown ? rankAllSlotsWithAreaBreakdown(baseParams) : rankAllSlots(baseParams),
    [baseParams, includeAreaBreakdown],
  );
  const otherSlots = SLOT_ORDER.filter((slot) => slot !== focusSlot);
  const isVisible = alwaysOpen || isExpanded;
  const focusTheme = SLOT_THEME[focusSlot];

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${focusTheme.panelClassName}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">
            {title ?? `${SLOT_LABELS[focusSlot]} の候補一覧`}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {description ??
              (includeAreaBreakdown
                ? `いまの装備のまま ${SLOT_LABELS[focusSlot]} だけを変えた順位を、釣り場ごとに別行で並べています。`
                : `いまの装備のまま ${SLOT_LABELS[focusSlot]} だけを変えたときに、伸びやすい順で並べています。`)}
          </p>
        </div>
        {!alwaysOpen ? (
          <button
            onClick={() => setIsExpanded((value) => !value)}
            className="ml-4 shrink-0 rounded-lg border border-ocean-200 bg-white px-3 py-1.5 text-sm font-medium text-ocean-700 transition-colors hover:border-ocean-300 hover:bg-ocean-50"
          >
            {isExpanded ? '候補を閉じる' : '候補を見る'}
          </button>
        ) : null}
      </div>

      {isVisible && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            {helperText ??
              (showPickActions
                ? includeAreaBreakdown
                  ? '同じ候補でも、釣り場ごとに別行で並びます。気になる候補はそのまま比較に追加できます。'
                  : '上にあるほど強い候補です。気になる候補はそのまま比較に追加できます。'
                : includeAreaBreakdown
                  ? '同じ候補でも、釣り場ごとに別行で順位を追えます。'
                  : '上にあるほど強い候補です。')}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <SlotTable
              slot={focusSlot}
              entries={ranked[focusSlot]}
              topN={topN}
              activeItemId={
                focusSlot === 'rod'
                  ? baseParams.loadout.rodId
                  : focusSlot === 'line'
                    ? baseParams.loadout.lineId
                    : focusSlot === 'bobber'
                      ? baseParams.loadout.bobberId
                      : baseParams.loadout.enchantId
              }
              onPickItem={onPickItem}
              showPickActions={showPickActions}
              showAreaBreakdown={includeAreaBreakdown}
            />
          </div>

          {!alwaysOpen ? (
            <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                ほかの欄も見たいときだけ、下を開いてください。
                <button
                  type="button"
                  onClick={() => setShowOtherSlots((value) => !value)}
                  className="ml-2 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 transition-colors hover:border-ocean-300 hover:text-ocean-700"
                >
                  {showOtherSlots ? 'ほかの欄を閉じる' : 'ほかの欄も見る'}
                </button>
              </div>

              {showOtherSlots ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {otherSlots.map((slot) => (
                    <SlotTable
                      key={slot}
                      slot={slot}
                      entries={ranked[slot]}
                      topN={topN}
                      activeItemId={
                        slot === 'rod'
                          ? baseParams.loadout.rodId
                          : slot === 'line'
                            ? baseParams.loadout.lineId
                            : slot === 'bobber'
                              ? baseParams.loadout.bobberId
                              : baseParams.loadout.enchantId
                      }
                      onPickItem={onPickItem}
                      showPickActions={showPickActions}
                      showAreaBreakdown={includeAreaBreakdown}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default RankingView;
