'use client';

import React from 'react';
import {
  CALCULATOR_RARITIES,
  FISHING_AREAS,
  RARITY_LABELS,
  TIME_OF_DAY_LABELS,
  WEATHER_TYPE_LABELS,
} from '@/data/fish';
import { CalculatorParams, Rarity, TimeOfDay, WeatherType } from '@/types';

interface ParameterFormProps {
  params: CalculatorParams;
  onChange: (params: CalculatorParams) => void;
}

const TIME_OF_DAY_HELPER: Record<TimeOfDay, string> = {
  any: 'Any',
  morning: 'Morning',
  day: 'Day',
  evening: 'Evening',
  night: 'Night',
};

const WEATHER_TYPE_HELPER: Record<WeatherType, string> = {
  any: 'Any',
  clear: 'Clear',
  rainy: 'Rainy',
  moonrain: 'Moonrain',
  stormy: 'Stormy',
  foggy: 'Foggy',
};

function parseNumberInput(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

export function ParameterForm({ params, onChange }: ParameterFormProps) {
  const handleChange = <K extends keyof CalculatorParams>(field: K, value: CalculatorParams[K]) => {
    onChange({ ...params, [field]: value });
  };

  const fieldId = {
    areaId: 'calc-area',
    timeOfDay: 'calc-time-of-day',
    weatherType: 'calc-weather-type',
    avgCatchTimeSec: 'calc-avg-catch-time',
    nothingCaughtProbability: 'calc-nothing-caught-probability',
    luckMultiplier: 'calc-luck-multiplier',
  } as const;

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="border-b pb-3 text-lg font-semibold text-gray-800">⚙️ 計算パラメータ</h2>

      <div>
        <label htmlFor={fieldId.areaId} className="mb-1 block text-sm font-medium text-gray-700">
          釣りエリア
        </label>
        <select
          id={fieldId.areaId}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          value={params.areaId}
          onChange={(event) => handleChange('areaId', event.target.value)}
        >
          {FISHING_AREAS.map((area) => (
            <option key={area.id} value={area.id}>
              {area.nameJa}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={fieldId.timeOfDay} className="mb-1 block text-sm font-medium text-gray-700">
          時間帯フィルタ
        </label>
        <select
          id={fieldId.timeOfDay}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          value={params.timeOfDay}
          onChange={(event) => handleChange('timeOfDay', event.target.value as TimeOfDay)}
        >
          {(Object.keys(TIME_OF_DAY_LABELS) as TimeOfDay[]).map((timeOfDay) => (
            <option key={timeOfDay} value={timeOfDay}>
              {TIME_OF_DAY_HELPER[timeOfDay]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          公開 community index にある条件タグで対象魚を絞り込みます。
        </p>
      </div>

      <div>
        <label
          htmlFor={fieldId.weatherType}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          天候フィルタ
        </label>
        <select
          id={fieldId.weatherType}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          value={params.weatherType}
          onChange={(event) => handleChange('weatherType', event.target.value as WeatherType)}
        >
          {(Object.keys(WEATHER_TYPE_LABELS) as WeatherType[]).map((weatherType) => (
            <option key={weatherType} value={weatherType}>
              {WEATHER_TYPE_HELPER[weatherType]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          条件一致の魚だけを対象にします。ゲーム内部の倍率ボーナス式は未対応です。
        </p>
      </div>

      <div>
        <label
          htmlFor={fieldId.avgCatchTimeSec}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          平均試行時間（秒/回）
        </label>
        <input
          id={fieldId.avgCatchTimeSec}
          type="number"
          min={1}
          max={600}
          step={5}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          value={params.avgCatchTimeSec}
          onChange={(event) =>
            handleChange(
              'avgCatchTimeSec',
              parseNumberInput(event.target.value, params.avgCatchTimeSec, 1, 600),
            )
          }
        />
        <p className="mt-1 text-xs text-gray-500">
          キャスト開始から売却可能な釣果確定までの平均時間を入れてください。
        </p>
      </div>

      <div>
        <label
          htmlFor={fieldId.nothingCaughtProbability}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          空振り確率
        </label>
        <input
          id={fieldId.nothingCaughtProbability}
          type="number"
          min={0}
          max={0.95}
          step={0.05}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          value={params.nothingCaughtProbability}
          onChange={(event) =>
            handleChange(
              'nothingCaughtProbability',
              parseNumberInput(event.target.value, params.nothingCaughtProbability, 0, 0.95),
            )
          }
        />
        <p className="mt-1 text-xs text-gray-500">
          何も釣れずに試行が終わる割合です。自己計測値があればそれを優先してください。
        </p>
      </div>

      <div>
        <label
          htmlFor={fieldId.luckMultiplier}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Luck 近似倍率
        </label>
        <input
          id={fieldId.luckMultiplier}
          type="number"
          min={0.1}
          max={5}
          step={0.1}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          value={params.luckMultiplier}
          onChange={(event) =>
            handleChange(
              'luckMultiplier',
              parseNumberInput(event.target.value, params.luckMultiplier, 0.1, 5),
            )
          }
        />
        <p className="mt-1 text-xs text-orange-600">
          実ゲームの内部式ではなく、高 rarity tier に重みを寄せる近似です。
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          レアリティ相対重みの上書き
        </label>
        <p className="mb-3 text-xs text-gray-500">
          空欄なら公開 rarity table ベースの既定相対重みを使います。入力した tier
          だけ上書きされます。
        </p>
        <div className="space-y-2">
          {CALCULATOR_RARITIES.map((rarity) => (
            <div key={rarity} className="flex items-center gap-2">
              <label htmlFor={`calc-rarity-${rarity}`} className="w-24 text-xs text-gray-600">
                {RARITY_LABELS[rarity]}
              </label>
              <input
                id={`calc-rarity-${rarity}`}
                type="number"
                min={0}
                step={0.1}
                placeholder="既定値"
                className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ocean-500"
                value={params.customRarityWeights?.[rarity] ?? ''}
                onChange={(event) => {
                  const value =
                    event.target.value === ''
                      ? undefined
                      : parseNumberInput(event.target.value, 0, 0, 9999);
                  const current = params.customRarityWeights ?? {};
                  const updated: Partial<Record<Rarity, number>> = { ...current };

                  if (value === undefined) {
                    delete updated[rarity];
                  } else {
                    updated[rarity] = value;
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
