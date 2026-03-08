'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DistributionResult } from '@/types';

interface DistributionChartProps {
  result: DistributionResult;
  mode: 'per-catch' | 'per-hour';
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
};

export function DistributionChart({ result, mode }: DistributionChartProps) {
  const data = result.fishResults
    .filter((r) => r.probability > 0)
    .map((r) => ({
      name: r.fish.nameJa,
      rarity: r.fish.rarity,
      probability: Math.round(r.probability * 10000) / 100, // percentage
      expectedValue:
        mode === 'per-catch'
          ? r.expectedValue
          : r.expectedValue * (3600 / Math.max(1, result.params.avgCatchTimeSec)),
      price: r.fish.basePrice ?? 0,
    }))
    .sort((a, b) => b.probability - a.probability);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        データがありません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Probability chart */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-3">釣獲確率分布（%）</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-40}
              textAnchor="end"
              height={70}
            />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)}%`, '確率']}
              labelStyle={{ fontWeight: 600 }}
            />
            <Bar dataKey="probability" name="確率">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={RARITY_COLORS[entry.rarity] ?? '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expected value chart */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-3">
          {mode === 'per-catch' ? '1回あたり期待値（G）' : '1時間あたり期待値（G/h）'}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-40}
              textAnchor="end"
              height={70}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}G`, '期待値']}
              labelStyle={{ fontWeight: 600 }}
            />
            <Bar dataKey="expectedValue" name="期待値" fill="#3b96f3">
              {data.map((entry, index) => (
                <Cell key={`cell-ev-${index}`} fill={RARITY_COLORS[entry.rarity] ?? '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(RARITY_COLORS).map(([rarity, color]) => (
          <div key={rarity} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-gray-600">
              {rarity === 'common'
                ? 'コモン'
                : rarity === 'uncommon'
                  ? 'アンコモン'
                  : rarity === 'rare'
                    ? 'レア'
                    : rarity === 'epic'
                      ? 'エピック'
                      : 'レジェンダリー'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DistributionChart;
