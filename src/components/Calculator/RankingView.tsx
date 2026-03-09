'use client';

import React, { useMemo, useState } from 'react';
import { CalculatorParams, EquipmentItem, EnchantItem } from '@/types';
import { rankAllSlots, RankSlot, SlotRankEntry } from '@/lib/ranking';
import { formatCurrency } from '@/lib/calculator';

interface RankingViewProps {
  /** Base params to rank against (area, conditions, time model, etc.) */
  baseParams: CalculatorParams;
  /** Top-N entries to show per slot (default: 5) */
  topN?: number;
  /** Slot to emphasize first in the UI */
  focusSlot?: RankSlot;
  /** Expand by default */
  initialExpanded?: boolean;
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
}: {
  slot: RankSlot;
  entries: SlotRankEntry[];
  topN: number;
  activeItemId: string;
}) {
  const shown = entries.slice(0, topN);
  const best = shown[0]?.expectedValuePerHour ?? 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">{SLOT_LABELS[slot]}</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-1.5 text-left font-medium text-gray-500">装備</th>
            <th className="pb-1.5 text-right font-medium text-gray-500">EV/時間</th>
            <th className="pb-1.5 text-right font-medium text-gray-500">EV/回</th>
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
                className={`border-b border-gray-50 ${isActive ? 'bg-ocean-50' : ''}`}
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
}: RankingViewProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const ranked = useMemo(() => rankAllSlots(baseParams), [baseParams]);
  const orderedSlots = [focusSlot, ...SLOT_ORDER.filter((slot) => slot !== focusSlot)];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">スロット別ランキング</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            いま比較したい {SLOT_LABELS[focusSlot]} を先頭に、各スロットの装備を総当たりして EV/時間
            でランキングします。
            <span className="text-amber-700">experimental モデル前提</span>
            の結果です。
          </p>
        </div>
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="ml-4 shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-ocean-300 hover:text-ocean-700"
        >
          {isExpanded ? '閉じる ▲' : '表示 ▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            <strong>注意:</strong> このランキングは「他のスロットを現在の設定のままにして 1
            スロットだけ変えた場合の EV/時間」です。
            複数スロットを同時に最適化した結果ではありません。また、Luck・Big Catch など的
            experimental モデルの影響を含みます。
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {orderedSlots.map((slot) => (
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
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RankingView;
