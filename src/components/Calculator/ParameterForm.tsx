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
import { SLOT_THEME } from '@/components/Calculator/slotTheme';
import { STAT_THEME, StatThemeKey } from '@/components/Calculator/statTheme';
import { BEST_AREA_ID } from '@/lib/calculator';
import {
  CalculatorParams,
  DerivedModelSummary,
  EnchantItem,
  EquipmentItem,
  ModifierAssumptions,
  Rarity,
  TimeOfDay,
  WeatherType,
} from '@/types';

interface ParameterFormProps {
  params: CalculatorParams;
  model: DerivedModelSummary;
  onChange: (params: CalculatorParams) => void;
}

const TIME_OF_DAY_HELPER: Record<TimeOfDay, string> = {
  any: '自動で平均する',
  morning: 'Morning',
  day: 'Day',
  evening: 'Evening',
  night: 'Night',
};

const WEATHER_TYPE_HELPER: Record<WeatherType, string> = {
  any: '自動で平均する',
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

function formatSignedStat(value: number, suffix = ''): string {
  if (value === 0) return `0${suffix}`;
  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

function formatItemOption(
  name: string,
  stats: {
    luck: number;
    strength: number;
    expertise: number;
    attractionPct: number;
    bigCatch: number;
    maxWeightKg: number;
  },
): string {
  return `${name} | Luck ${stats.luck >= 0 ? '+' : ''}${stats.luck} | Strength ${
    stats.strength >= 0 ? '+' : ''
  }${stats.strength} | Expertise ${stats.expertise >= 0 ? '+' : ''}${stats.expertise} | Attraction Rate ${
    stats.attractionPct >= 0 ? '+' : ''
  }${stats.attractionPct}% | Big Catch Rate ${stats.bigCatch >= 0 ? '+' : ''}${stats.bigCatch} | Max Weight ${stats.maxWeightKg}kg`;
}

function StatMiniCard({ stat, value }: { stat: StatThemeKey; value: string }) {
  const theme = STAT_THEME[stat];

  return (
    <div
      className="rounded-lg border px-2 py-1.5"
      style={{
        borderColor: theme.cardBorder,
        backgroundColor: theme.cardBackground,
      }}
    >
      <div className="text-[11px] font-semibold" style={{ color: theme.accentText }}>
        {theme.label}
      </div>
      <div className="mt-0.5 text-xs font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function ItemStatGrid({ item }: { item: EquipmentItem | EnchantItem }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <StatMiniCard stat="luck" value={formatSignedStat(item.luck)} />
      <StatMiniCard stat="strength" value={formatSignedStat(item.strength)} />
      <StatMiniCard stat="expertise" value={formatSignedStat(item.expertise)} />
      <StatMiniCard stat="attractionRate" value={formatSignedStat(item.attractionPct, '%')} />
      <StatMiniCard stat="bigCatchRate" value={formatSignedStat(item.bigCatch)} />
      <StatMiniCard stat="maxWeight" value={`${item.maxWeightKg.toLocaleString()}kg`} />
    </div>
  );
}

function formatItemDetail(item: EquipmentItem | EnchantItem): string {
  if ('specialEffect' in item) {
    if (item.id === 'no-enchant') {
      return '追加効果なし';
    }
    const activation =
      item.activationTime === 'day'
        ? '昼だけ有効'
        : item.activationTime === 'night'
          ? '夜だけ有効'
          : item.activationWeather === 'rainy'
            ? 'Rainy で有効'
            : item.activationWeather === 'foggy'
              ? 'Foggy で有効'
              : 'いつでも有効';
    return `${activation} / ${item.specialEffect}`;
  }

  if (item.price <= 0) {
    return item.location;
  }

  return `${item.location} / ${item.price.toLocaleString()}G`;
}

function LoadoutOptionCard<T extends EquipmentItem | EnchantItem>({
  slot,
  item,
  selected,
  onSelect,
}: {
  slot: 'rod' | 'line' | 'bobber' | 'enchant';
  item: T;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const theme = SLOT_THEME[slot];

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={formatItemOption(item.nameEn, item)}
      onClick={() => onSelect(item.id)}
      className={`w-72 shrink-0 snap-start rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-ocean-500 ${
        selected
          ? `${theme.panelClassName} border-current shadow-sm`
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">{item.nameEn}</div>
          <div className="mt-1 text-xs leading-relaxed text-gray-600">{formatItemDetail(item)}</div>
        </div>
        {selected ? (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${theme.chipClassName}`}
          >
            使用中
          </span>
        ) : null}
      </div>
      <ItemStatGrid item={item} />
    </button>
  );
}

