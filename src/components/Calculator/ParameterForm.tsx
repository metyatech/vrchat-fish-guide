'use client';

import React from 'react';
import { CalculatorParams } from '@/types';
import { FISHING_AREAS } from '@/data/fish';
import { Rarity } from '@/types';

interface ParameterFormProps {
  params: CalculatorParams;
  onChange: (params: CalculatorParams) => void;
}

const RARITY_LABELS: Record<Rarity, string> = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  epic: 'エピック',
  legendary: 'レジェンダリー',
};

export function ParameterForm({ params, onChange }: ParameterFormProps) {
  const handleChange = (field: keyof CalculatorParams, value: unknown) => {
    onChange({ ...params, [field]: value });
  };

  const fieldId = {
    areaId: 'calc-area',
    avgCatchTimeSec: 'calc-avg-catch-time',
    nothingCaughtProbability: 'calc-nothing-caught-probability',
    luckMultiplier: 'calc-luck-multiplier',
  } as const;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
      <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">⚙️ 計算パラメータ</h2>

      {/* Area selection */}
      <div>
        <label htmlFor={fieldId.areaId} className="block text-sm font-medium text-gray-700 mb-1">
          釣りエリア
        </label>
        <select
          id={fieldId.areaId}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          value={params.areaId}
          onChange={(e) => handleChange('areaId', e.target.value)}
        >
          {FISHING_AREAS.map((area) => (
            <option key={area.id} value={area.id}>
              {area.nameJa}
            </option>
          ))}
        </select>
      </div>

      {/* Catch time */}
      <div>
        <label
          htmlFor={fieldId.avgCatchTimeSec}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          平均釣り時間（秒/回）
          <span className="ml-2 text-xs text-gray-400 font-normal">
            ※ キャスト〜釣り上げまでの時間（自己計測値）
          </span>
        </label>
        <input
          id={fieldId.avgCatchTimeSec}
          type="number"
          min={5}
          max={600}
          step={5}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          value={params.avgCatchTimeSec}
          onChange={(e) => handleChange('avgCatchTimeSec', Number(e.target.value))}
        />
      </div>

      {/* Nothing caught probability */}
      <div>
        <label
          htmlFor={fieldId.nothingCaughtProbability}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          空振り確率（0〜0.9）
          <span className="ml-2 text-xs text-gray-400 font-normal">
            ※ 何も釣れない確率（推定値）
          </span>
        </label>
        <input
          id={fieldId.nothingCaughtProbability}
          type="number"
          min={0}
          max={0.9}
          step={0.05}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          value={params.nothingCaughtProbability}
          onChange={(e) => handleChange('nothingCaughtProbability', Number(e.target.value))}
        />
      </div>

      {/* Luck multiplier */}
      <div>
        <label
          htmlFor={fieldId.luckMultiplier}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          ラック倍率（実験的）
          <span className="ml-2 text-xs text-orange-500 font-normal">⚠️ 非公式近似モデル</span>
        </label>
        <input
          id={fieldId.luckMultiplier}
          type="number"
          min={1}
          max={5}
          step={0.1}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          value={params.luckMultiplier}
          onChange={(e) => handleChange('luckMultiplier', Number(e.target.value))}
        />
        <p className="mt-1 text-xs text-orange-600">
          実際のラック計算式は非公開のため、簡略化モデルを使用しています。参考値としてのみご利用ください。
        </p>
      </div>

      {/* Custom rarity weights */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          レアリティ別確率カスタム（オプション）
        </label>
        <p className="text-xs text-gray-500 mb-3">
          空欄の場合はデフォルトの相対重みを使用します。値を入力すると上書きされます（合計1.0推奨）。
        </p>
        <div className="space-y-2">
          {(Object.keys(RARITY_LABELS) as Rarity[]).map((rarity) => (
            <div key={rarity} className="flex items-center gap-2">
              <label htmlFor={`calc-rarity-${rarity}`} className="text-xs w-20 text-gray-600">
                {RARITY_LABELS[rarity]}
              </label>
              <input
                id={`calc-rarity-${rarity}`}
                type="number"
                min={0}
                max={1}
                step={0.01}
                placeholder="自動"
                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ocean-500"
                value={params.customRarityWeights?.[rarity] ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                  const current = params.customRarityWeights ?? {};
                  const updated = { ...current };
                  if (val === undefined) {
                    delete updated[rarity];
                  } else {
                    updated[rarity] = val;
                  }
                  handleChange(
                    'customRarityWeights',
                    Object.keys(updated).length > 0 ? updated : undefined,
                  );
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ParameterForm;
