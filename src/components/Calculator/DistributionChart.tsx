'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RARITY_COLORS, RARITY_LABELS } from '@/data/fish';
import { DistributionResult } from '@/types';

interface DistributionChartProps {
  result: DistributionResult;
  mode: 'per-catch' | 'per-hour';
}

export function DistributionChart({ result, mode }: DistributionChartProps) {
  const data = result.fishResults
    .filter((row) => row.probability > 0)
    .map((row) => ({
      name: row.fish.nameJa,
      rarity: row.fish.rarity,
      probability: Math.round(row.probability * 10000) / 100,
      expectedValue: mode === 'per-catch' ? row.expectedValue : row.expectedValuePerHour,
    }))
    .sort((a, b) => b.probability - a.probability);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        データがありません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-600">釣獲確率分布（%）</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-40}
              textAnchor="end"
              height={70}
            />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <Tooltip
              formatter={(value) =>
                value != null ? [`${Number(value).toFixed(2)}%`, '確率'] : ['', '確率']
              }
              labelStyle={{ fontWeight: 600 }}
            />
            <Bar dataKey="probability" name="確率">
              {data.map((entry, index) => (
                <Cell
                  key={`probability-cell-${index}`}
                  fill={RARITY_COLORS[entry.rarity] ?? '#94a3b8'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-600">
          {mode === 'per-catch' ? '1回あたり期待値（G）' : '1時間あたり期待値（G/h）'}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-40}
              textAnchor="end"
              height={70}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) =>
                value != null ? [`${Number(value).toFixed(1)}G`, '期待値'] : ['', '期待値']
              }
              labelStyle={{ fontWeight: 600 }}
            />
            <Bar dataKey="expectedValue" name="期待値">
              {data.map((entry, index) => (
                <Cell
                  key={`expected-value-cell-${index}`}
                  fill={RARITY_COLORS[entry.rarity] ?? '#94a3b8'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {(Object.entries(RARITY_LABELS) as Array<[keyof typeof RARITY_LABELS, string]>)
          .filter(([rarity]) => data.some((entry) => entry.rarity === rarity))
          .map(([rarity, label]) => (
            <div key={rarity} className="flex items-center gap-1">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: RARITY_COLORS[rarity] ?? '#94a3b8' }}
              />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default DistributionChart;
