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
import { BEST_AREA_ID, formatSignedDisplayNumber, formatWeightKg } from '@/lib/calculator';
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

type LoadoutSlot = 'rod' | 'line' | 'bobber' | 'enchant';

const LOADOUT_SLOT_LABELS: Record<LoadoutSlot, string> = {
  rod: 'Rod',
  line: 'Line',
  bobber: 'Bobber',
  enchant: 'Enchant',
};

const LOADOUT_SLOT_FIELDS: Record<LoadoutSlot, keyof CalculatorParams['loadout']> = {
  rod: 'rodId',
  line: 'lineId',
  bobber: 'bobberId',
  enchant: 'enchantId',
};

const LOADOUT_SLOT_ORDER: LoadoutSlot[] = ['rod', 'line', 'bobber', 'enchant'];

const NEXT_LOADOUT_SLOT: Record<LoadoutSlot, LoadoutSlot | null> = {
  rod: 'line',
  line: 'bobber',
  bobber: 'enchant',
  enchant: null,
};

function LoadoutSelectionBadge({ selected }: { selected: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 ${
        selected
          ? 'border-green-500 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-sm'
          : 'border-gray-300 bg-white text-gray-500 hover:border-ocean-300'
      }`}
    >
      {selected ? '✓ 使用中' : '選ぶ'}
    </span>
  );
}

function StatTableHeader({ stat }: { stat: StatThemeKey }) {
  const theme = STAT_THEME[stat];

  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold"
      style={{
        backgroundColor: theme.cardBackground,
        color: theme.surfaceText,
      }}
    >
      {theme.label}
    </span>
  );
}

function LoadoutStatCells({
  item,
  cellClassName = 'px-2 py-2 align-top text-xs font-semibold',
}: {
  item: EquipmentItem | EnchantItem;
  cellClassName?: string;
}) {
  return (
    <>
      <td className={cellClassName} style={{ color: STAT_THEME.luck.surfaceText }}>
        {formatSignedDisplayNumber(item.luck)}
      </td>
      <td className={cellClassName} style={{ color: STAT_THEME.strength.surfaceText }}>
        {formatSignedDisplayNumber(item.strength)}
      </td>
      <td className={cellClassName} style={{ color: STAT_THEME.expertise.surfaceText }}>
        {formatSignedDisplayNumber(item.expertise)}
      </td>
      <td className={cellClassName} style={{ color: STAT_THEME.attractionRate.surfaceText }}>
        {formatSignedDisplayNumber(item.attractionPct, '%')}
      </td>
      <td className={cellClassName} style={{ color: STAT_THEME.bigCatchRate.surfaceText }}>
        {formatSignedDisplayNumber(item.bigCatch)}
      </td>
      <td className={cellClassName} style={{ color: STAT_THEME.maxWeight.surfaceText }}>
        {formatWeightKg(item.maxWeightKg)}
      </td>
    </>
  );
}

function LoadoutTableHeader({
  leadingLabel,
  leadingClassName = 'px-2 py-1',
}: {
  leadingLabel: string;
  leadingClassName?: string;
}) {
  return (
    <thead>
      <tr className="text-left text-xs text-gray-600">
        <th className={leadingClassName}>{leadingLabel}</th>
        <th className="px-2 py-1">名前</th>
        <th className="px-2 py-1">入手場所 / 効果</th>
        <th className="px-2 py-1">
          <StatTableHeader stat="luck" />
        </th>
        <th className="px-2 py-1">
          <StatTableHeader stat="strength" />
        </th>
        <th className="px-2 py-1">
          <StatTableHeader stat="expertise" />
        </th>
        <th className="px-2 py-1">
          <StatTableHeader stat="attractionRate" />
        </th>
        <th className="px-2 py-1">
          <StatTableHeader stat="bigCatchRate" />
        </th>
        <th className="px-2 py-1">
          <StatTableHeader stat="maxWeight" />
        </th>
      </tr>
    </thead>
  );
}

function CurrentLoadoutTable({
  activeSlot,
  selectedIds,
  recentlyUpdatedSlot,
  onActivate,
}: {
  activeSlot: LoadoutSlot | null;
  selectedIds: Record<LoadoutSlot, string>;
  recentlyUpdatedSlot: LoadoutSlot | null;
  onActivate: (slot: LoadoutSlot) => void;
}) {
  const selectedItems: Record<LoadoutSlot, EquipmentItem | EnchantItem> = {
    rod: RODS.find((item) => item.id === selectedIds.rod) ?? RODS[0],
    line: LINES.find((item) => item.id === selectedIds.line) ?? LINES[0],
    bobber: BOBBERS.find((item) => item.id === selectedIds.bobber) ?? BOBBERS[0],
    enchant: ENCHANTS.find((item) => item.id === selectedIds.enchant) ?? ENCHANTS[0],
  };

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/80 bg-white/85 shadow-[0_20px_48px_rgba(15,23,42,0.10)]">
      <div className="border-b border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,247,255,0.95))] px-4 py-4">
        <div className="text-sm font-semibold text-gray-800">今の装備の表</div>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Rod / Line / Bobber / Enchant の行を押すと、右にその欄の候補が出ます。
        </p>
      </div>
      <div className="overflow-x-auto">
        <table
          data-testid="current-loadout-table"
          className="min-w-full border-separate border-spacing-y-2 px-3 text-sm"
        >
          <LoadoutTableHeader leadingLabel="欄" />
          <tbody>
            {LOADOUT_SLOT_ORDER.map((slot) => {
              const item = selectedItems[slot];
              const isActive = activeSlot === slot;
              const isUpdated = recentlyUpdatedSlot === slot;

              const activate = () => onActivate(slot);
              const handleKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activate();
                }
              };

              return (
                <tr
                  key={slot}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isActive}
                  aria-label={`${LOADOUT_SLOT_LABELS[slot]} を選び直す`}
                  onClick={activate}
                  onKeyDown={handleKeyDown}
                  className={`cursor-pointer outline-none transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-white via-white to-ocean-50 shadow-[0_14px_36px_rgba(37,120,232,0.14)] ring-2 ring-ocean-500 ring-offset-1'
                      : 'bg-white/70 hover:bg-ocean-50/70 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] focus:bg-white focus:ring-2 focus:ring-ocean-400 focus:ring-offset-1'
                  } ${isUpdated ? 'animate-loadout-settle' : ''}`}
                >
                  <td className="rounded-l-xl px-2 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      <SlotLabelChip slot={slot} label={LOADOUT_SLOT_LABELS[slot]} />
                      <span className="text-[11px] font-medium text-gray-500">
                        {isActive ? '右で選択中' : '押すと候補を開く'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 align-top font-semibold text-gray-900">{item.nameEn}</td>
                  <td className="px-2 py-3 align-top text-xs leading-relaxed text-gray-600">
                    {formatItemDetail(item)}
                  </td>
                  <LoadoutStatCells
                    item={item}
                    cellClassName="px-2 py-3 align-top text-xs font-semibold"
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadoutPickerPanel<T extends EquipmentItem | EnchantItem>({
  slot,
  items,
  selectedId,
  onSelect,
  onClose,
}: {
  slot: LoadoutSlot;
  items: readonly T[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const theme = SLOT_THEME[slot];

  return (
    <aside
      key={slot}
      data-testid="slot-picker-panel"
      className={`animate-slide-in-right overflow-hidden rounded-[24px] border bg-white/90 shadow-[0_24px_56px_rgba(15,23,42,0.14)] ${theme.panelClassName}`}
    >
      <div className="border-b border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(247,250,255,0.92))] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <SlotLabelChip slot={slot} label={LOADOUT_SLOT_LABELS[slot]} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Select
              </span>
            </div>
            <h4 className="mt-2 text-sm font-semibold text-gray-900">
              {LOADOUT_SLOT_LABELS[slot]} の候補を右から選ぶ
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              行のどこを押しても選べます。選ぶと、左の今の装備の表にそのまま反映されます。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-white"
          >
            閉じる
          </button>
        </div>
      </div>

      <div className="max-h-[68vh] overflow-auto px-4 py-3">
        <div className="overflow-x-auto">
          <table
            id={`loadout-picker-${slot}`}
            className="min-w-full border-separate border-spacing-y-2 text-sm"
          >
            <LoadoutTableHeader leadingLabel="選択" />
            <tbody>
              {items.map((item) => {
                const selected = item.id === selectedId;
                const selectItem = () => onSelect(item.id);
                const handleKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectItem();
                  }
                };

                return (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    aria-pressed={selected}
                    aria-label={selected ? `${item.nameEn} は使用中` : `${item.nameEn} を選ぶ`}
                    onClick={selectItem}
                    onKeyDown={handleKeyDown}
                    className={`cursor-pointer outline-none transition-all duration-150 ${
                      selected
                        ? 'bg-gradient-to-r from-green-50 to-white shadow-sm ring-2 ring-green-500 ring-offset-1'
                        : 'bg-white/70 hover:bg-ocean-50/50 hover:shadow-sm focus:bg-white focus:ring-2 focus:ring-ocean-400 focus:ring-offset-1'
                    }`}
                  >
                    <td className="rounded-l-lg px-2 py-2 align-top">
                      <LoadoutSelectionBadge selected={selected} />
                    </td>
                    <td className="px-2 py-2 align-top font-semibold text-gray-900">
                      {item.nameEn}
                    </td>
                    <td className="px-2 py-2 align-top text-xs leading-relaxed text-gray-600">
                      {formatItemDetail(item)}
                    </td>
                    <LoadoutStatCells item={item} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </aside>
  );
}

function StatCard({ stat, label, value }: { stat: StatThemeKey; label?: string; value: string }) {
  const theme = STAT_THEME[stat];

  return (
    <div
      className="rounded-lg border p-3 text-center shadow-sm"
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
            color: theme.pillText,
          }}
        >
          {label ?? theme.label}
        </span>
      </div>
      <div className="mt-2 text-sm font-bold text-gray-900">{value}</div>
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
  const [activeSlot, setActiveSlot] = React.useState<LoadoutSlot | null>('rod');
  const [recentlyUpdatedSlot, setRecentlyUpdatedSlot] = React.useState<LoadoutSlot | null>(null);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const advanceTimerRef = React.useRef<number | null>(null);
  const clearRecentUpdateTimerRef = React.useRef<number | null>(null);

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

  const handleLoadoutSelect = (slot: LoadoutSlot, value: string) => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
    }
    if (clearRecentUpdateTimerRef.current !== null) {
      window.clearTimeout(clearRecentUpdateTimerRef.current);
    }

    updateLoadout(LOADOUT_SLOT_FIELDS[slot], value);
    setRecentlyUpdatedSlot(slot);

    clearRecentUpdateTimerRef.current = window.setTimeout(() => {
      setRecentlyUpdatedSlot((current) => (current === slot ? null : current));
      clearRecentUpdateTimerRef.current = null;
    }, 720);

    advanceTimerRef.current = window.setTimeout(() => {
      const nextSlot = NEXT_LOADOUT_SLOT[slot];
      setActiveSlot(nextSlot ?? slot);
      advanceTimerRef.current = null;
    }, 220);
  };

  const activateSlot = (slot: LoadoutSlot) => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setActiveSlot(slot);
  };

  React.useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
      if (clearRecentUpdateTimerRef.current !== null) {
        window.clearTimeout(clearRecentUpdateTimerRef.current);
      }
    };
  }, []);

  const loadoutItems: Record<LoadoutSlot, readonly (EquipmentItem | EnchantItem)[]> = {
    rod: RODS,
    line: LINES,
    bobber: BOBBERS,
    enchant: ENCHANTS,
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
    <div className="space-y-5 rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-sm">
      <div className="border-b border-gray-100 pb-3">
        <h2 className="text-lg font-semibold text-gray-800">入力</h2>
        <p className="mt-1 text-sm text-gray-500">
          上から順に決めれば使えます。細かい前提は下の「詳細調整」にまとめています。
        </p>
      </div>

      <section className="animate-slide-in-up space-y-4 rounded-[24px] border border-ocean-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(147,209,252,0.35),_rgba(255,255,255,0.94)_45%,_rgba(255,255,255,0.98)_100%)] p-5 shadow-[0_16px_48px_rgba(37,120,232,0.12)]">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ocean-600 text-[10px] font-bold text-white">
              1
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-ocean-700">
              Step 1
            </span>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">まずは今の装備を表でそろえる</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            左で今の装備を見て、変えたい欄を押します。すると右にその欄の候補表が出るので、行を押して選びます。
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.98fr)]">
          <CurrentLoadoutTable
            activeSlot={activeSlot}
            selectedIds={{
              rod: params.loadout.rodId,
              line: params.loadout.lineId,
              bobber: params.loadout.bobberId,
              enchant: params.loadout.enchantId,
            }}
            recentlyUpdatedSlot={recentlyUpdatedSlot}
            onActivate={activateSlot}
          />

          <div className="min-h-[22rem]">
            {activeSlot ? (
              <LoadoutPickerPanel
                slot={activeSlot}
                items={loadoutItems[activeSlot]}
                selectedId={params.loadout[LOADOUT_SLOT_FIELDS[activeSlot]]}
                onSelect={(id) => handleLoadoutSelect(activeSlot, id)}
                onClose={() => setActiveSlot(null)}
              />
            ) : (
              <div className="animate-fade-in flex h-full min-h-[22rem] items-center justify-center rounded-[24px] border border-dashed border-white/80 bg-white/60 px-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div>
                  <div className="text-sm font-semibold text-gray-700">右に候補表を出す</div>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">
                    左の今の装備の表で、変えたい欄の行を押してください。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          data-testid="total-stats-section"
          className="overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(140deg,rgba(255,255,255,0.96),rgba(248,251,255,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_40px_rgba(15,23,42,0.08)]"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800">現在の装備の合計ステータス</div>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                いま選んでいる装備を全部足した値です。
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium shadow-sm ${
                model.enchantState === 'active'
                  ? 'border-green-200 bg-green-100/90 text-green-700'
                  : model.enchantState === 'conditional'
                    ? 'border-ocean-200 bg-ocean-100/90 text-ocean-700'
                    : 'border-gray-200 bg-gray-100/90 text-gray-600'
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
            <StatCard stat="luck" value={formatSignedDisplayNumber(model.totalStats.luck)} />
            <StatCard
              stat="strength"
              value={formatSignedDisplayNumber(model.totalStats.strength)}
            />
            <StatCard
              stat="expertise"
              value={formatSignedDisplayNumber(model.totalStats.expertise)}
            />
            <StatCard
              stat="attractionRate"
              value={formatSignedDisplayNumber(model.totalStats.attractionPct, '%')}
            />
            <StatCard
              stat="bigCatchRate"
              value={formatSignedDisplayNumber(model.totalStats.bigCatch)}
            />
            <StatCard stat="maxWeight" value={formatWeightKg(model.totalStats.maxWeightKg)} />
          </div>
        </div>
      </section>

      <section className="animate-slide-in-up space-y-4 rounded-[24px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(243,247,252,0.98))] p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-[10px] font-bold text-white">
              2
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-ocean-700">
              Step 2
            </span>
          </div>
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

      <section className="animate-slide-in-up space-y-4 rounded-[24px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(243,247,252,0.98))] p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-[10px] font-bold text-white">
              3
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-ocean-700">
              Step 3
            </span>
          </div>
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

      <div className="animate-slide-in-up rounded-[24px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(243,247,252,0.98))] p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setAdvancedOpen((current) => !current)}
          aria-expanded={advancedOpen}
          aria-controls="advanced-settings-panel"
        >
          <span className="text-sm font-semibold text-gray-800">
            細かい調整と前提
            <span className="ml-2 text-xs font-normal text-gray-500">
              より細かく詰めたいときだけ開く
            </span>
          </span>
          <span
            className={`text-gray-400 transition-transform duration-300 ${advancedOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>

        <div
          id="advanced-settings-panel"
          aria-hidden={!advancedOpen}
          className="mt-4 grid transition-[grid-template-rows,opacity] duration-300 ease-out"
          style={{
            gridTemplateRows: advancedOpen ? '1fr' : '0fr',
            opacity: advancedOpen ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-800">
                  このページが計算に使っている値
                </h3>
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
                      <label
                        htmlFor={`calc-rarity-${rarity}`}
                        className="w-24 text-xs text-gray-600"
                      >
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParameterForm;
