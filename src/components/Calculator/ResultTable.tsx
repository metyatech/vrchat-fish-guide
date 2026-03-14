import React from 'react';
import { RARITY_LABELS, TIME_OF_DAY_LABELS, WEATHER_TYPE_LABELS } from '@/data/fish';
import { formatCurrency, formatPriceRange, formatWeightRange } from '@/lib/calculator';
import { DistributionResult, FishEntry } from '@/types';

interface ResultTableProps {
  result: DistributionResult;
}

const RARITY_BADGE: Record<string, { label: string; className: string }> = {
  abundant: { label: RARITY_LABELS['abundant'], className: 'bg-slate-100 text-slate-700' },
  common: { label: RARITY_LABELS['common'], className: 'bg-green-100 text-green-700' },
  curious: { label: RARITY_LABELS['curious'], className: 'bg-blue-100 text-blue-700' },
  elusive: { label: RARITY_LABELS['elusive'], className: 'bg-violet-100 text-violet-700' },
  fabled: { label: RARITY_LABELS['fabled'], className: 'bg-amber-100 text-amber-700' },
  mythic: { label: RARITY_LABELS['mythic'], className: 'bg-rose-100 text-rose-700' },
  exotic: { label: RARITY_LABELS['exotic'], className: 'bg-pink-100 text-pink-700' },
};

function formatCondition(fish: FishEntry): string {
  const conditionParts: string[] = [];

  if (fish.timeOfDay !== 'any') {
    conditionParts.push(TIME_OF_DAY_LABELS[fish.timeOfDay]);
  }

  if (fish.weatherType !== 'any') {
    conditionParts.push(WEATHER_TYPE_LABELS[fish.weatherType]);
  }

  return conditionParts.length > 0 ? conditionParts.join(' / ') : '条件なし';
}

export function ResultTable({ result }: ResultTableProps) {
  const sorted = [...result.fishResults].sort(
    (a, b) => b.expectedValuePerHour - a.expectedValuePerHour,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3 md:hidden">
        {sorted.map((row) => {
          const badge = RARITY_BADGE[row.fish.rarity] ?? {
            label: row.fish.rarity,
            className: 'bg-gray-100 text-gray-700',
          };

          return (
            <div
              key={row.fish.id}
              className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900">
                    {row.fish.nameEn}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="break-words">{formatCondition(row.fish)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">EV/h</div>
                  <div className="text-sm font-semibold text-ocean-700">
                    {formatCurrency(row.expectedValuePerHour)}
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1">
                  <span>釣獲率</span>
                  <span className="font-semibold text-gray-800">
                    {(row.probability * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1">
                  <span>期待値/回</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(row.expectedValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1">
                  <span>売値</span>
                  <span className="font-semibold text-gray-800">{formatPriceRange(row.fish)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1">
                  <span>重量</span>
                  <span className="font-semibold text-gray-800">{formatWeightRange(row.fish)}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="rounded-xl border border-ocean-200 bg-ocean-50 p-3 text-xs text-ocean-900">
          <div className="font-semibold text-gray-700">合計 / 期待値</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-700">
            <div className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-2 py-1">
              <span>釣獲率</span>
              <span className="font-semibold">
                {(result.totalFishProbability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-2 py-1">
              <span>期待値/回</span>
              <span className="font-semibold">{formatCurrency(result.expectedValuePerCatch)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-2 py-1">
              <span>期待値/h</span>
              <span className="font-semibold text-ocean-800">
                {formatCurrency(result.expectedValuePerHour)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <table className="w-full table-fixed border-collapse text-sm md:table-auto">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="border-b px-3 py-2 text-left font-medium">魚種</th>
              <th className="border-b px-3 py-2 text-center font-medium">レアリティ</th>
              <th className="border-b px-3 py-2 text-left font-medium">条件</th>
              <th className="border-b px-3 py-2 text-right font-medium">売値レンジ</th>
              <th className="border-b px-3 py-2 text-right font-medium">重量レンジ</th>
              <th className="border-b px-3 py-2 text-right font-medium">釣獲率</th>
              <th className="border-b px-3 py-2 text-right font-medium">期待値/回</th>
              <th className="border-b px-3 py-2 text-right font-medium">期待値/h</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const badge = RARITY_BADGE[row.fish.rarity] ?? {
                label: row.fish.rarity,
                className: 'bg-gray-100 text-gray-700',
              };

              return (
                <tr key={row.fish.id} className="border-b transition-colors hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="break-words font-medium text-gray-800">{row.fish.nameEn}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 break-words">
                    {formatCondition(row.fish)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {formatPriceRange(row.fish)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {formatWeightRange(row.fish)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {(row.probability * 100).toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {formatCurrency(row.expectedValue)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-ocean-700">
                    {formatCurrency(row.expectedValuePerHour)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-ocean-50 font-semibold">
              <td className="px-3 py-3 text-gray-700" colSpan={5}>
                合計 / 期待値
              </td>
              <td className="px-3 py-3 text-right text-gray-700">
                {(result.totalFishProbability * 100).toFixed(1)}%
              </td>
              <td className="px-3 py-3 text-right text-ocean-800">
                {formatCurrency(result.expectedValuePerCatch)}
              </td>
              <td className="px-3 py-3 text-right text-ocean-800">
                {formatCurrency(result.expectedValuePerHour)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default ResultTable;
