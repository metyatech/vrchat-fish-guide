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

  return conditionParts.length > 0 ? conditionParts.join(' / ') : 'Any';
}

export function ResultTable({ result }: ResultTableProps) {
  const sorted = [...result.fishResults].sort(
    (a, b) => b.expectedValuePerHour - a.expectedValuePerHour,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
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
                  <div className="font-medium text-gray-800">{row.fish.nameEn}</div>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{formatCondition(row.fish)}</td>
                <td className="px-3 py-2 text-right text-gray-700">{formatPriceRange(row.fish)}</td>
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
  );
}

export default ResultTable;