function LoadoutPickerSection<T extends EquipmentItem | EnchantItem>({
  slot,
  label,
  items,
  selectedId,
  onSelect,
}: {
  slot: 'rod' | 'line' | 'bobber' | 'enchant';
  label: string;
  items: readonly T[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={`rounded-xl border p-3 ${SLOT_THEME[slot].panelClassName}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <SlotLabelChip slot={slot} label={label} />
        <span className="text-[11px] text-gray-500">横にスクロールして見比べる</span>
      </div>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {items.map((item) => (
          <LoadoutOptionCard
            key={item.id}
            slot={slot}
            item={item}
            selected={item.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({ stat, label, value }: { stat: StatThemeKey; label?: string; value: string }) {
  const theme = STAT_THEME[stat];

  return (
    <div
      className="rounded-lg border p-3 text-center"
      style={{
        borderColor: theme.cardBorder,
        backgroundColor: theme.cardBackground,
      }}
    >
      <div className="flex justify-center">
        <span
          className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{
            backgroundColor: theme.accent,
            color: theme.accentText,
          }}
        >
          {label ?? theme.label}
        </span>
      </div>
      <div className="mt-2 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function SlotLabelChip({
  slot,
  label,
}: {
  slot: 'rod' | 'line' | 'bobber' | 'enchant';
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${SLOT_THEME[slot].chipClassName}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${SLOT_THEME[slot].dotClassName}`}
        aria-hidden="true"
      />
      {label}
    </span>
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
    timeOfDay: 'calc-time-of-day',
    weatherType: 'calc-weather-type',
    castTimeSec: 'calc-cast-time',
    hookReactionTimeSec: 'calc-hook-reaction-time',
    playerMistakeRate: 'calc-player-mistake-rate',
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
          <h3 className="text-sm font-semibold text-gray-800">まずは今の装備</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            各候補をカードで見比べながら選べます。今の装備に近いものをそのまま押してください。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LoadoutPickerSection
            slot="rod"
            label="Rod"
            items={RODS}
            selectedId={params.loadout.rodId}
            onSelect={(id) => updateLoadout('rodId', id)}
          />
          <LoadoutPickerSection
            slot="line"
            label="Line"
            items={LINES}
            selectedId={params.loadout.lineId}
            onSelect={(id) => updateLoadout('lineId', id)}
          />
          <LoadoutPickerSection
            slot="bobber"
            label="Bobber"
            items={BOBBERS}
            selectedId={params.loadout.bobberId}
            onSelect={(id) => updateLoadout('bobberId', id)}
          />
          <LoadoutPickerSection
            slot="enchant"
            label="Enchant"
            items={ENCHANTS}
            selectedId={params.loadout.enchantId}
            onSelect={(id) => updateLoadout('enchantId', id)}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800">現在の装備の合計ステータス</div>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                いま選んでいる装備を全部足した値です。
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                model.enchantState === 'active'
                  ? 'bg-green-100 text-green-700'
                  : model.enchantState === 'conditional'
                    ? 'bg-ocean-100 text-ocean-700'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              {model.enchantStatusText ?? 'No Enchant selected'}
            </span>
          </div>

          {model.inactiveEnchantReason ? (
            <p className="mb-3 text-xs leading-relaxed text-amber-700">
              {model.inactiveEnchantReason}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <StatCard stat="luck" value={formatSignedStat(model.totalStats.luck)} />
            <StatCard stat="strength" value={formatSignedStat(model.totalStats.strength)} />
            <StatCard stat="expertise" value={formatSignedStat(model.totalStats.expertise)} />
            <StatCard
              stat="attractionRate"
              value={formatSignedStat(model.totalStats.attractionPct, '%')}
            />
            <StatCard stat="bigCatchRate" value={formatSignedStat(model.totalStats.bigCatch)} />
            <StatCard
              stat="maxWeight"
              value={`${model.totalStats.maxWeightKg.toLocaleString()}kg`}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ocean-700">Step 2</div>
          <h3 className="text-sm font-semibold text-gray-800">必要なら、場所と条件を絞る</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            何も変えなければ、Fishing Area は自動選択、Time of Day と Weather は自動平均です。
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
            <option value={BEST_AREA_ID}>自動で一番よい場所を選ぶ</option>
            {FISHING_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.nameEn}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            初期状態では、今の装備ごとに期待値/時間が最も高い Fishing Area を自動で選びます。
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
            <p className="mt-1 text-xs text-gray-500">
              自動で平均する を選ぶと、Morning / Day / Evening / Night を平均して計算します。
            </p>
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
            <p className="mt-1 text-xs text-gray-500">
              自動で平均する を選ぶと、Clear / Rainy / Moonrain / Stormy / Foggy
              を平均して計算します。
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ocean-700">Step 3</div>
          <h3 className="text-sm font-semibold text-gray-800">あなたのプレイ速度</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            基本は装備ステータスから自動で見積もります。ここでは、自分の癖だけ少し足し引きします。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor={fieldId.castTimeSec}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              投げてから着水まで (sec)
            </label>
            <input
              id={fieldId.castTimeSec}
              type="number"
              min={0}
              max={15}
              step={0.1}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              value={params.castTimeSec}
              onChange={(event) =>
                handleChange(
                  'castTimeSec',
                  parseNumberInput(event.target.value, params.castTimeSec, 0, 15),
                )
              }
            />
          </div>

          <div>
            <label
              htmlFor={fieldId.hookReactionTimeSec}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              `!` が出てから反応するまで (sec)
            </label>
            <input
              id={fieldId.hookReactionTimeSec}
              type="number"
              min={0}
              max={10}
              step={0.05}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              value={params.hookReactionTimeSec}
              onChange={(event) =>
                handleChange(
                  'hookReactionTimeSec',
                  parseNumberInput(event.target.value, params.hookReactionTimeSec, 0, 10),
                )
              }
            />
          </div>

          <div>
            <label
              htmlFor={fieldId.playerMistakeRate}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              プレイミスの多さ
            </label>
            <input
              id={fieldId.playerMistakeRate}
              type="number"
              min={0}
              max={0.95}
              step={0.01}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              value={params.playerMistakeRate}
              onChange={(event) =>
                handleChange(
                  'playerMistakeRate',
                  parseNumberInput(event.target.value, params.playerMistakeRate, 0, 0.95),
                )
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-xs leading-relaxed text-gray-600">
          <div className="mb-2 font-semibold text-gray-800">
            この装備の組み合わせでの自動見積もり
          </div>
          <ul className="space-y-1">
            <li>• 投げてから着水まで: {model.effectiveCastTimeSec?.toFixed(2) ?? '—'} sec</li>
            <li>
              • 着水してから `!` が出るまで: {model.effectiveBiteTimeSec?.toFixed(2) ?? '—'} sec
            </li>
            <li>
              • `!` が出てから反応するまで: {model.effectiveHookReactionTimeSec?.toFixed(2) ?? '—'}{' '}
              sec
            </li>
            <li>• ミニゲーム時間: {model.effectiveMinigameTimeSec?.toFixed(2) ?? '—'} sec</li>
            <li>• 逃がしやすさ: {(model.effectiveMissRate * 100).toFixed(1)}%</li>
          </ul>
        </div>
      </section>

      <details className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-gray-800">
          細かい調整と前提
          <span className="ml-2 text-xs font-normal text-gray-500">
            より細かく詰めたいときだけ開く
          </span>
        </summary>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800">このページが計算に使っている値</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              上の入力から、このページが実際に計算へ入れている値です。公開情報で確認できている部分と、まだ推定の部分を分けて表示しています。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard
                stat="luck"
                label="Luck 補正"
                value={`${model.effectiveLuckMultiplier.toFixed(2)}x`}
              />
              <StatCard
                stat="strength"
                label="逃がしやすさ"
                value={`${(model.effectiveMissRate * 100).toFixed(1)}%`}
              />
              <StatCard
                stat="expertise"
                label="1回にかかる時間"
                value={`${model.effectiveAvgCatchTimeSec.toFixed(1)}s`}
              />
              <StatCard
                stat="bigCatchRate"
                label="重さの寄り方"
                value={`${(model.weightPercentile * 100).toFixed(0)}%`}
              />
              {model.modifierEvFactor !== 1 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                  <div className="text-xs font-medium text-gray-500">見た目・サイズ補正</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {model.modifierEvFactor.toFixed(3)}x
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-4 space-y-3 text-xs leading-relaxed">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
                <div className="mb-1 font-semibold">公開データで確認できている部分</div>
                <ul className="space-y-1">
                  {model.supportedNotes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <div className="mb-1 font-semibold">まだ推定で入れている部分</div>
                <ul className="space-y-1">
                  {model.experimentalNotes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </div>
              {model.unsupportedNotes.length > 0 ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                  <div className="mb-1 font-semibold">まだ計算に入れていない特殊効果</div>
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
              <h3 className="text-sm font-semibold text-gray-800">見た目・サイズ補正</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                見た目やサイズの追加効果を、期待値に入れるかどうかを決めます。
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              <div className="font-semibold">この項目はまだ推定です</div>
              <p>
                コミュニティの観測値と、このサイトの近似を組み合わせています。ゲーム内部の正確式は確認されていません。
              </p>
              <ul className="space-y-1">
                <li>• 何らかの追加効果が付く割合 ≈ 22.5%</li>
                <li>• P(外見のみ) ≈ 7.5%</li>
                <li>• P(サイズのみ) ≈ 10%</li>
                <li>• P(両方) ≈ 5%</li>
                <li>• 見た目の追加効果 23 種の平均倍率 ≈ 2.404x</li>
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
                見た目・サイズの補正を期待値に含める
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
                    Cursed を Blessed として扱う
                  </label>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                  見た目・サイズ補正:{' '}
                  <span className="font-semibold text-amber-700">
                    {model.modifierEvFactor.toFixed(3)}x
                  </span>
                </div>
              </>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              レア度ごとの出やすさを手動で変える
            </label>
            <p className="mb-3 text-xs text-gray-500">
              空欄なら標準設定です。必要なレア度だけ変えられます。
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
