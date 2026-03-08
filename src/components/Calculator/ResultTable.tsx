import React from 'react';
import { DistributionResult } from '@/types';
import { formatCurrency } from '@/lib/calculator';

interface ResultTableProps {
  result: DistributionResult;
}

const RARITY_BADGE: Record<string, { label: string; className: string }> = {
  common: { label: 'コモン', className: 'bg-gray-100 text-gray-600' },
  uncommon: { label: 'アンコモン', className: 'bg-green-100 text-green-700' },
  rare: { label: 'レア', className: 'bg-blue-100 text-blue-700' },
  epic: { label: 'エピック', className: 'bg-purple-100 text-purple-700' },
  legendary: { label: 'レジェンダリー', className: 'bg-yellow-100 text-yellow-700' },
};

export function ResultTable({ result }: ResultTableProps) {
  const catchesPerHour = 3600 / Math.max(1, result.params.avgCatchTimeSec);
  const sorted = [...result.fishResults].sort((a, b) => b.probability - a.probability);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-600">
            <th className="text-left px-3 py-2 border-b font-medium">魚種</th>
            <th className="text-center px-3 py-2 border-b font-medium">レアリティ</th>
            <th className="text-right px-3 py-2 border-b font-medium">単価</th>
            <th className="text-right px-3 py-2 border-b font-medium">釣獲率</th>
            <th className="text-right px-3 py-2 border-b font-medium">期待値/回</th>
            <th className="text-right px-3 py-2 border-b font-medium">期待値/h</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const badge = RARITY_BADGE[r.fish.rarity] ?? RARITY_BADGE['common'];
            const evPerHour = r.expectedValue * catchesPerHour;
            return (
              <tr key={r.fish.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-800">{r.fish.nameJa}</div>
                  <div className="text-xs text-gray-400">{r.fish.nameEn}</div>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {r.fish.basePrice !== undefined ? `${r.fish.basePrice}G` : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={r.probability < 0.01 ? 'text-gray-400' : 'text-gray-700'}>
                    {(r.probability * 100).toFixed(2)}%
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {formatCurrency(r.expectedValue)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-ocean-700">
                  {formatCurrency(evPerHour)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-ocean-50 font-semibold">
            <td className="px-3 py-3 text-gray-700" colSpan={3}>
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
