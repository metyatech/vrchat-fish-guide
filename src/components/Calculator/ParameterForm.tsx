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
import { STAT_THEME, STAT_THEME_ORDER, StatThemeKey } from '@/components/Calculator/statTheme';
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

function getItemStatValue(item: EquipmentItem | EnchantItem, stat: StatThemeKey): number {
  switch (stat) {
    case 'luck':
      return item.luck;
    case 'strength':
      return item.strength;
    case 'expertise':
      return item.expertise;
    case 'attractionRate':
      return item.attractionPct;
    case 'bigCatchRate':
      return item.bigCatch;
    case 'maxWeight':
      return item.maxWeightKg;
  }
}

function formatItemStatValue(item: EquipmentItem | EnchantItem, stat: StatThemeKey): string {
  const value = getItemStatValue(item, stat);
  if (stat === 'maxWeight') {
    return formatWeightKg(value);
  }
  if (stat === 'attractionRate') {
    return formatSignedDisplayNumber(value, '%');
  }
  return formatSignedDisplayNumber(value);
}

function getHighlightedStats(item: EquipmentItem | EnchantItem): StatThemeKey[] {
  const stats = STAT_THEME_ORDER.filter((stat) => {
    const value = getItemStatValue(item, stat);
    if (stat === 'maxWeight') {
      return value > 0;
    }
    return Math.abs(value) > 0.001;
  });
  return stats.length > 0 ? stats.slice(0, 3) : ['expertise'];
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

const LOADOUT_STAT_COLUMN_ORDER: StatThemeKey[] = [
  'luck',
  'strength',
  'expertise',
  'attractionRate',
  'bigCatchRate',
  'maxWeight',
];

/** Slot-specific active row class on the dark loadout board. ring-{color}-400 must be present for ui-quality tests. */
const SLOT_ACTIVE_ROW_CLASS: Record<LoadoutSlot, string> = {
  rod: 'relative ring-2 ring-amber-400 shadow-[0_18px_36px_rgba(245,158,11,0.18)] before:absolute before:inset-y-4 before:left-0 before:w-1.5 before:rounded-r-full before:bg-amber-400',
  line: 'relative ring-2 ring-sky-400 shadow-[0_18px_36px_rgba(56,189,248,0.18)] before:absolute before:inset-y-4 before:left-0 before:w-1.5 before:rounded-r-full before:bg-sky-400',
  bobber:
    'relative ring-2 ring-rose-400 shadow-[0_18px_36px_rgba(251,113,133,0.18)] before:absolute before:inset-y-4 before:left-0 before:w-1.5 before:rounded-r-full before:bg-rose-400',
  enchant:
    'relative ring-2 ring-violet-400 shadow-[0_18px_36px_rgba(167,139,250,0.18)] before:absolute before:inset-y-4 before:left-0 before:w-1.5 before:rounded-r-full before:bg-violet-400',
};

/** Badge shown in the inventory picker. Must have whitespace-nowrap for tests. */
function LoadoutSelectionBadge({ selected }: { selected: boolean }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 ${
        selected
          ? 'border-green-500 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[0_6px_18px_rgba(34,197,94,0.35)] ring-2 ring-green-300/60'
          : 'border-slate-300 bg-white text-slate-500 hover:border-ocean-300'
      }`}
    >
      {selected ? '✓ 使用中' : '選択'}
    </span>
  );
}

function StatBadge({ stat, value }: { stat: StatThemeKey; value: string }) {
  const theme = STAT_THEME[stat];

  return (
    <span
      className="inline-flex items-center justify-between gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
      style={{
        backgroundColor: theme.cardBackground,
        color: theme.surfaceText,
      }}
    >
      <span className="opacity-70">{theme.shortLabel}</span>
      <span className="text-[11px] font-bold">{value}</span>
    </span>
  );
}

function StatCard({ stat, label, value }: { stat: StatThemeKey; label?: string; value: string }) {
  const theme = STAT_THEME[stat];

  return (
    <div
      className="rounded-xl border p-3 text-center shadow-sm"
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

/** Slot label chip. Pass dark=true for use on slate-900 dark loadout board. */
function SlotLabelChip({
  slot,
  label,
  dark = false,
}: {
  slot: 'rod' | 'line' | 'bobber' | 'enchant';
  label: string;
  dark?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        dark ? SLOT_THEME[slot].boardChipClassName : SLOT_THEME[slot].chipClassName
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${SLOT_THEME[slot].dotClassName}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function CurrentLoadoutTable({
  activeSlot,
  selectedIds,
  recentlyUpdatedSlot,
  onActivate,
  mobilePickerPanel,
  desktopPickerPanel,
}: {
  activeSlot: LoadoutSlot | null;
  selectedIds: Record<LoadoutSlot, string>;
  recentlyUpdatedSlot: LoadoutSlot | null;
  onActivate: (slot: LoadoutSlot) => void;
  mobilePickerPanel: React.ReactNode;
  desktopPickerPanel: React.ReactNode;
}) {
  const selectedItems: Record<LoadoutSlot, EquipmentItem | EnchantItem> = {
    rod: RODS.find((item) => item.id === selectedIds.rod) ?? RODS[0],
    line: LINES.find((item) => item.id === selectedIds.line) ?? LINES[0],
    bobber: BOBBERS.find((item) => item.id === selectedIds.bobber) ?? BOBBERS[0],
    enchant: ENCHANTS.find((item) => item.id === selectedIds.enchant) ?? ENCHANTS[0],
  };

  const loadoutBoardRef = React.useRef<HTMLDivElement | null>(null);
  const overlayLayerRef = React.useRef<HTMLDivElement | null>(null);
  const rowRefs = React.useRef<Record<LoadoutSlot, HTMLDivElement | null>>({
    rod: null,
    line: null,
    bobber: null,
    enchant: null,
  });
  const [overlayTop, setOverlayTop] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const updateOverlayTop = () => {
      if (!activeSlot || typeof window === 'undefined' || window.innerWidth < 1280) {
        setOverlayTop(null);
        return;
      }

      const board = loadoutBoardRef.current;
      const layer = overlayLayerRef.current;
      const row = rowRefs.current[activeSlot];
      if (!board || !layer || !row) {
        setOverlayTop(null);
        return;
      }

      const layerRect = layer.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      setOverlayTop(rowRect.top - layerRect.top + rowRect.height / 2);
    };

    updateOverlayTop();
    window.addEventListener('resize', updateOverlayTop);
    return () => window.removeEventListener('resize', updateOverlayTop);
  }, [activeSlot, selectedIds.rod, selectedIds.line, selectedIds.bobber, selectedIds.enchant]);

  return (
    <div data-testid="current-loadout-card" className="overflow-visible">
      <div
        ref={loadoutBoardRef}
        className="relative overflow-visible rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,246,255,0.96))] shadow-[0_28px_64px_rgba(30,70,136,0.14)]"
      >
        <div className="border-b border-ocean-100/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ocean-500 shadow-[0_0_8px_rgba(59,150,243,0.45)]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ocean-700">
              今の装備
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            左の 4
            行がいま使っている装備です。変えたい行を押すと、その行専用の吹き出しが右に開きます。
          </p>
        </div>

        <div ref={overlayLayerRef} className="relative overflow-visible px-3 py-4">
          <div
            data-testid="current-loadout-table"
            className="overflow-visible rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,248,255,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_14px_28px_rgba(30,70,136,0.08)]"
          >
            <div className="hidden xl:grid xl:grid-cols-[6.75rem_minmax(0,1.3fr)_4.25rem_4.25rem_4.25rem_5rem_5rem_5.25rem] xl:items-center xl:gap-3 xl:border-b xl:border-slate-200/80 xl:bg-white/65 xl:px-4 xl:py-3 xl:text-[11px] xl:font-bold xl:uppercase xl:tracking-[0.14em] xl:text-slate-500">
              <span>Slot</span>
              <span>Name</span>
              <span className="text-center" style={{ color: STAT_THEME.luck.surfaceText }}>
                Lk
              </span>
              <span className="text-center" style={{ color: STAT_THEME.strength.surfaceText }}>
                Str
              </span>
              <span className="text-center" style={{ color: STAT_THEME.expertise.surfaceText }}>
                Exp
              </span>
              <span
                className="text-center"
                style={{ color: STAT_THEME.attractionRate.surfaceText }}
              >
                Atk
              </span>
              <span className="text-center" style={{ color: STAT_THEME.bigCatchRate.surfaceText }}>
                BigC
              </span>
              <span className="text-center" style={{ color: STAT_THEME.maxWeight.surfaceText }}>
                MaxWt
              </span>
            </div>
            <div className="relative divide-y divide-slate-200/80">
              {LOADOUT_SLOT_ORDER.map((slot) => {
                const item = selectedItems[slot];
                const isActive = activeSlot === slot;
                const isUpdated = recentlyUpdatedSlot === slot;

                const activate = () => onActivate(slot);
                const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activate();
                  }
                };

                return (
                  <div
                    key={slot}
                    ref={(node) => {
                      rowRefs.current[slot] = node;
                    }}
                    data-slot={slot}
                    data-state={isActive ? 'active' : 'inactive'}
                    tabIndex={isActive ? undefined : 0}
                    role={isActive ? undefined : 'button'}
                    aria-pressed={isActive ? undefined : false}
                    aria-label={isActive ? undefined : `${LOADOUT_SLOT_LABELS[slot]} を選び直す`}
                    onClick={isActive ? undefined : activate}
                    onKeyDown={isActive ? undefined : handleKeyDown}
                    className={`relative cursor-pointer overflow-visible outline-none transition-all duration-200 ${
                      isActive
                        ? `${SLOT_ACTIVE_ROW_CLASS[slot]} z-20 bg-white/96`
                        : 'bg-white/70 hover:bg-white/92 focus:bg-white/92 focus:ring-2 focus:ring-ocean-300'
                    } ${isUpdated ? 'animate-loadout-settle' : ''}`}
                  >
                    <div className="px-4 py-4 xl:px-4 xl:py-4">
                      <div className="hidden xl:grid xl:grid-cols-[6.75rem_minmax(0,1.3fr)_4.25rem_4.25rem_4.25rem_5rem_5rem_5.25rem] xl:items-center xl:gap-3">
                        <div className="flex flex-col gap-2">
                          <SlotLabelChip slot={slot} label={LOADOUT_SLOT_LABELS[slot]} />
                          {isActive ? (
                            <span
                              data-testid="active-slot-indicator"
                              className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white"
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${SLOT_THEME[slot].dotClassName}`}
                                aria-hidden="true"
                              />
                              {LOADOUT_SLOT_LABELS[slot]} を編集中
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-500">
                              押して変更
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div
                            className={`truncate font-bold text-slate-900 ${isActive ? 'text-[1.05rem]' : 'text-base'}`}
                          >
                            {item.nameEn}
                          </div>
                          <div className="mt-1 text-sm leading-relaxed text-slate-600">
                            {formatItemDetail(item)}
                          </div>
                          <div
                            className={`mt-1 text-xs font-semibold ${isActive ? 'text-slate-600' : 'text-slate-500'}`}
                          >
                            {isActive
                              ? '右の吹き出しから選ぶと、この行だけ入れ替わります'
                              : 'この行を押して選び直す'}
                          </div>
                          {isActive ? (
                            <div className="mt-1 text-xs font-semibold text-slate-600">
                              選んだ候補はここに反映されます
                            </div>
                          ) : null}
                        </div>

                        {LOADOUT_STAT_COLUMN_ORDER.map((stat) => (
                          <div
                            key={stat}
                            className="flex justify-center border-l border-slate-100/80 pl-1"
                          >
                            <StatBadge stat={stat} value={formatItemStatValue(item, stat)} />
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-3 xl:hidden">
                        <div className="flex flex-wrap items-center gap-2">
                          <SlotLabelChip slot={slot} label={LOADOUT_SLOT_LABELS[slot]} />
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isActive ? '編集中' : '押すと候補を開く'}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-base font-bold text-slate-900">
                            {item.nameEn}
                          </div>
                          <div className="mt-1 text-sm leading-relaxed text-slate-600">
                            {formatItemDetail(item)}
                          </div>
                        </div>

                        <div className="flex max-w-full flex-wrap gap-1.5">
                          {(isActive ? STAT_THEME_ORDER : getHighlightedStats(item)).map((stat) => (
                            <StatBadge
                              key={stat}
                              stat={stat}
                              value={formatItemStatValue(item, stat)}
                            />
                          ))}
                        </div>

                        <span
                          className={`text-xs font-semibold ${isActive ? 'text-slate-600' : 'text-slate-500'}`}
                        >
                          {isActive
                            ? '下の候補から選ぶと、この行だけ入れ替わります'
                            : 'この行を押して選び直す'}
                        </span>
                        {isActive ? (
                          <span className="text-xs font-semibold text-slate-600">
                            選んだ候補はここに反映されます
                          </span>
                        ) : null}
                      </div>

                      {isActive ? (
                        <div data-testid="slot-picker-anchor-fallback" className="hidden" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 xl:hidden">
            {activeSlot && overlayTop === null ? (
              <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
                {mobilePickerPanel}
              </div>
            ) : null}
          </div>

          {activeSlot && overlayTop !== null ? (
            <div
              className="pointer-events-none absolute right-4 z-30 hidden xl:block"
              style={{
                top: `${overlayTop}px`,
                width: 'min(36rem, calc(100% - 4.5rem))',
                transform: 'translateY(-50%)',
              }}
            >
              <div className="pointer-events-auto relative overflow-visible">
                <div
                  data-testid="slot-picker-anchor"
                  className="pointer-events-none absolute left-0 top-1/2 h-24 w-28 -translate-x-[82%] -translate-y-1/2"
                />
                <div className="pointer-events-none absolute left-0 top-1/2 h-24 w-28 -translate-x-[82%] -translate-y-1/2 overflow-visible">
                  <div className="absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full border border-slate-200 bg-white shadow-[-10px_16px_28px_rgba(15,23,42,0.08)]" />
                  <div className="absolute left-10 top-1/2 h-14 w-18 -translate-y-1/2 rounded-full border border-slate-200 bg-white shadow-[-10px_16px_28px_rgba(15,23,42,0.08)]" />
                  <div className="absolute left-8 top-1/2 h-10 w-12 -translate-y-1/2 rounded-full bg-white/90 blur-[1px]" />
                </div>
                <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.14)]">
                  {desktopPickerPanel}
                </div>
              </div>
            </div>
          ) : null}
        </div>
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
  testId = 'slot-picker-panel',
}: {
  slot: LoadoutSlot;
  items: readonly T[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  testId?: string;
}) {
  const selectedItem = items.find((item) => item.id === selectedId);

  return (
    <div
      key={slot}
      data-testid={testId}
      className="animate-inventory-slide-in relative overflow-hidden bg-white"
    >
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(246,250,255,0.98),rgba(236,245,255,0.98))] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <SlotLabelChip slot={slot} label={LOADOUT_SLOT_LABELS[slot]} />
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                この {LOADOUT_SLOT_LABELS[slot]} 行を選び直しています
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">
              {LOADOUT_SLOT_LABELS[slot]} の候補
            </h3>
            {selectedItem ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                いま入っているのは{' '}
                <span className="font-semibold text-slate-900">{selectedItem.nameEn}</span>
                です。下から別の候補を選ぶと、この行だけそのまま入れ替わります。
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="whitespace-nowrap">閉じる</span>
          </button>
        </div>
      </div>

      <div className="max-h-[68vh] overflow-auto px-4 py-3">
        <table
          id={`loadout-picker-${slot}`}
          className="w-full table-fixed border-separate border-spacing-0 text-sm"
        >
          <thead className="sticky top-0 z-10 bg-white/96 backdrop-blur">
            <tr className="border-b border-slate-200/80">
              <th className="w-[72px] border-b border-slate-200 px-2 pb-2 pt-1 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                選択
              </th>
              <th className="border-b border-slate-200 px-2 pb-2 pt-1 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                名前
              </th>
              <th
                className="w-[60px] border-b border-slate-200 px-1 pb-2 pt-1 text-center text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: STAT_THEME.luck.surfaceText }}
              >
                Lk
              </th>
              <th
                className="w-[60px] border-b border-slate-200 px-1 pb-2 pt-1 text-center text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: STAT_THEME.strength.surfaceText }}
              >
                Str
              </th>
              <th
                className="w-[60px] border-b border-slate-200 px-1 pb-2 pt-1 text-center text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: STAT_THEME.expertise.surfaceText }}
              >
                Exp
              </th>
              <th
                className="w-[72px] border-b border-slate-200 px-1 pb-2 pt-1 text-center text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: STAT_THEME.attractionRate.surfaceText }}
              >
                Atk
              </th>
              <th
                className="w-[68px] border-b border-slate-200 px-1 pb-2 pt-1 text-center text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: STAT_THEME.bigCatchRate.surfaceText }}
              >
                BigC
              </th>
              <th
                className="w-[76px] border-b border-slate-200 px-1 pb-2 pt-1 text-center text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: STAT_THEME.maxWeight.surfaceText }}
              >
                MaxWt
              </th>
            </tr>
          </thead>
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
                      ? 'bg-emerald-50/70 shadow-[inset_4px_0_0_rgba(16,185,129,0.9),inset_0_0_0_1px_rgba(16,185,129,0.18)]'
                      : 'bg-white hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-ocean-400'
                  }`}
                >
                  <td className="border-b border-slate-200 px-2 py-3 align-middle">
                    <LoadoutSelectionBadge selected={selected} />
                  </td>
                  <td className="border-b border-slate-200 px-2 py-3 align-middle">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {item.nameEn}
                      </div>
                      <div className="mt-0.5 text-xs leading-relaxed text-gray-500">
                        {formatItemDetail(item)}
                      </div>
                    </div>
                  </td>
                  {LOADOUT_STAT_COLUMN_ORDER.map((stat) => {
                    const theme = STAT_THEME[stat];
                    return (
                      <td
                        key={stat}
                        className="border-b border-slate-200 px-1 py-3 text-center align-middle"
                      >
                        <span
                          className="inline-flex min-w-[3.25rem] items-center justify-center rounded-full border px-2 py-1 text-[11px] font-semibold"
                          style={{
                            borderColor: theme.cardBorder,
                            backgroundColor: theme.cardBackground,
                            color: theme.surfaceText,
                          }}
                        >
                          {formatItemStatValue(item, stat)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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

  const activeSlotTheme = activeSlot ? SLOT_THEME[activeSlot] : null;
  const activeSlotLabel = activeSlot ? LOADOUT_SLOT_LABELS[activeSlot] : '選択なし';

  return (
    <div className="space-y-5">
      <section className="animate-slide-in-up space-y-5 rounded-[28px] border border-ocean-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(232,243,255,0.96))] p-5 shadow-[0_24px_64px_rgba(30,70,136,0.12)]">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ocean-500 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(59,150,243,0.28)]">
              1
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-ocean-600">Step 1</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">まずは今の装備をそろえる</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            左の表で変えたい行を押すと、右にその行専用の候補が出ます。選ぶと左のその行だけが更新されます。
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full border border-ocean-200 bg-ocean-50 px-3 py-1 text-ocean-700">
            1. 左で変えたい行を押す
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            2. 右の候補から選ぶ
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
            3. 左の行と合計ステータスが更新される
          </span>
        </div>

        <div className="relative">
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
            mobilePickerPanel={
              activeSlot ? (
                <LoadoutPickerPanel
                  slot={activeSlot}
                  items={loadoutItems[activeSlot]}
                  selectedId={params.loadout[LOADOUT_SLOT_FIELDS[activeSlot]]}
                  onSelect={(id) => handleLoadoutSelect(activeSlot, id)}
                  onClose={() => setActiveSlot(null)}
                />
              ) : (
                <div className="animate-fade-in rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
                  <div className="text-sm font-semibold text-slate-700">候補を開く</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    左のボードで変えたい欄を押してください。
                  </p>
                </div>
              )
            }
            desktopPickerPanel={
              activeSlot ? (
                <LoadoutPickerPanel
                  slot={activeSlot}
                  items={loadoutItems[activeSlot]}
                  selectedId={params.loadout[LOADOUT_SLOT_FIELDS[activeSlot]]}
                  onSelect={(id) => handleLoadoutSelect(activeSlot, id)}
                  onClose={() => setActiveSlot(null)}
                  testId="slot-picker-panel"
                />
              ) : (
                <div className="animate-fade-in rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
                  <div className="text-sm font-semibold text-slate-700">候補を開く</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    左のボードで変えたい欄を押してください。
                  </p>
                </div>
              )
            }
          />
        </div>

        {/* Total stats */}
        <div
          data-testid="total-stats-section"
          className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">現在の装備の合計ステータス</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                いま選んでいる装備を全部足した値です。
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium shadow-sm ${
                model.enchantState === 'active'
                  ? 'border-emerald-600/50 bg-emerald-900/50 text-emerald-400'
                  : model.enchantState === 'conditional'
                    ? 'border-ocean-600/50 bg-ocean-900/50 text-ocean-400'
                    : 'border-slate-600 bg-slate-700/60 text-slate-400'
              }`}
            >
              {model.enchantStatusText ?? 'No Enchant selected'}
            </span>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-slate-600 bg-slate-700/60 px-3 py-1 font-semibold text-slate-300">
              結果は
            </span>
            <span
              className={`flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${
                activeSlotTheme
                  ? activeSlotTheme.boardChipClassName
                  : 'border-slate-600 bg-slate-700/60 text-slate-400'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${activeSlotTheme?.dotClassName ?? 'bg-slate-400'}`}
              />
              {activeSlotLabel}
            </span>
            <span>の選択で更新されます</span>
          </div>

          {model.inactiveEnchantReason ? (
            <p className="mb-3 text-xs leading-relaxed text-amber-400">
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

      {/* ─── Step 2: Conditions ─── */}
      <section className="animate-slide-in-up space-y-4 rounded-[20px] border border-slate-700/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(241,245,255,0.99))] p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-[10px] font-bold text-white">
              2
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Step 2</span>
          </div>
          <h2 className="text-sm font-semibold text-gray-800">必要なら、場所と条件を絞る</h2>
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

      {/* ─── Step 3: Play speed ─── */}
      <section className="animate-slide-in-up space-y-4 rounded-[20px] border border-slate-700/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(241,245,255,0.99))] p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-[10px] font-bold text-white">
              3
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Step 3</span>
          </div>
          <h2 className="text-sm font-semibold text-gray-800">あなたのプレイ速度</h2>
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

      {/* ─── Advanced / Step 4 ─── */}
      <div className="animate-slide-in-up rounded-[20px] border border-slate-700/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(241,245,255,0.99))] p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
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
