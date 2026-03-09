'use client';

import React from 'react';
import {
  CALCULATOR_RARITIES,
  FISHING_AREAS,
  RARITY_LABELS,
  TIME_OF_DAY_LABELS,
  WEATHER_TYPE_LABELS,
} from '@/data/fish';
import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import {
  CalculatorParams,
  DerivedModelSummary,
  ModifierAssumptions,
  Rarity,
  TimeModelMode,
  TimeOfDay,
  WeatherType,
} from '@/types';

interface ParameterFormProps {
  params: CalculatorParams;
  model: DerivedModelSummary;
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

const TIME_MODEL_LABELS: Record<TimeModelMode, string> = {
  observed: 'Observed values',
  estimated: 'Estimated from equipment',
};

function parseNumberInput(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function formatSignedStat(value: number, suffix = ''): string {
  if (value === 0) return `0${suffix}`;
  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-800">{value}</div>
    </div>
  );
}

export function ParameterForm({ params, model, onChange }: ParameterFormProps) {
  const handleChange = <K extends keyof CalculatorParams>(field: K, value: CalculatorParams[K]) => {
    onChange({ ...params, [field]: value });
  };

  const updateLoadout = <K extends keyof CalculatorParams['loadout']>(
    field: K,
    value: CalculatorParams['loadout'][K],
  ) => {
    onChange({
      ...params,
      loadout: {
        ...params.loadout,
        [field]: value,
      },
    });
  };

  const fieldId = {
    areaId: 'calc-area',
    rodId: 'calc-rod',
    lineId: 'calc-line',
    bobberId: 'calc-bobber',
    enchantId: 'calc-enchant',
    timeOfDay: 'calc-time-of-day',
    weatherType: 'calc-weather-type',
    timeModelMode: 'calc-time-model',
    observedAvgCatchTimeSec: 'calc-observed-avg-catch-time',
    observedMissRate: 'calc-observed-miss-rate',
    baseBiteTimeSec: 'calc-base-bite-time',
    baseMinigameTimeSec: 'calc-base-minigame-time',
    baseMissRate: 'calc-base-miss-rate',
  } as const;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="border-b pb-3">
        <h2 className="text-lg font-semibold text-gray-800">入力</h2>
        <p className="mt-1 text-sm text-gray-500">
          上から順に決めれば使えます。細かい前提は下の「詳細調整」にまとめています。
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-ocean-100 bg-ocean-50 p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ocean-700">Step 1</div>
          <h3 className="text-sm font-semibold text-gray-800">Area と現在の装備</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            まずここだけ決めれば比較を始められます。期待値に一番強く効くのは Fishing Area と Loadout
            です。
          </p>
        </div>

        <div>
          <label htmlFor={fieldId.areaId} className="mb-1 block text-sm font-medium text-gray-700">
            Fishing Area
          </label>
          <select
            id={fieldId.areaId}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
            value={params.areaId}
            onChange={(event) => handleChange('areaId', event.target.value)}
          >
            {FISHING_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={fieldId.rodId} className="mb-1 block text-sm font-medium text-gray-700">
              Rod
            </label>
            <select
              id={fieldId.rodId}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              value={params.loadout.rodId}
              onChange={(event) => updateLoadout('rodId', event.target.value)}
            >
              {RODS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={fieldId.lineId}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Line
            </label>
            <select
              id={fieldId.lineId}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              value={params.loadout.lineId}
              onChange={(event) => updateLoadout('lineId', event.target.value)}
            >
              {LINES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={fieldId.bobberId}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Bobber
            </label>
            <select
              id={fieldId.bobberId}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              value={params.loadout.bobberId}
              onChange={(event) => updateLoadout('bobberId', event.target.value)}
            >
              {BOBBERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={fieldId.enchantId}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Enchant
            </label>
            <select
              id={fieldId.enchantId}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              value={params.loadout.enchantId}
              onChange={(event) => updateLoadout('enchantId', event.target.value)}
            >
              {ENCHANTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800">Total Stats</div>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                現在の装備で合算される値です。
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                model.enchantActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {model.enchantActive ? 'Enchant active' : 'Enchant inactive'}
            </span>
          </div>

          {model.inactiveEnchantReason ? (
            <p className="mb-3 text-xs leading-relaxed text-amber-700">
              {model.inactiveEnchantReason}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <StatCard label="Luck" value={formatSignedStat(model.totalStats.luck)} />
            <StatCard label="Strength" value={formatSignedStat(model.totalStats.strength)} />
            <StatCard label="Expertise" value={formatSignedStat(model.totalStats.expertise)} />
            <StatCard
              label="Attraction"
              value={formatSignedStat(model.totalStats.attractionPct, '%')}
            />
            <StatCard label="Big Catch" value={formatSignedStat(model.totalStats.bigCatch)} />
            <StatCard
              label="Max Weight"
              value={`${model.totalStats.maxWeightKg.toLocaleString()}kg`}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ocean-700">Step 2</div>
          <h3 className="text-sm font-semibold text-gray-800">いまの釣り条件</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            Time of Day と Weather は魚の候補と、一部 Enchant の有効判定を変えます。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor={fieldId.timeOfDay}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Time of Day
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
          </div>

          <div>
            <label
              htmlFor={fieldId.weatherType}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Weather
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
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ocean-700">Step 3</div>
          <h3 className="text-sm font-semibold text-gray-800">あなたのプレイ速度</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            分かるなら実測値を入れてください。分からなければデフォルトのままでも比較はできます。
          </p>
        </div>

        <div>
          <label
            htmlFor={fieldId.timeModelMode}
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Time model
          </label>
          <select
            id={fieldId.timeModelMode}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
            value={params.timeModelMode}
            onChange={(event) => handleChange('timeModelMode', event.target.value as TimeModelMode)}
          >
            {(Object.keys(TIME_MODEL_LABELS) as TimeModelMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {TIME_MODEL_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>

        {params.timeModelMode === 'observed' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor={fieldId.observedAvgCatchTimeSec}
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Observed average catch time (sec/attempt)
              </label>
              <input
                id={fieldId.observedAvgCatchTimeSec}
                type="number"
                min={1}
                max={600}
                step={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                value={params.observedAvgCatchTimeSec}
                onChange={(event) =>
                  handleChange(
                    'observedAvgCatchTimeSec',
                    parseNumberInput(event.target.value, params.observedAvgCatchTimeSec, 1, 600),
                  )
                }
              />
            </div>

            <div>
              <label
                htmlFor={fieldId.observedMissRate}
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Observed miss rate
              </label>
              <input
                id={fieldId.observedMissRate}
                type="number"
                min={0}
                max={0.95}
                step={0.05}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                value={params.observedMissRate}
                onChange={(event) =>
                  handleChange(
                    'observedMissRate',
                    parseNumberInput(event.target.value, params.observedMissRate, 0, 0.95),
                  )
                }
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label
                  htmlFor={fieldId.baseBiteTimeSec}
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Base bite wait (sec)
                </label>
                <input
                  id={fieldId.baseBiteTimeSec}
                  type="number"
                  min={1}
                  max={300}
                  step={1}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  value={params.baseBiteTimeSec}
                  onChange={(event) =>
                    handleChange(
                      'baseBiteTimeSec',
                      parseNumberInput(event.target.value, params.baseBiteTimeSec, 1, 300),
                    )
                  }
                />
              </div>

              <div>
                <label
                  htmlFor={fieldId.baseMinigameTimeSec}
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Base minigame time (sec)
                </label>
                <input
                  id={fieldId.baseMinigameTimeSec}
                  type="number"
                  min={1}
                  max={300}
                  step={1}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  value={params.baseMinigameTimeSec}
                  onChange={(event) =>
                    handleChange(
                      'baseMinigameTimeSec',
                      parseNumberInput(event.target.value, params.baseMinigameTimeSec, 1, 300),
                    )
                  }
                />
              </div>

              <div>
                <label
                  htmlFor={fieldId.baseMissRate}
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Base miss rate
                </label>
                <input
                  id={fieldId.baseMissRate}
                  type="number"
                  min={0}
                  max={0.95}
                  step={0.05}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  value={params.baseMissRate}
                  onChange={(event) =>
                    handleChange(
                      'baseMissRate',
                      parseNumberInput(event.target.value, params.baseMissRate, 0, 0.95),
                    )
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-xs leading-relaxed text-gray-600">
              <div className="mb-2 font-semibold text-gray-800">この装備での推定値</div>
              <ul className="space-y-1">
                <li>• Effective bite wait: {model.effectiveBiteTimeSec?.toFixed(1) ?? '—'} sec</li>
                <li>
                  • Effective minigame time: {model.effectiveMinigameTimeSec?.toFixed(1) ?? '—'} sec
                </li>
                <li>• Effective miss rate: {(model.effectiveMissRate * 100).toFixed(1)}%</li>
              </ul>
            </div>
          </div>
        )}
      </section>

      <details className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-gray-800">
          詳細調整
          <span className="ml-2 text-xs font-normal text-gray-500">
            より細かく詰めたいときだけ開く
          </span>
        </summary>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800">Derived model</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              期待値計算に実際に入る派生係数です。supported と experimental を分けて表示しています。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard
                label="Luck multiplier"
                value={`${model.effectiveLuckMultiplier.toFixed(2)}x`}
              />
              <StatCard
                label="Effective miss rate"
                value={`${(model.effectiveMissRate * 100).toFixed(1)}%`}
              />
              <StatCard
                label="Effective attempt time"
                value={`${model.effectiveAvgCatchTimeSec.toFixed(1)}s`}
              />
              <StatCard
                label="Weight percentile"
                value={`${(model.weightPercentile * 100).toFixed(0)}%`}
              />
              {model.modifierEvFactor !== 1 ? (
                <StatCard
                  label="Modifier EV factor"
                  value={`${model.modifierEvFactor.toFixed(3)}x`}
                />
              ) : null}
            </div>
            <div className="mt-4 space-y-3 text-xs leading-relaxed">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
                <div className="mb-1 font-semibold">Supported</div>
                <ul className="space-y-1">
                  {model.supportedNotes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <div className="mb-1 font-semibold">Experimental</div>
                <ul className="space-y-1">
                  {model.experimentalNotes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </div>
              {model.unsupportedNotes.length > 0 ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                  <div className="mb-1 font-semibold">Ignored special effects</div>
                  <ul className="space-y-1">
                    {model.unsupportedNotes.map((note) => (
                      <li key={note}>• {note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Modifier assumptions</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                外見・サイズ modifier の期待値補正を入れるかどうかを調整します。
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              <div className="font-semibold">この項目は experimental です</div>
              <p>
                コミュニティ観測値と、このサイトの近似仮定を組み合わせています。ゲーム内部の公式計算式は確認されていません。
              </p>
              <ul className="space-y-1">
                <li>• P(any modifier) ≈ 22.5%</li>
                <li>• P(外見のみ) ≈ 7.5%</li>
                <li>• P(サイズのみ) ≈ 10%</li>
                <li>• P(両方) ≈ 5%</li>
                <li>• 外見 modifier 23 種の平均倍率 ≈ 2.404x</li>
                <li>• Huge は ×1.5、Tiny は ×1.0 と仮定</li>
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="modifier-include"
                type="checkbox"
                checked={params.modifierAssumptions.includeModifiers}
                onChange={(event) =>
                  handleChange('modifierAssumptions', {
                    ...params.modifierAssumptions,
                    includeModifiers: event.target.checked,
                  } as ModifierAssumptions)
                }
              />
              <label htmlFor="modifier-include" className="text-sm text-gray-700">
                Modifier EV を期待値に含める
              </label>
            </div>

            {params.modifierAssumptions.includeModifiers ? (
              <>
                <div className="flex items-center gap-3">
                  <input
                    id="modifier-cursed-to-blessed"
                    type="checkbox"
                    checked={params.modifierAssumptions.assumeCursedToBlessed}
                    onChange={(event) =>
                      handleChange('modifierAssumptions', {
                        ...params.modifierAssumptions,
                        assumeCursedToBlessed: event.target.checked,
                      } as ModifierAssumptions)
                    }
                  />
                  <label htmlFor="modifier-cursed-to-blessed" className="text-sm text-gray-700">
                    Cursed → Blessed を適用する
                  </label>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                  Modifier EV factor:{' '}
                  <span className="font-semibold text-amber-700">
                    {model.modifierEvFactor.toFixed(3)}x
                  </span>
                </div>
              </>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Rarity weight override
            </label>
            <p className="mb-3 text-xs text-gray-500">
              空欄なら既定値です。必要な rarity だけ上書きできます。
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
                    placeholder="default"
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
      </details>
    </div>
  );
}

export default ParameterForm;
