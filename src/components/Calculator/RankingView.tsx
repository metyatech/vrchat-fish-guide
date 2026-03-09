'use client';

import React, { useMemo, useState } from 'react';
import { CalculatorParams, EquipmentItem, EnchantItem } from '@/types';
import { rankAllSlots, RankSlot, SlotRankEntry } from '@/lib/ranking';
import { formatCurrency } from '@/lib/calculator';
import { SLOT_THEME } from '@/components/Calculator/slotTheme';

interface RankingViewProps {
  /** Base params to rank against (area, conditions, time model, etc.) */
  baseParams: CalculatorParams;
  /** Top-N entries to show per slot (default: 5) */
  topN?: number;
  /** Slot to emphasize first in the UI */
  focusSlot?: RankSlot;
  /** Expand by default */
  initialExpanded?: boolean;
  /** Keep the chosen slot open in guided flows */
  alwaysOpen?: boolean;
  /** Create a comparison pattern from a ranked item */
  onPickItem?: (slot: RankSlot, itemId: string, itemName: string) => void;
}

const SLOT_LABELS: Record<RankSlot, string> = {
  rod: 'Rod',
  line: 'Line',
  bobber: 'Bobber',
  enchant: 'Enchant',
};

const SLOT_ORDER: RankSlot[] = ['rod', 'line', 'bobber', 'enchant'];

function isEnchantItem(item: EquipmentItem | EnchantItem): item is EnchantItem {
  return item.category === 'enchant';
}

function SlotTable({
  slot,
  entries,
  topN,
  activeItemId,
  onPickItem,
}: {
  slot: RankSlot;
  entries: SlotRankEntry[];
  topN: number;
  activeItemId: string;
  onPickItem?: (slot: RankSlot, itemId: string, itemName: string) => void;
}) {
  const shown = entries.slice(0, topN);
  const best = shown[0]?.expectedValuePerHour ?? 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">{SLOT_LABELS[slot]}</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-1.5 text-left font-medium text-gray-500">装備</th>
            <th className="pb-1.5 text-right font-medium text-gray-500">期待値/時間</th>
            <th className="pb-1.5 text-right font-medium text-gray-500">期待値/回</th>
            <th className="pb-1.5 text-right font-medium text-gray-500">操作</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((entry, rank) => {
            const isBest = rank === 0;
            const isActive = entry.item.id === activeItemId;
            const deltaVsTop = best > 0 ? ((entry.expectedValuePerHour - best) / best) * 100 : 0;

            return (
              <tr
                key={entry.item.id}
                className={`border-b border-gray-50 transition-colors ${
                  isActive ? 'bg-ocean-50/70' : isBest ? 'bg-green-50/40' : 'hover:bg-gray-50/60'
                }`}
              >
                <td className="py-1.5">
                  <span
                    className={`font-medium ${isBest ? 'text-green-700' : isActive ? 'text-ocean-700' : 'text-gray-700'}`}
                  >
                    {rank + 1}. {entry.item.nameEn}
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
                </td>
                <td className="py-1.5 text-right">
                  <span className={`font-semibold ${isBest ? 'text-green-700' : 'text-gray-700'}`}>
                    {formatCurrency(entry.expectedValuePerHour)}
                  </span>
                  {rank > 0 && best > 0 && (
                    <span className="ml-1 text-gray-400">({deltaVsTop.toFixed(1)}%)</span>
                  )}
                </td>
                <td className="py-1.5 text-right text-gray-600">
                  {formatCurrency(entry.expectedValuePerCatch)}
                </td>
                <td className="py-1.5 pl-3 text-right">
                  <button
                    type="button"
                    onClick={() => onPickItem?.(slot, entry.item.id, entry.item.nameEn)}
                    className="rounded-lg border border-ocean-200 bg-ocean-50 px-2.5 py-1 text-[11px] font-medium text-ocean-700 shadow-sm transition-all duration-150 hover:border-ocean-400 hover:bg-ocean-100 hover:shadow-md active:scale-95"
                  >
                    この候補を追加
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
}: RankingViewProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showOtherSlots, setShowOtherSlots] = useState(false);

  const ranked = useMemo(() => rankAllSlots(baseParams), [baseParams]);
  const otherSlots = SLOT_ORDER.filter((slot) => slot !== focusSlot);
  const isVisible = alwaysOpen || isExpanded;
  const focusTheme = SLOT_THEME[focusSlot];

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${focusTheme.panelClassName}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">
            {SLOT_LABELS[focusSlot]} の候補一覧
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            いまの装備のまま <strong>{SLOT_LABELS[focusSlot]}</strong>{' '}
            だけを変えたときに、伸びやすい順で並べています。迷ったら、上から 1 つ選べば大丈夫です。
          </p>
        </div>
        {!alwaysOpen ? (
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="ml-4 shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
          >
            {isExpanded ? '閉じる ▲' : '表示 ▼'}
          </button>
        ) : null}
      </div>

      {isVisible && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            <strong>見方:</strong>{' '}
            上にあるほど、今の条件では伸びやすい候補です。1つ押すと、その候補が比較一覧に追加されます。
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
