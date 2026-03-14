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
import {
  BEST_AREA_ID,
  formatCurrency,
  formatSignedDisplayNumber,
  formatWeightKg,
} from '@/lib/calculator';
import { rankSlot, SlotRankEntry } from '@/lib/ranking';
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
  any: '平均で見る',
  morning: '朝',
  day: '昼',
  evening: '夕方',
  night: '夜',
};

const WEATHER_TYPE_HELPER: Record<WeatherType, string> = {
  any: '平均で見る',
  clear: '晴れ',
  rainy: '雨',
  moonrain: '月雨',
  stormy: '嵐',
  foggy: '霧',
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

  return item.location;
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

function formatTotalStatValue(model: DerivedModelSummary, stat: StatThemeKey): string {
  switch (stat) {
    case 'luck':
      return formatSignedDisplayNumber(model.totalStats.luck);
    case 'strength':
      return formatSignedDisplayNumber(model.totalStats.strength);
    case 'expertise':
      return formatSignedDisplayNumber(model.totalStats.expertise);
    case 'attractionRate':
      return formatSignedDisplayNumber(model.totalStats.attractionPct, '%');
    case 'bigCatchRate':
      return formatSignedDisplayNumber(model.totalStats.bigCatch);
    case 'maxWeight':
      return formatWeightKg(model.totalStats.maxWeightKg);
  }
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

const LOADOUT_TABLE_GRID_COLUMNS =
  'xl:grid-cols-[6.75rem_minmax(0,1.2fr)_5.75rem_4.25rem_4.25rem_4.25rem_5rem_5rem_5.25rem]';
const LOADOUT_TABLE_GRID_COLUMNS_COMPACT =
  'xl:grid-cols-[5.5rem_minmax(0,1fr)_4.75rem_3.5rem_3.5rem_3.5rem_4.25rem_4.25rem_4.75rem]';
const PICKER_GRID_COLUMNS = 'grid-cols-[56px_minmax(0,1.15fr)_72px_48px_48px_48px_56px_56px_72px]';
const LOADOUT_WORKSPACE_GRID_COLUMNS =
  'grid-cols-[minmax(0,1.75fr)_4.5rem_2.55rem_2.55rem_2.55rem_3.05rem_3.05rem_3.75rem]';

const PRICE_COLUMN_LABEL = 'Price';
type PickerPresetSortMode = 'default' | 'ev-desc' | 'delta-desc' | 'price-asc';
type PickerColumnSortKey = 'name' | 'price' | StatThemeKey;
type PickerColumnSortDirection = 'asc' | 'desc';
type PickerPriceBand = 'all' | 'free' | 'budget' | 'mid' | 'premium';
type PickerRecommendationFilter =
  | 'free'
  | 'early'
  | 'endgame'
  | 'ev-focus'
  | 'value'
  | 'balanced'
  | 'big-upgrade';
type PickerStatFilterInputs = Record<StatThemeKey, string>;
type PickerActiveFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

const MULTIPLE_LOCATIONS_VALUE = '__multiple__';
const PICKER_RECOMMENDATION_FILTERS: PickerRecommendationFilter[] = [
  'free',
  'early',
  'endgame',
  'ev-focus',
  'value',
  'balanced',
  'big-upgrade',
];

interface PickerColumnSort {
  key: PickerColumnSortKey;
  direction: PickerColumnSortDirection;
}

function createEmptyStatFilterInputs(): PickerStatFilterInputs {
  return {
    luck: '',
    strength: '',
    expertise: '',
    attractionRate: '',
    bigCatchRate: '',
    maxWeight: '',
  };
}

function parseOptionalFilterNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatItemPrice(item: EquipmentItem | EnchantItem): string {
  return item.price > 0 ? `${item.price.toLocaleString()}G` : '—';
}

function formatPriceDelta(
  item: EquipmentItem | EnchantItem,
  baseItem: EquipmentItem | EnchantItem,
): string {
  const delta = item.price - baseItem.price;
  if (delta === 0) {
    return '±0G';
  }
  return `${delta > 0 ? '+' : ''}${delta.toLocaleString()}G`;
}

function formatItemStatDelta(
  item: EquipmentItem | EnchantItem,
  baseItem: EquipmentItem | EnchantItem,
  stat: StatThemeKey,
): string {
  const delta = getItemStatValue(item, stat) - getItemStatValue(baseItem, stat);
  if (stat === 'maxWeight') {
    if (Math.abs(delta) < 0.001) {
      return '±0kg';
    }
    return `${delta > 0 ? '+' : ''}${Number(delta.toFixed(3)).toLocaleString()}kg`;
  }
  if (stat === 'attractionRate') {
    if (Math.abs(delta) < 0.001) {
      return '±0%';
    }
    return `${delta > 0 ? '+' : ''}${Number(delta.toFixed(3)).toLocaleString()}%`;
  }
  if (Math.abs(delta) < 0.001) {
    return '±0';
  }
  return formatSignedDisplayNumber(delta);
}

function deltaToneClass(deltaText: string): string {
  if (deltaText.startsWith('+')) {
    return 'text-emerald-600';
  }
  if (deltaText.startsWith('-')) {
    return 'text-rose-600';
  }
  return 'text-slate-400';
}

function deltaBadgeClass(deltaText: string): string {
  if (deltaText.startsWith('+')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (deltaText.startsWith('-')) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return 'border-slate-200 bg-slate-50 text-slate-500';
}

function formatEvDeltaPercent(current: number, next: number): string {
  const delta = next - current;
  if (Math.abs(delta) < 0.001) {
    return 'いまの装備と同じ';
  }
  if (current <= 0) {
    return delta > 0 ? 'いまより上がる' : 'いまより下がる';
  }
  const percent = Math.round((delta / current) * 100);
  return `いまより ${percent > 0 ? '+' : ''}${percent}%`;
}

function getEvDeltaPercent(current: number, next: number): number {
  if (current <= 0) {
    return next > current ? 100 : 0;
  }
  return ((next - current) / current) * 100;
}

function matchesPriceBand(price: number, band: PickerPriceBand): boolean {
  switch (band) {
    case 'free':
      return price === 0;
    case 'budget':
      return price > 0 && price <= 10000;
    case 'mid':
      return price > 10000 && price <= 100000;
    case 'premium':
      return price > 100000;
    case 'all':
    default:
      return true;
  }
}

function getSelectedLoadoutItems(
  selectedIds: Record<LoadoutSlot, string> | CalculatorParams['loadout'],
) {
  const slotIds =
    'rod' in selectedIds
      ? selectedIds
      : {
          rod: selectedIds.rodId,
          line: selectedIds.lineId,
          bobber: selectedIds.bobberId,
          enchant: selectedIds.enchantId,
        };
  return {
    rod: RODS.find((item) => item.id === slotIds.rod) ?? RODS[0],
    line: LINES.find((item) => item.id === slotIds.line) ?? LINES[0],
    bobber: BOBBERS.find((item) => item.id === slotIds.bobber) ?? BOBBERS[0],
    enchant: ENCHANTS.find((item) => item.id === slotIds.enchant) ?? ENCHANTS[0],
  } satisfies Record<LoadoutSlot, EquipmentItem | EnchantItem>;
}

function getRecommendationTags(
  entry: SlotRankEntry,
  selectedEntry: SlotRankEntry | undefined,
  context: {
    evFocusIds: Set<string>;
    valueIds: Set<string>;
  },
): string[] {
  const tags: string[] = [];
  const evDeltaPercent = selectedEntry
    ? getEvDeltaPercent(selectedEntry.expectedValuePerHour, entry.expectedValuePerHour)
    : 0;
  const positiveStatCount = selectedEntry
    ? LOADOUT_STAT_COLUMN_ORDER.filter(
        (stat) =>
          getItemStatValue(entry.item, stat) > getItemStatValue(selectedEntry.item, stat) + 0.001,
      ).length
    : 0;
  const negativeStatCount = selectedEntry
    ? LOADOUT_STAT_COLUMN_ORDER.filter(
        (stat) =>
          getItemStatValue(entry.item, stat) < getItemStatValue(selectedEntry.item, stat) - 0.001,
      ).length
    : 0;

  if (entry.item.price === 0) {
    tags.push('無料');
  }
  if (entry.item.price > 0 && entry.item.price <= 10000) {
    tags.push('序盤向け');
  }
  if (entry.item.price >= 100000) {
    tags.push('終盤向け');
  }
  if (context.evFocusIds.has(entry.item.id)) {
    tags.push('期待値重視');
  }
  if (
    context.valueIds.has(entry.item.id) ||
    (selectedEntry && evDeltaPercent >= 10 && entry.item.price > 0 && entry.item.price <= 100000)
  ) {
    tags.push('コスパ');
  }
  if (selectedEntry && positiveStatCount >= 3 && negativeStatCount <= 1 && evDeltaPercent >= 0) {
    tags.push('バランス型');
  }
  if (selectedEntry && evDeltaPercent >= 20) {
    tags.push('伸び幅大');
  }

  return Array.from(new Set(tags)).slice(0, 3);
}

function buildRecommendationTagMap(
  entries: SlotRankEntry[],
  selectedEntry: SlotRankEntry | undefined,
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  if (!selectedEntry) {
    for (const entry of entries) {
      map.set(
        entry.item.id,
        getRecommendationTags(entry, selectedEntry, {
          evFocusIds: new Set<string>(),
          valueIds: new Set<string>(),
        }),
      );
    }
    return map;
  }

  const positiveEntries = entries.filter(
    (entry) =>
      entry.item.id !== selectedEntry.item.id &&
      entry.expectedValuePerHour > selectedEntry.expectedValuePerHour,
  );

  const evFocusCount = Math.max(3, Math.ceil(positiveEntries.length * 0.2));
  const evFocusIds = new Set(
    [...positiveEntries]
      .sort((a, b) => b.expectedValuePerHour - a.expectedValuePerHour)
      .slice(0, evFocusCount)
      .map((entry) => entry.item.id),
  );

  const valueScored = positiveEntries
    .filter((entry) => entry.item.price > 0)
    .map((entry) => ({
      entry,
      score:
        (entry.expectedValuePerHour - selectedEntry.expectedValuePerHour) /
        Math.max(entry.item.price, 1),
    }))
    .sort((a, b) => b.score - a.score);
  const valueCount = Math.max(3, Math.ceil(valueScored.length * 0.25));
  const valueIds = new Set(valueScored.slice(0, valueCount).map(({ entry }) => entry.item.id));

  for (const entry of entries) {
    map.set(entry.item.id, getRecommendationTags(entry, selectedEntry, { evFocusIds, valueIds }));
  }
  return map;
}

function matchesRecommendationFilter(tags: string[], filter: PickerRecommendationFilter): boolean {
  switch (filter) {
    case 'free':
      return tags.includes('無料');
    case 'early':
      return tags.includes('序盤向け');
    case 'endgame':
      return tags.includes('終盤向け');
    case 'ev-focus':
      return tags.includes('期待値重視');
    case 'value':
      return tags.includes('コスパ');
    case 'balanced':
      return tags.includes('バランス型');
    case 'big-upgrade':
      return tags.includes('伸び幅大');
    default:
      return false;
  }
}

function matchesRecommendationFilters(
  tags: string[],
  filters: PickerRecommendationFilter[],
): boolean {
  if (filters.length === 0) {
    return true;
  }
  return filters.some((filter) => matchesRecommendationFilter(tags, filter));
}

function formatPriceBandLabel(band: PickerPriceBand): string {
  switch (band) {
    case 'free':
      return '価格: 無料';
    case 'budget':
      return '価格: 1万G まで';
    case 'mid':
      return '価格: 1万G〜10万G';
    case 'premium':
      return '価格: 10万G 超';
    case 'all':
    default:
      return '価格: すべて';
  }
}

function formatRecommendationFilterLabel(filter: PickerRecommendationFilter): string {
  switch (filter) {
    case 'free':
      return 'おすすめ: 無料';
    case 'early':
      return 'おすすめ: 序盤向け';
    case 'endgame':
      return 'おすすめ: 終盤向け';
    case 'ev-focus':
      return 'おすすめ: 期待値重視';
    case 'value':
      return 'おすすめ: コスパ';
    case 'balanced':
      return 'おすすめ: バランス型';
    case 'big-upgrade':
      return 'おすすめ: 伸び幅大';
    default:
      return 'おすすめ';
  }
}

function hasPositiveStatDelta(
  item: EquipmentItem | EnchantItem,
  baseItem: EquipmentItem | EnchantItem,
  stat: StatThemeKey,
): boolean {
  return getItemStatValue(item, stat) > getItemStatValue(baseItem, stat) + 0.001;
}

function buildRecommendationHighlights(
  entries: SlotRankEntry[],
  selectedEntry: SlotRankEntry | undefined,
): Array<{ id: string; title: string; item: EquipmentItem | EnchantItem; detail: string }> {
  if (!selectedEntry) {
    return [];
  }

  const selectedEv = selectedEntry.expectedValuePerHour;
  const recommendationTagMap = buildRecommendationTagMap(entries, selectedEntry);
  const unique = new Set<string>();
  const cards: Array<{
    id: string;
    title: string;
    item: EquipmentItem | EnchantItem;
    detail: string;
  }> = [];

  const pushCard = (
    title: string,
    entry: SlotRankEntry | undefined,
    detailFactory: (candidate: SlotRankEntry) => string,
  ) => {
    if (!entry || unique.has(entry.item.id)) {
      return;
    }
    unique.add(entry.item.id);
    cards.push({
      id: entry.item.id,
      title,
      item: entry.item,
      detail: detailFactory(entry),
    });
  };

  const bestGrowth = [...entries].sort(
    (a, b) => b.expectedValuePerHour - a.expectedValuePerHour,
  )[0];
  pushCard(
    'まず見る候補',
    bestGrowth,
    (entry) =>
      `${formatEvDeltaPercent(selectedEv, entry.expectedValuePerHour)} / ${formatCurrency(entry.expectedValuePerHour)}`,
  );

  const bestEvFocus = entries.find((entry) =>
    (recommendationTagMap.get(entry.item.id) ?? []).includes('期待値重視'),
  );
  pushCard(
    '期待値で見るなら',
    bestEvFocus,
    (entry) =>
      `${formatCurrency(entry.expectedValuePerHour)} / ${formatEvDeltaPercent(selectedEv, entry.expectedValuePerHour)}`,
  );

  const bestBudget = [...entries]
    .filter((entry) => (recommendationTagMap.get(entry.item.id) ?? []).includes('コスパ'))
    .sort((a, b) => b.expectedValuePerHour - a.expectedValuePerHour)[0];
  pushCard(
    'コスパで見るなら',
    bestBudget,
    (entry) =>
      `${entry.item.price.toLocaleString()}G / ${formatEvDeltaPercent(selectedEv, entry.expectedValuePerHour)}`,
  );

  const bestBalanced = entries.find((entry) =>
    (recommendationTagMap.get(entry.item.id) ?? []).includes('バランス型'),
  );
  pushCard(
    '偏らせたくないなら',
    bestBalanced,
    (entry) =>
      `${formatEvDeltaPercent(selectedEv, entry.expectedValuePerHour)} / 複数ステータスが伸びます`,
  );

  const bestFree = [...entries]
    .filter((entry) => entry.item.price === 0)
    .sort((a, b) => b.expectedValuePerHour - a.expectedValuePerHour)[0];
  pushCard(
    '無料で触るなら',
    bestFree,
    (entry) => `${formatEvDeltaPercent(selectedEv, entry.expectedValuePerHour)} / 無料`,
  );

  return cards;
}

function compareSourceOrder(
  a: SlotRankEntry,
  b: SlotRankEntry,
  sourceOrder: Map<string, number>,
): number {
  return (
    (sourceOrder.get(a.item.id) ?? Number.MAX_SAFE_INTEGER) -
    (sourceOrder.get(b.item.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

function compareEntriesByPreset(
  a: SlotRankEntry,
  b: SlotRankEntry,
  mode: PickerPresetSortMode,
  selectedEntry: SlotRankEntry | undefined,
  sourceOrder: Map<string, number>,
): number {
  switch (mode) {
    case 'default':
      return compareSourceOrder(a, b, sourceOrder);
    case 'delta-desc': {
      const selectedEv = selectedEntry?.expectedValuePerHour ?? 0;
      const deltaDiff = b.expectedValuePerHour - selectedEv - (a.expectedValuePerHour - selectedEv);
      return (
        deltaDiff ||
        b.expectedValuePerHour - a.expectedValuePerHour ||
        compareSourceOrder(a, b, sourceOrder)
      );
    }
    case 'price-asc':
      return a.item.price - b.item.price || compareSourceOrder(a, b, sourceOrder);
    case 'ev-desc':
    default:
      return (
        b.expectedValuePerHour - a.expectedValuePerHour || compareSourceOrder(a, b, sourceOrder)
      );
  }
}

function compareEntriesByColumn(
  a: SlotRankEntry,
  b: SlotRankEntry,
  columnSort: PickerColumnSort,
  sourceOrder: Map<string, number>,
): number {
  let result = 0;

  if (columnSort.key === 'name') {
    result = a.item.nameEn.localeCompare(b.item.nameEn, 'en', { sensitivity: 'base' });
  } else if (columnSort.key === 'price') {
    result = a.item.price - b.item.price;
  } else {
    result = getItemStatValue(a.item, columnSort.key) - getItemStatValue(b.item, columnSort.key);
  }

  if (columnSort.direction === 'desc') {
    result *= -1;
  }

  return result || compareSourceOrder(a, b, sourceOrder);
}

function sortRankEntries(
  entries: SlotRankEntry[],
  mode: PickerPresetSortMode,
  selectedEntry: SlotRankEntry | undefined,
  sourceOrder: Map<string, number>,
  columnSort: PickerColumnSort | null,
): SlotRankEntry[] {
  const sorted = [...entries];
  return sorted.sort((a, b) =>
    columnSort
      ? compareEntriesByColumn(a, b, columnSort, sourceOrder)
      : compareEntriesByPreset(a, b, mode, selectedEntry, sourceOrder),
  );
}

function PriceCell({ item }: { item: EquipmentItem | EnchantItem }) {
  const hasPrice = item.price > 0;

  return (
    <span
      className={`inline-flex min-w-[4.5rem] items-center justify-center rounded-xl border px-2.5 py-1 text-[11px] font-bold tabular-nums ${
        hasPrice
          ? 'border-slate-300 bg-slate-100 text-slate-700'
          : 'border-slate-200 bg-slate-50 text-slate-400'
      }`}
    >
      {formatItemPrice(item)}
    </span>
  );
}

function CompactPriceCell({ item }: { item?: EquipmentItem | EnchantItem }) {
  if (!item || item.price <= 0) {
    return (
      <span className="inline-flex min-w-[3.8rem] items-center justify-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-400">
        —
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[3.8rem] items-center justify-center whitespace-nowrap rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
      {item.price.toLocaleString()}G
    </span>
  );
}

function ComparisonPriceCell({
  item,
  baseItem,
}: {
  item: EquipmentItem | EnchantItem;
  baseItem: EquipmentItem | EnchantItem;
}) {
  const deltaText = formatPriceDelta(item, baseItem);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <PriceCell item={item} />
      <span
        className={`inline-flex min-w-[4.25rem] items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums ${deltaBadgeClass(deltaText)}`}
      >
        {deltaText}
      </span>
    </div>
  );
}

function ComparisonStatCell({
  item,
  baseItem,
  stat,
}: {
  item: EquipmentItem | EnchantItem;
  baseItem: EquipmentItem | EnchantItem;
  stat: StatThemeKey;
}) {
  const theme = STAT_THEME[stat];
  const deltaText = formatItemStatDelta(item, baseItem, stat);

  return (
    <div className="flex flex-col items-center gap-1.5">
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
      <span
        className={`inline-flex min-w-[3.25rem] items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums ${deltaBadgeClass(deltaText)}`}
      >
        {deltaText}
      </span>
    </div>
  );
}

function PickerHeaderSortButton({
  label,
  onClick,
  active = false,
  direction,
  textColorClass = 'text-slate-500',
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  direction?: PickerColumnSortDirection;
  textColorClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center gap-1 rounded-full px-2 py-1 transition ${
        active
          ? 'bg-slate-100 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.35)]'
          : 'hover:bg-slate-50'
      }`}
    >
      <span className={`${active ? 'text-slate-800' : textColorClass}`}>{label}</span>
      <span
        aria-hidden="true"
        className={`text-[10px] ${active ? 'text-slate-700' : 'text-slate-300'}`}
      >
        {direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}
      </span>
    </button>
  );
}

function CompactWorkspaceStatCell({ stat, value }: { stat: StatThemeKey; value: string }) {
  const theme = STAT_THEME[stat];

  return (
    <span
      className="inline-flex min-w-[2.45rem] items-center justify-center whitespace-nowrap rounded-full border px-1.5 py-1 text-[10px] font-semibold"
      style={{
        borderColor: theme.cardBorder,
        backgroundColor: theme.cardBackground,
        color: theme.surfaceText,
      }}
    >
      {value}
    </span>
  );
}

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

function DetailDisclosureButton({
  expanded,
  label,
  onClick,
}: {
  expanded: boolean;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      title={label}
      className="relative z-20 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 opacity-70 transition hover:bg-slate-100 hover:text-slate-600 hover:opacity-100 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-700 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ocean-300/70"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.25 4.5 6 8.25 9.75 4.5" />
      </svg>
      <span className="sr-only whitespace-nowrap">{label}</span>
    </button>
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
  model,
  recentlyUpdatedSlot,
  onActivate,
  onCloseActivePicker,
  pickerContainerRef,
  comparisonMode = false,
}: {
  activeSlot: LoadoutSlot | null;
  selectedIds: Record<LoadoutSlot, string>;
  model: DerivedModelSummary;
  recentlyUpdatedSlot: LoadoutSlot | null;
  onActivate: (slot: LoadoutSlot) => void;
  onCloseActivePicker: () => void;
  pickerContainerRef: React.RefObject<HTMLElement | null>;
  comparisonMode?: boolean;
}) {
  const [detailOpenSlots, setDetailOpenSlots] = React.useState<Record<LoadoutSlot, boolean>>({
    rod: false,
    line: false,
    bobber: false,
    enchant: false,
  });
  const selectedItems = getSelectedLoadoutItems(selectedIds);

  const rowRefs = React.useRef<Record<LoadoutSlot, HTMLDivElement | null>>({
    rod: null,
    line: null,
    bobber: null,
    enchant: null,
  });

  React.useEffect(() => {
    if (!activeSlot) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (pickerContainerRef.current?.contains(target)) {
        return;
      }

      const clickedRow = LOADOUT_SLOT_ORDER.some((slot) => rowRefs.current[slot]?.contains(target));
      if (clickedRow) {
        return;
      }

      onCloseActivePicker();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [activeSlot, onCloseActivePicker, pickerContainerRef]);

  const toggleDetail = (slot: LoadoutSlot) => {
    setDetailOpenSlots((current) => ({
      ...current,
      [slot]: !current[slot],
    }));
  };

  const desktopLoadoutGridColumns = LOADOUT_TABLE_GRID_COLUMNS;

  if (comparisonMode) {
    return (
      <div data-testid="current-loadout-card" className="overflow-visible">
        <div
          data-testid="current-loadout-table"
          className="relative overflow-visible rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,246,255,0.96))] shadow-[0_28px_64px_rgba(30,70,136,0.14)]"
        >
          <div data-testid="current-loadout-workspace-board">
            <div className="border-b border-ocean-100/80 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-ocean-500 shadow-[0_0_8px_rgba(59,150,243,0.45)]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ocean-700">
                  今の装備
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                左を見ながら、右の候補を比べて選べます。
              </p>
            </div>

            <div className="space-y-3 p-4">
              <div
                className={`grid ${LOADOUT_WORKSPACE_GRID_COLUMNS} items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500`}
              >
                <span>装備</span>
                <span className="text-center">{PRICE_COLUMN_LABEL}</span>
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
                <span
                  className="text-center"
                  style={{ color: STAT_THEME.bigCatchRate.surfaceText }}
                >
                  BigC
                </span>
                <span className="text-center" style={{ color: STAT_THEME.maxWeight.surfaceText }}>
                  MaxWt
                </span>
              </div>
              {LOADOUT_SLOT_ORDER.map((slot) => {
                const item = selectedItems[slot];
                const isActive = activeSlot === slot;
                const isUpdated = recentlyUpdatedSlot === slot;

                const activate = () => onActivate(slot);

                return (
                  <div
                    key={slot}
                    ref={(node) => {
                      rowRefs.current[slot] = node;
                    }}
                    data-slot={slot}
                    data-state={isActive ? 'active' : 'inactive'}
                    onClick={activate}
                    className={`relative overflow-visible rounded-[24px] border transition-all duration-200 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ocean-300 ${
                      isActive
                        ? `${SLOT_ACTIVE_ROW_CLASS[slot]} z-20 bg-white/96 shadow-[0_14px_32px_rgba(30,70,136,0.12)]`
                        : 'border-slate-200/80 bg-white/88 hover:bg-white'
                    } ${isUpdated ? 'animate-loadout-settle' : ''}`}
                  >
                    <button
                      type="button"
                      aria-label={`${LOADOUT_SLOT_LABELS[slot]} を選び直す`}
                      aria-pressed={isActive ? 'true' : 'false'}
                      className="absolute inset-0 z-10 rounded-[inherit] focus:outline-none"
                      onClick={(event) => {
                        event.stopPropagation();
                        activate();
                      }}
                    />

                    <div className="relative px-3 py-3">
                      <div className={`grid ${LOADOUT_WORKSPACE_GRID_COLUMNS} items-center gap-2`}>
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <SlotLabelChip slot={slot} label={LOADOUT_SLOT_LABELS[slot]} />
                            {isActive ? (
                              <div data-testid="slot-picker-anchor">
                                <span
                                  data-testid="active-slot-indicator"
                                  className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white"
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full ${SLOT_THEME[slot].dotClassName}`}
                                    aria-hidden="true"
                                  />
                                  {LOADOUT_SLOT_LABELS[slot]} を編集中
                                </span>
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-2 truncate text-[0.95rem] font-bold text-slate-900">
                            {item.nameEn}
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <CompactPriceCell item={item} />
                        </div>

                        {LOADOUT_STAT_COLUMN_ORDER.map((stat) => (
                          <div key={stat} className="flex justify-center">
                            <CompactWorkspaceStatCell
                              stat={stat}
                              value={formatItemStatValue(item, stat)}
                            />
                          </div>
                        ))}
                      </div>

                      <div
                        className={`mt-2 text-[11px] font-semibold leading-relaxed ${
                          isActive ? 'text-slate-600' : 'text-slate-500'
                        }`}
                      >
                        {isActive
                          ? '右の候補から選ぶと、この行だけが更新されます'
                          : 'この行をクリックして変更'}
                      </div>
                      {isActive ? (
                        <div className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">
                          選んだ装備がここに反映されます
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              <div
                data-testid="total-stats-section"
                className="overflow-hidden rounded-[24px] border border-emerald-200 bg-emerald-50/65"
              >
                <div
                  className={`grid ${LOADOUT_WORKSPACE_GRID_COLUMNS} items-center gap-2 px-3 py-3`}
                >
                  <div className="min-w-0">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                      合計
                    </span>
                    <div className="mt-2 truncate text-[0.95rem] font-bold text-slate-900">
                      装備の合計
                    </div>
                    <div className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">
                      Rod / Line / Bobber / Enchant を足した値です
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <CompactPriceCell />
                  </div>

                  {LOADOUT_STAT_COLUMN_ORDER.map((stat) => (
                    <div key={stat} data-total-stat={stat} className="flex justify-center">
                      <CompactWorkspaceStatCell
                        stat={stat}
                        value={formatTotalStatValue(model, stat)}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-emerald-100 px-3 pb-3 pt-0 text-xs text-slate-600">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      model.enchantState === 'active'
                        ? 'border-emerald-200 bg-white text-emerald-700'
                        : model.enchantState === 'conditional'
                          ? 'border-sky-200 bg-white text-sky-700'
                          : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    {model.enchantStatusText ?? 'No Enchant selected'}
                  </span>
                  {model.inactiveEnchantReason ? (
                    <span className="leading-relaxed text-amber-700">
                      {model.inactiveEnchantReason}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="current-loadout-card" className="overflow-visible">
      <div className="relative overflow-visible rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,246,255,0.96))] shadow-[0_28px_64px_rgba(30,70,136,0.14)]">
        <div className="border-b border-ocean-100/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ocean-500 shadow-[0_0_8px_rgba(59,150,243,0.45)]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ocean-700">
              今の装備
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            変更したい行をクリックすると、その部位の候補が近くに開きます。
          </p>
        </div>

        <div className="px-3 py-4">
          <div
            data-testid="current-loadout-table"
            className="overflow-visible rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,248,255,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_14px_28px_rgba(30,70,136,0.08)]"
          >
            <div
              className={`hidden xl:grid ${desktopLoadoutGridColumns} xl:items-center xl:gap-2 xl:border-b xl:border-slate-200/80 xl:bg-white/65 xl:px-4 xl:py-3 xl:text-[11px] xl:font-bold xl:uppercase xl:tracking-[0.14em] xl:text-slate-500`}
            >
              <span>Slot</span>
              <span>Name</span>
              <span className="text-center text-slate-500">{PRICE_COLUMN_LABEL}</span>
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
                const detailsOpen = detailOpenSlots[slot];
                const detailButtonLabel = detailsOpen ? '詳細を閉じる' : '詳細を開く';
                const desktopDetailVisibleClass = detailsOpen
                  ? 'max-h-24 opacity-100'
                  : 'max-h-0 opacity-0';

                const activate = () => onActivate(slot);
                const handleDetailButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggleDetail(slot);
                };

                return (
                  <React.Fragment key={slot}>
                    <div
                      ref={(node) => {
                        rowRefs.current[slot] = node;
                      }}
                      data-slot={slot}
                      data-state={isActive ? 'active' : 'inactive'}
                      className={`relative overflow-visible transition-all duration-200 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ocean-300 ${
                        isActive
                          ? `${SLOT_ACTIVE_ROW_CLASS[slot]} z-20 bg-white/96`
                          : 'group bg-white/70 hover:bg-white/92 focus-within:bg-white/92'
                      } ${isUpdated ? 'animate-loadout-settle' : ''}`}
                    >
                      <button
                        type="button"
                        aria-label={`${LOADOUT_SLOT_LABELS[slot]} を選び直す`}
                        aria-pressed={isActive ? 'true' : 'false'}
                        className="absolute inset-0 z-10 rounded-[inherit] focus:outline-none"
                        onClick={activate}
                      />

                      <div className="relative px-4 py-4 xl:px-4 xl:py-4">
                        <div
                          className={`hidden xl:grid ${desktopLoadoutGridColumns} xl:items-center xl:gap-2`}
                        >
                          <div className="flex flex-col gap-2">
                            <SlotLabelChip slot={slot} label={LOADOUT_SLOT_LABELS[slot]} />
                            {isActive ? (
                              <div data-testid="slot-picker-anchor">
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
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-500">
                                クリックで変更
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <div
                                  className={`truncate font-bold text-slate-900 ${isActive ? 'text-[1.05rem]' : 'text-base'}`}
                                >
                                  {item.nameEn}
                                </div>
                              </div>
                              <DetailDisclosureButton
                                expanded={detailsOpen}
                                label={detailButtonLabel}
                                onClick={handleDetailButtonClick}
                              />
                            </div>
                            <div
                              data-loadout-detail={slot}
                              aria-hidden={!detailsOpen}
                              className={`mt-1 overflow-hidden text-sm leading-relaxed text-slate-600 transition-all duration-200 ${desktopDetailVisibleClass}`}
                            >
                              {formatItemDetail(item)}
                            </div>
                            <div
                              className={`mt-1 text-xs font-semibold ${isActive ? 'text-slate-600' : 'text-slate-500'}`}
                            >
                              {isActive
                                ? '開いた候補から選ぶとこの行が更新されます'
                                : 'この行をクリックして変更'}
                            </div>
                            {isActive ? (
                              <div className="mt-1 text-xs font-semibold text-slate-600">
                                選んだ装備がここに反映されます
                              </div>
                            ) : null}
                          </div>

                          <div className="flex justify-center border-l border-slate-100/80 pl-1">
                            <PriceCell item={item} />
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
                              {isActive ? '編集中' : 'クリックで候補を開く'}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">
                                {item.nameEn}
                              </div>
                              <DetailDisclosureButton
                                expanded={detailsOpen}
                                label={detailButtonLabel}
                                onClick={handleDetailButtonClick}
                              />
                            </div>
                            {detailsOpen ? (
                              <div
                                data-loadout-detail={slot}
                                aria-hidden={false}
                                className="mt-1 text-sm leading-relaxed text-slate-600"
                              >
                                {formatItemDetail(item)}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex max-w-full flex-wrap gap-1.5">
                            <PriceCell item={item} />
                            {(isActive ? STAT_THEME_ORDER : getHighlightedStats(item)).map(
                              (stat) => (
                                <StatBadge
                                  key={stat}
                                  stat={stat}
                                  value={formatItemStatValue(item, stat)}
                                />
                              ),
                            )}
                          </div>

                          <span
                            className={`text-xs font-semibold ${isActive ? 'text-slate-600' : 'text-slate-500'}`}
                          >
                            {isActive
                              ? '下の候補から選ぶとこの行が更新されます'
                              : 'この行をクリックして変更'}
                          </span>
                          {isActive ? (
                            <span className="text-xs font-semibold text-slate-600">
                              選んだ装備がここに反映されます
                            </span>
                          ) : null}
                        </div>

                        {isActive ? (
                          <div data-testid="slot-picker-anchor-fallback" className="hidden" />
                        ) : null}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div
                data-testid="total-stats-section"
                className="relative overflow-hidden bg-emerald-50/55"
              >
                <div
                  className={`hidden xl:grid ${desktopLoadoutGridColumns} xl:items-center xl:gap-2 xl:px-4 xl:py-4`}
                >
                  <div className="flex flex-col gap-2">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                      合計
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-base font-bold text-slate-900">装備の合計</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      Rod / Line / Bobber / Enchant を足した値です
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          model.enchantState === 'active'
                            ? 'border-emerald-200 bg-white text-emerald-700'
                            : model.enchantState === 'conditional'
                              ? 'border-sky-200 bg-white text-sky-700'
                              : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        {model.enchantStatusText ?? 'No Enchant selected'}
                      </span>
                      {model.inactiveEnchantReason ? (
                        <span className="text-xs leading-relaxed text-amber-700">
                          {model.inactiveEnchantReason}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex justify-center border-l border-slate-100/80 pl-1">
                    <span className="inline-flex min-w-[4.5rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-400">
                      —
                    </span>
                  </div>

                  {LOADOUT_STAT_COLUMN_ORDER.map((stat) => (
                    <div
                      key={stat}
                      data-total-stat={stat}
                      className="flex justify-center border-l border-slate-100/80 pl-1"
                    >
                      <StatBadge stat={stat} value={formatTotalStatValue(model, stat)} />
                    </div>
                  ))}
                </div>

                <div className="space-y-3 px-4 py-4 xl:hidden">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                      合計
                    </span>
                    <span className="text-sm font-semibold text-slate-900">装備の合計</span>
                  </div>
                  <div className="text-xs leading-relaxed text-slate-500">
                    Rod / Line / Bobber / Enchant を足した値です
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        model.enchantState === 'active'
                          ? 'border-emerald-200 bg-white text-emerald-700'
                          : model.enchantState === 'conditional'
                            ? 'border-sky-200 bg-white text-sky-700'
                            : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {model.enchantStatusText ?? 'No Enchant selected'}
                    </span>
                    {model.inactiveEnchantReason ? (
                      <span className="text-xs leading-relaxed text-amber-700">
                        {model.inactiveEnchantReason}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex max-w-full flex-wrap gap-1.5">
                    {LOADOUT_STAT_COLUMN_ORDER.map((stat) => (
                      <div key={stat} data-total-stat={stat}>
                        <StatBadge stat={stat} value={formatTotalStatValue(model, stat)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadoutPickerPanel<T extends EquipmentItem | EnchantItem>({
  slot,
  params,
  model,
  items,
  selectedId,
  onSelect,
  onClose,
  showMobileSummary = false,
  testId = 'slot-picker-panel',
}: {
  slot: LoadoutSlot;
  params: CalculatorParams;
  model: DerivedModelSummary;
  items: readonly T[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  showMobileSummary?: boolean;
  testId?: string;
}) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortMode, setSortMode] = React.useState<PickerPresetSortMode>('ev-desc');
  const [columnSort, setColumnSort] = React.useState<PickerColumnSort | null>(null);
  const [showOnlyImproved, setShowOnlyImproved] = React.useState(false);
  const [selectedLocations, setSelectedLocations] = React.useState<string[]>([]);
  const [priceBand, setPriceBand] = React.useState<PickerPriceBand>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [priceMinInput, setPriceMinInput] = React.useState('');
  const [priceMaxInput, setPriceMaxInput] = React.useState('');
  const [minimumStatInputs, setMinimumStatInputs] = React.useState<PickerStatFilterInputs>(
    createEmptyStatFilterInputs,
  );
  const [maximumStatInputs, setMaximumStatInputs] = React.useState<PickerStatFilterInputs>(
    createEmptyStatFilterInputs,
  );
  const [selectedRecommendationFilters, setSelectedRecommendationFilters] = React.useState<
    PickerRecommendationFilter[]
  >([]);
  const [requiredImprovementStats, setRequiredImprovementStats] = React.useState<StatThemeKey[]>(
    [],
  );
  const rankedEntries = React.useMemo(() => rankSlot(params, slot), [params, slot]);
  const selectedEntry = rankedEntries.find((entry) => entry.item.id === selectedId);
  const selectedItem = selectedEntry?.item ?? items.find((item) => item.id === selectedId);
  const selectedLoadoutItems = React.useMemo(
    () => getSelectedLoadoutItems(params.loadout),
    [params.loadout],
  );
  const minimumStatFilters = React.useMemo(
    () =>
      LOADOUT_STAT_COLUMN_ORDER.reduce(
        (acc, stat) => {
          acc[stat] = parseOptionalFilterNumber(minimumStatInputs[stat]);
          return acc;
        },
        {} as Record<StatThemeKey, number | null>,
      ),
    [minimumStatInputs],
  );
  const maximumStatFilters = React.useMemo(
    () =>
      LOADOUT_STAT_COLUMN_ORDER.reduce(
        (acc, stat) => {
          acc[stat] = parseOptionalFilterNumber(maximumStatInputs[stat]);
          return acc;
        },
        {} as Record<StatThemeKey, number | null>,
      ),
    [maximumStatInputs],
  );
  const priceMin = React.useMemo(() => parseOptionalFilterNumber(priceMinInput), [priceMinInput]);
  const priceMax = React.useMemo(() => parseOptionalFilterNumber(priceMaxInput), [priceMaxInput]);
  const activeAdvancedFilterCount = React.useMemo(() => {
    let count = 0;
    count += selectedLocations.length;
    if (priceMin !== null) count += 1;
    if (priceMax !== null) count += 1;
    for (const stat of LOADOUT_STAT_COLUMN_ORDER) {
      if (minimumStatFilters[stat] !== null) {
        count += 1;
      }
      if (maximumStatFilters[stat] !== null) {
        count += 1;
      }
    }
    return count;
  }, [maximumStatFilters, minimumStatFilters, priceMax, priceMin, selectedLocations.length]);
  const sourceOrder = React.useMemo(
    () => new Map(items.map((item, index) => [item.id, index])),
    [items],
  );
  const locationOptions = React.useMemo(() => {
    const labels = new Set<string>();
    for (const item of items) {
      labels.add(item.location);
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b, 'en'));
  }, [items]);
  const locationFilterValue =
    selectedLocations.length === 0
      ? 'all'
      : selectedLocations.length === 1
        ? selectedLocations[0]
        : MULTIPLE_LOCATIONS_VALUE;
  const filteredEntries = searchQuery.trim()
    ? rankedEntries.filter((entry) => {
        const term = searchQuery.toLowerCase();
        const item = entry.item;
        return (
          item.nameEn.toLowerCase().includes(term) ||
          item.location.toLowerCase().includes(term) ||
          ('specialEffect' in item && item.specialEffect?.toLowerCase().includes(term))
        );
      })
    : rankedEntries;
  const recommendationTagMap = buildRecommendationTagMap(filteredEntries, selectedEntry);
  const recommendationHighlights = buildRecommendationHighlights(
    filteredEntries,
    filteredEntries.find((entry) => entry.item.id === selectedId) ?? selectedEntry,
  );
  const toggleLocationSelection = (location: string) => {
    setSelectedLocations((current) =>
      current.includes(location)
        ? current.filter((entry) => entry !== location)
        : [...current, location].sort((a, b) => a.localeCompare(b, 'en')),
    );
  };
  const toggleRecommendationFilterSelection = (filter: PickerRecommendationFilter) => {
    setSelectedRecommendationFilters((current) =>
      current.includes(filter)
        ? current.filter((entry) => entry !== filter)
        : [...current, filter].sort(
            (a, b) =>
              PICKER_RECOMMENDATION_FILTERS.indexOf(a) - PICKER_RECOMMENDATION_FILTERS.indexOf(b),
          ),
    );
  };
  const candidateEntries = sortRankEntries(
    filteredEntries.filter((entry) => {
      if (entry.item.id === selectedId) {
        return false;
      }
      if (selectedLocations.length > 0 && !selectedLocations.includes(entry.item.location)) {
        return false;
      }
      if (!matchesPriceBand(entry.item.price, priceBand)) {
        return false;
      }
      if (priceMin !== null && entry.item.price < priceMin) {
        return false;
      }
      if (priceMax !== null && entry.item.price > priceMax) {
        return false;
      }
      const recommendationTags = recommendationTagMap.get(entry.item.id) ?? [];
      if (!matchesRecommendationFilters(recommendationTags, selectedRecommendationFilters)) {
        return false;
      }
      if (
        LOADOUT_STAT_COLUMN_ORDER.some((stat) => {
          const minimum = minimumStatFilters[stat];
          return minimum !== null && getItemStatValue(entry.item, stat) < minimum;
        })
      ) {
        return false;
      }
      if (
        LOADOUT_STAT_COLUMN_ORDER.some((stat) => {
          const maximum = maximumStatFilters[stat];
          return maximum !== null && getItemStatValue(entry.item, stat) > maximum;
        })
      ) {
        return false;
      }
      if (
        selectedItem &&
        requiredImprovementStats.some(
          (stat) => !hasPositiveStatDelta(entry.item, selectedItem, stat),
        )
      ) {
        return false;
      }
      if (!showOnlyImproved || !selectedEntry) {
        return true;
      }
      return entry.expectedValuePerHour > selectedEntry.expectedValuePerHour;
    }),
    sortMode,
    selectedEntry,
    sourceOrder,
    columnSort,
  );
  const activeFilterChips = React.useMemo<PickerActiveFilterChip[]>(() => {
    const chips: PickerActiveFilterChip[] = [];

    for (const recommendationFilter of selectedRecommendationFilters) {
      chips.push({
        id: `recommendation-${recommendationFilter}`,
        label: formatRecommendationFilterLabel(recommendationFilter),
        onRemove: () =>
          setSelectedRecommendationFilters((current) =>
            current.filter((entry) => entry !== recommendationFilter),
          ),
      });
    }

    for (const location of selectedLocations) {
      chips.push({
        id: `location-${location}`,
        label: `入手場所: ${location}`,
        onRemove: () =>
          setSelectedLocations((current) => current.filter((entry) => entry !== location)),
      });
    }

    if (priceBand !== 'all') {
      chips.push({
        id: `price-band-${priceBand}`,
        label: formatPriceBandLabel(priceBand),
        onRemove: () => setPriceBand('all'),
      });
    }

    if (showOnlyImproved) {
      chips.push({
        id: 'only-improved',
        label: 'いまより良い候補だけ',
        onRemove: () => setShowOnlyImproved(false),
      });
    }

    if (priceMin !== null) {
      chips.push({
        id: 'price-min',
        label: `${PRICE_COLUMN_LABEL} 最低値 ${priceMin.toLocaleString()}G`,
        onRemove: () => setPriceMinInput(''),
      });
    }

    if (priceMax !== null) {
      chips.push({
        id: 'price-max',
        label: `${PRICE_COLUMN_LABEL} 最高値 ${priceMax.toLocaleString()}G`,
        onRemove: () => setPriceMaxInput(''),
      });
    }

    for (const stat of LOADOUT_STAT_COLUMN_ORDER) {
      const minimum = minimumStatFilters[stat];
      if (minimum === null) {
      } else {
        chips.push({
          id: `minimum-${stat}`,
          label: `${STAT_THEME[stat].shortLabel} 最低値 ${minimum}`,
          onRemove: () =>
            setMinimumStatInputs((current) => ({
              ...current,
              [stat]: '',
            })),
        });
      }
      const maximum = maximumStatFilters[stat];
      if (maximum === null) {
        continue;
      }
      chips.push({
        id: `maximum-${stat}`,
        label: `${STAT_THEME[stat].shortLabel} 最高値 ${maximum}`,
        onRemove: () =>
          setMaximumStatInputs((current) => ({
            ...current,
            [stat]: '',
          })),
      });
    }

    for (const stat of requiredImprovementStats) {
      chips.push({
        id: `required-${stat}`,
        label: `${STAT_THEME[stat].shortLabel}+ だけ`,
        onRemove: () =>
          setRequiredImprovementStats((current) => current.filter((entry) => entry !== stat)),
      });
    }

    return chips;
  }, [
    minimumStatFilters,
    maximumStatFilters,
    priceBand,
    priceMax,
    priceMin,
    selectedRecommendationFilters,
    requiredImprovementStats,
    selectedLocations,
    showOnlyImproved,
  ]);

  const toggleColumnSort = (key: PickerColumnSortKey) => {
    setColumnSort((current) => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  return (
    <div
      key={slot}
      data-testid={testId}
      className="animate-inventory-slide-in relative overflow-hidden bg-white"
    >
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(246,250,255,0.98),rgba(236,245,255,0.98))] px-5 pb-3 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <SlotLabelChip slot={slot} label={LOADOUT_SLOT_LABELS[slot]} />
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                {LOADOUT_SLOT_LABELS[slot]} を編集中
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-900">
              {LOADOUT_SLOT_LABELS[slot]} の候補
            </h3>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
              左の「いまの装備」を見たまま、この候補と比べて選べます。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="whitespace-nowrap">閉じる</span>
          </button>
        </div>
        {showMobileSummary ? (
          <div
            data-testid="mobile-current-loadout-summary"
            className="mt-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ocean-500" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ocean-700">
                いまの装備
              </span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {LOADOUT_SLOT_ORDER.map((summarySlot) => {
                const item = selectedLoadoutItems[summarySlot];
                return (
                  <div
                    key={summarySlot}
                    className={`rounded-xl border px-3 py-2 ${summarySlot === slot ? 'border-ocean-300 bg-ocean-50/70' : 'border-slate-200 bg-slate-50/75'}`}
                  >
                    <div className="flex items-center gap-2">
                      <SlotLabelChip slot={summarySlot} label={LOADOUT_SLOT_LABELS[summarySlot]} />
                      {summarySlot === slot ? (
                        <span className="text-[10px] font-semibold text-ocean-700">比較中</span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{item.nameEn}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <CompactPriceCell item={item} />
                      {getHighlightedStats(item).map((stat) => (
                        <CompactWorkspaceStatCell
                          key={`${summarySlot}-${stat}`}
                          stat={stat}
                          value={formatItemStatValue(item, stat)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-900">装備の合計</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LOADOUT_STAT_COLUMN_ORDER.map((stat) => (
                  <div key={`mobile-total-${stat}`} data-total-stat={stat}>
                    <StatBadge stat={stat} value={formatTotalStatValue(model, stat)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <div className="mt-3 space-y-3">
          {recommendationHighlights.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {recommendationHighlights.map((highlight) => (
                <div
                  key={highlight.id}
                  className="rounded-2xl border border-ocean-200 bg-white/90 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-ocean-700">
                    {highlight.title}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {highlight.item.nameEn}
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-600">
                    {highlight.detail}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <input
            type="text"
            placeholder="名前・入手場所・効果で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-500 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-opacity-30"
            aria-label={`${LOADOUT_SLOT_LABELS[slot]} を検索`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              並び順
              <select
                value={sortMode}
                onChange={(event) => {
                  setSortMode(event.target.value as PickerPresetSortMode);
                  setColumnSort(null);
                }}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/25"
                aria-label="候補の並び順"
              >
                <option value="default">初期設定順</option>
                <option value="ev-desc">期待値/時間が高い順</option>
                <option value="delta-desc">いまより伸びる順</option>
                <option value="price-asc">安い順</option>
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
              <span>おすすめ</span>
              {PICKER_RECOMMENDATION_FILTERS.map((filter) => {
                const active = selectedRecommendationFilters.includes(filter);
                const label = formatRecommendationFilterLabel(filter).replace('おすすめ: ', '');
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => toggleRecommendationFilterSelection(filter)}
                    aria-pressed={active}
                    aria-label={`おすすめタグ: ${label}`}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-ocean-300 bg-ocean-100 text-ocean-800'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              入手場所
              <select
                value={locationFilterValue}
                onChange={(event) =>
                  setSelectedLocations(event.target.value === 'all' ? [] : [event.target.value])
                }
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/25"
                aria-label="候補の入手場所"
              >
                <option value="all">すべて</option>
                {selectedLocations.length > 1 ? (
                  <option value={MULTIPLE_LOCATIONS_VALUE}>複数選択中</option>
                ) : null}
                {locationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              価格帯
              <select
                value={priceBand}
                onChange={(event) => setPriceBand(event.target.value as PickerPriceBand)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/25"
                aria-label="候補の価格帯"
              >
                <option value="all">すべて</option>
                <option value="free">無料</option>
                <option value="budget">1万G まで</option>
                <option value="mid">1万G〜10万G</option>
                <option value="premium">10万G 超</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <input
                type="checkbox"
                checked={showOnlyImproved}
                onChange={(event) => setShowOnlyImproved(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                aria-label="いまより期待値が上がる候補だけを表示"
              />
              いまより良い候補だけ
            </label>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((current) => !current)}
              aria-expanded={showAdvancedFilters}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <span>さらに絞る</span>
              {activeAdvancedFilterCount > 0 ? (
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                  {activeAdvancedFilterCount}
                </span>
              ) : null}
            </button>
          </div>
          {activeFilterChips.length > 0 ? (
            <div
              data-testid="active-filter-chips"
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2"
            >
              <span className="text-[11px] font-semibold text-slate-500">
                いま効いている絞り込み
              </span>
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  <span>{chip.label}</span>
                  <span aria-hidden="true" className="text-slate-400">
                    ×
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectedRecommendationFilters([]);
                  setSelectedLocations([]);
                  setPriceBand('all');
                  setShowOnlyImproved(false);
                  setPriceMinInput('');
                  setPriceMaxInput('');
                  setMinimumStatInputs(createEmptyStatFilterInputs());
                  setMaximumStatInputs(createEmptyStatFilterInputs());
                  setRequiredImprovementStats([]);
                }}
                className="ml-auto rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
              >
                すべて解除
              </button>
            </div>
          ) : null}
          {showAdvancedFilters ? (
            <div
              data-testid="advanced-candidate-filters"
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
            >
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">おすすめタグを複数選ぶ</div>
                <div className="flex flex-wrap gap-2">
                  {PICKER_RECOMMENDATION_FILTERS.map((filter) => {
                    const active = selectedRecommendationFilters.includes(filter);
                    const label = formatRecommendationFilterLabel(filter).replace('おすすめ: ', '');
                    return (
                      <button
                        key={`recommendation-toggle-${filter}`}
                        type="button"
                        onClick={() => toggleRecommendationFilterSelection(filter)}
                        aria-pressed={active}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? 'border-ocean-300 bg-ocean-100 text-ocean-800'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  複数選ぶと、そのどれかに当てはまる候補を残します。
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">入手場所を複数選ぶ</div>
                <div className="flex flex-wrap gap-2">
                  {locationOptions.map((location) => {
                    const active = selectedLocations.includes(location);
                    return (
                      <button
                        key={`location-toggle-${location}`}
                        type="button"
                        onClick={() => toggleLocationSelection(location)}
                        aria-pressed={active}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? 'border-ocean-300 bg-ocean-100 text-ocean-800'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {location}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  複数の入手場所をまとめて残したいときに使います。何も選ばないと、すべて残します。
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  <span>{PRICE_COLUMN_LABEL} 最低値</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={priceMinInput}
                    onChange={(event) => setPriceMinInput(event.target.value)}
                    placeholder="0"
                    aria-label={`${PRICE_COLUMN_LABEL} 最低値`}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/25"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  <span>{PRICE_COLUMN_LABEL} 最高値</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={priceMaxInput}
                    onChange={(event) => setPriceMaxInput(event.target.value)}
                    placeholder="上限なし"
                    aria-label={`${PRICE_COLUMN_LABEL} 最高値`}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/25"
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {LOADOUT_STAT_COLUMN_ORDER.map((stat) => {
                  const theme = STAT_THEME[stat];
                  return (
                    <div
                      key={`range-${stat}`}
                      className="space-y-2 rounded-2xl border border-slate-200 bg-white px-3 py-3"
                    >
                      <div className="text-xs font-semibold" style={{ color: theme.surfaceText }}>
                        {theme.shortLabel}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1 text-[11px] font-semibold text-slate-500">
                          <span>最低値</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={minimumStatInputs[stat]}
                            onChange={(event) =>
                              setMinimumStatInputs((current) => ({
                                ...current,
                                [stat]: event.target.value,
                              }))
                            }
                            placeholder="なし"
                            aria-label={`${theme.shortLabel} 最低値`}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/25"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] font-semibold text-slate-500">
                          <span>最高値</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={maximumStatInputs[stat]}
                            onChange={(event) =>
                              setMaximumStatInputs((current) => ({
                                ...current,
                                [stat]: event.target.value,
                              }))
                            }
                            placeholder="なし"
                            aria-label={`${theme.shortLabel} 最高値`}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/25"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs leading-relaxed text-slate-500">
                  価格やステータスの上下限で、見たい候補だけに絞れます。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRecommendationFilters([]);
                    setSelectedLocations([]);
                    setPriceMinInput('');
                    setPriceMaxInput('');
                    setMinimumStatInputs(createEmptyStatFilterInputs());
                    setMaximumStatInputs(createEmptyStatFilterInputs());
                  }}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
                >
                  絞り込みをリセット
                </button>
              </div>
            </div>
          ) : null}
          {selectedItem ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">この値が上がる候補だけ</span>
              {LOADOUT_STAT_COLUMN_ORDER.map((stat) => {
                const active = requiredImprovementStats.includes(stat);
                const theme = STAT_THEME[stat];
                return (
                  <button
                    key={stat}
                    type="button"
                    onClick={() =>
                      setRequiredImprovementStats((current) =>
                        current.includes(stat)
                          ? current.filter((entry) => entry !== stat)
                          : [...current, stat],
                      )
                    }
                    aria-pressed={active}
                    aria-label={`${theme.shortLabel} が上がる候補だけを表示`}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      active ? 'shadow-sm' : 'bg-white'
                    }`}
                    style={{
                      borderColor: active ? theme.cardBorder : 'rgba(148,163,184,0.35)',
                      backgroundColor: active ? theme.cardBackground : 'rgba(255,255,255,0.92)',
                      color: active ? theme.surfaceText : '#475569',
                    }}
                  >
                    {theme.shortLabel}+
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div
        data-testid="picker-column-header"
        className="border-b border-slate-200 bg-white px-4 shadow-[0_1px_0_rgba(226,232,240,1)]"
      >
        <div className="px-2 pt-2 text-[11px] font-medium text-slate-500">
          候補の値と、いまの装備との差を同じ列で見比べられます。
        </div>
        <div
          className={`grid ${PICKER_GRID_COLUMNS} items-center bg-white px-0 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.14em]`}
        >
          <div className="px-2 text-left text-slate-500">選択</div>
          <div className="px-2 text-left">
            <PickerHeaderSortButton
              label="名前"
              onClick={() => toggleColumnSort('name')}
              active={columnSort?.key === 'name'}
              direction={columnSort?.key === 'name' ? columnSort.direction : undefined}
              textColorClass="text-slate-500"
            />
          </div>
          <div className="px-1 text-center">
            <PickerHeaderSortButton
              label={PRICE_COLUMN_LABEL}
              onClick={() => toggleColumnSort('price')}
              active={columnSort?.key === 'price'}
              direction={columnSort?.key === 'price' ? columnSort.direction : undefined}
              textColorClass="text-slate-500"
            />
          </div>
          <div className="px-1 text-center">
            <PickerHeaderSortButton
              label="Lk"
              onClick={() => toggleColumnSort('luck')}
              active={columnSort?.key === 'luck'}
              direction={columnSort?.key === 'luck' ? columnSort.direction : undefined}
              textColorClass="text-amber-700"
            />
          </div>
          <div className="px-1 text-center">
            <PickerHeaderSortButton
              label="Str"
              onClick={() => toggleColumnSort('strength')}
              active={columnSort?.key === 'strength'}
              direction={columnSort?.key === 'strength' ? columnSort.direction : undefined}
              textColorClass="text-rose-700"
            />
          </div>
          <div className="px-1 text-center">
            <PickerHeaderSortButton
              label="Exp"
              onClick={() => toggleColumnSort('expertise')}
              active={columnSort?.key === 'expertise'}
              direction={columnSort?.key === 'expertise' ? columnSort.direction : undefined}
              textColorClass="text-sky-700"
            />
          </div>
          <div className="px-1 text-center">
            <PickerHeaderSortButton
              label="Atk"
              onClick={() => toggleColumnSort('attractionRate')}
              active={columnSort?.key === 'attractionRate'}
              direction={columnSort?.key === 'attractionRate' ? columnSort.direction : undefined}
              textColorClass="text-emerald-700"
            />
          </div>
          <div className="px-1 text-center">
            <PickerHeaderSortButton
              label="BigC"
              onClick={() => toggleColumnSort('bigCatchRate')}
              active={columnSort?.key === 'bigCatchRate'}
              direction={columnSort?.key === 'bigCatchRate' ? columnSort.direction : undefined}
              textColorClass="text-amber-700"
            />
          </div>
          <div className="px-1 text-center">
            <PickerHeaderSortButton
              label="MaxWt"
              onClick={() => toggleColumnSort('maxWeight')}
              active={columnSort?.key === 'maxWeight'}
              direction={columnSort?.key === 'maxWeight' ? columnSort.direction : undefined}
              textColorClass="text-violet-700"
            />
          </div>
        </div>
      </div>

      <div
        data-testid="picker-scroll-body"
        className="relative z-0 max-h-[calc(68vh-2.5rem)] overflow-auto bg-white"
      >
        {selectedItem ? (
          <div
            data-testid="picker-current-item-row"
            className="sticky top-0 z-10 border-b border-emerald-200 bg-emerald-50/95 px-4 backdrop-blur-sm"
          >
            <div className="px-2 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              いまの装備
            </div>
            <div className={`grid ${PICKER_GRID_COLUMNS} items-center`}>
              <div className="px-2 py-3">
                <span className="whitespace-nowrap rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                  現在
                </span>
              </div>
              <div className="min-w-0 px-2 py-3">
                <div className="text-sm font-semibold leading-5 text-gray-900">
                  {selectedItem.nameEn}
                </div>
                <div className="mt-0.5 break-words text-xs leading-5 text-gray-600">
                  {formatItemDetail(selectedItem)}
                </div>
              </div>
              <div className="px-1 py-3 text-center">
                <PriceCell item={selectedItem} />
              </div>
              {LOADOUT_STAT_COLUMN_ORDER.map((stat) => {
                const theme = STAT_THEME[stat];
                return (
                  <div key={stat} className="px-1 py-3 text-center">
                    <span
                      className="inline-flex min-w-[3.25rem] items-center justify-center rounded-full border px-2 py-1 text-[11px] font-semibold"
                      style={{
                        borderColor: theme.cardBorder,
                        backgroundColor: theme.cardBackground,
                        color: theme.surfaceText,
                      }}
                    >
                      {formatItemStatValue(selectedItem, stat)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {selectedItem && candidateEntries.length > 0 ? (
          <div id={`loadout-picker-${slot}`} className="bg-white px-4 pb-3">
            {candidateEntries.map((entry) => {
              const item = entry.item;
              const selected = item.id === selectedId;
              const selectItem = () => onSelect(item.id);
              const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectItem();
                }
              };

              return (
                <div
                  key={item.id}
                  data-testid="picker-option-row"
                  tabIndex={0}
                  role="button"
                  aria-pressed={selected}
                  aria-label={selected ? `${item.nameEn} は使用中` : `${item.nameEn} を選ぶ`}
                  onClick={selectItem}
                  onKeyDown={handleKeyDown}
                  className={`grid ${PICKER_GRID_COLUMNS} cursor-pointer items-center border-b border-slate-200 outline-none transition-all duration-150 ${
                    selected
                      ? 'bg-emerald-50/70 shadow-[inset_4px_0_0_rgba(16,185,129,0.9),inset_0_0_0_1px_rgba(16,185,129,0.18)]'
                      : 'bg-white hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-ocean-400'
                  }`}
                >
                  <div className="px-2 py-3">
                    <LoadoutSelectionBadge selected={selected} />
                  </div>
                  <div className="min-w-0 px-2 py-3">
                    <div className="text-sm font-semibold leading-5 text-gray-900">
                      {item.nameEn}
                    </div>
                    <div className="mt-0.5 break-words text-xs leading-5 text-gray-500">
                      {formatItemDetail(item)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(recommendationTagMap.get(item.id) ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {selectedEntry ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center rounded-full border border-ocean-200 bg-ocean-50 px-2 py-0.5 text-[10px] font-semibold text-ocean-700">
                          期待値/時間 {formatCurrency(entry.expectedValuePerHour)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${deltaBadgeClass(
                            formatSignedDisplayNumber(
                              entry.expectedValuePerHour - selectedEntry.expectedValuePerHour,
                            ),
                          )}`}
                        >
                          {formatEvDeltaPercent(
                            selectedEntry.expectedValuePerHour,
                            entry.expectedValuePerHour,
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="px-1 py-3 text-center">
                    <ComparisonPriceCell item={item} baseItem={selectedItem} />
                  </div>
                  {LOADOUT_STAT_COLUMN_ORDER.map((stat) => {
                    return (
                      <div key={stat} className="px-1 py-3 text-center">
                        <ComparisonStatCell item={item} baseItem={selectedItem} stat={stat} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="text-sm font-semibold text-slate-700">見つかりません</div>
            <p className="mt-1 text-xs text-slate-500">
              {showOnlyImproved
                ? 'いまより良い候補が見つかりません。'
                : '条件に合う候補が見つかりません。絞り込みを少し緩めてみてください。'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ParameterForm({ params, model, onChange }: ParameterFormProps) {
  const [activeSlot, setActiveSlot] = React.useState<LoadoutSlot | null>(null);
  const [recentlyUpdatedSlot, setRecentlyUpdatedSlot] = React.useState<LoadoutSlot | null>(null);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const advanceTimerRef = React.useRef<number | null>(null);
  const clearRecentUpdateTimerRef = React.useRef<number | null>(null);
  const [isDesktop, setIsDesktop] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    if (typeof window.matchMedia !== 'function') return true;
    return window.matchMedia('(min-width: 1280px)').matches;
  });
  const pickerPanelRef = React.useRef<HTMLDivElement | null>(null);

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
    setActiveSlot((current) => (current === slot ? null : slot));
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

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(min-width: 1280px)');
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
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
  const activePickerPanel = activeSlot ? (
    <LoadoutPickerPanel
      slot={activeSlot}
      params={params}
      model={model}
      items={loadoutItems[activeSlot]}
      selectedId={params.loadout[LOADOUT_SLOT_FIELDS[activeSlot]]}
      onSelect={(id) => handleLoadoutSelect(activeSlot, id)}
      onClose={() => setActiveSlot(null)}
      showMobileSummary={!isDesktop}
      testId="slot-picker-panel"
    />
  ) : null;
  const showComparisonWorkspace = isDesktop && activeSlot !== null;
  const showStackedPicker = activeSlot !== null && !showComparisonWorkspace;

  return (
    <div className="space-y-5">
      <section className="animate-slide-in-up space-y-5 rounded-[28px] border border-ocean-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(232,243,255,0.96))] p-5 shadow-[0_24px_64px_rgba(30,70,136,0.12)]">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">いまの装備</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            行をクリックすると、その部位を右の候補一覧と比べながら選び直せます。
          </p>
        </div>

        <div
          className={`relative ${showComparisonWorkspace ? 'grid gap-5 xl:grid-cols-[38rem_minmax(0,1fr)] 2xl:grid-cols-[40rem_minmax(0,1fr)] xl:items-start' : 'space-y-5'}`}
        >
          <div className="min-w-0">
            <CurrentLoadoutTable
              activeSlot={activeSlot}
              selectedIds={{
                rod: params.loadout.rodId,
                line: params.loadout.lineId,
                bobber: params.loadout.bobberId,
                enchant: params.loadout.enchantId,
              }}
              model={model}
              recentlyUpdatedSlot={recentlyUpdatedSlot}
              onActivate={activateSlot}
              onCloseActivePicker={() => setActiveSlot(null)}
              pickerContainerRef={pickerPanelRef}
              comparisonMode={showComparisonWorkspace}
            />
          </div>

          {showComparisonWorkspace ? (
            <div
              ref={pickerPanelRef}
              data-testid="slot-picker-workspace-shell"
              className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] xl:sticky xl:top-6"
            >
              {activePickerPanel}
            </div>
          ) : null}

          {showStackedPicker ? (
            <div
              ref={pickerPanelRef}
              data-testid="slot-picker-stacked-shell"
              className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
            >
              {activePickerPanel}
            </div>
          ) : null}
        </div>
      </section>

      {/* ─── Conditions ─── */}
      <section className="animate-slide-in-up space-y-4 rounded-[20px] border border-slate-700/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(241,245,255,0.99))] p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">釣り場と条件</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            そのままでも始められます。釣り場はおすすめを自動で選び、時間帯と天気は
            平均して計算します。
          </p>
        </div>

        <div>
          <label htmlFor={fieldId.areaId} className="mb-1 block text-sm font-medium text-gray-700">
            釣り場
          </label>
          <select
            id={fieldId.areaId}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
            value={params.areaId}
            onChange={(event) => handleChange('areaId', event.target.value)}
          >
            <option value={BEST_AREA_ID}>おすすめの釣り場を自動で選ぶ</option>
            {FISHING_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.nameEn}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            今の装備でいちばん稼ぎやすい釣り場を選びます。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor={fieldId.timeOfDay}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              時間帯
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
              平均で見る を選ぶと、すべての時間帯をならして計算します。
            </p>
          </div>

          <div>
            <label
              htmlFor={fieldId.weatherType}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              天気
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
              平均で見る を選ぶと、すべての天気をならして計算します。
            </p>
          </div>
        </div>
      </section>

      {/* ─── Play speed ─── */}
      <section className="animate-slide-in-up space-y-4 rounded-[20px] border border-slate-700/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(241,245,255,0.99))] p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">プレイ速度</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            装備の影響に、あなたの反応速度とミス率を足し引きします。
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
              ミス率
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
          <div className="mb-2 font-semibold text-gray-800">この装備ならこのくらい</div>
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

      {/* ─── Advanced settings ─── */}
      <div className="animate-slide-in-up rounded-[20px] border border-slate-700/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(241,245,255,0.99))] p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setAdvancedOpen((current) => !current)}
          aria-expanded={advancedOpen}
          aria-controls="advanced-settings-panel"
        >
          <span className="text-sm font-semibold text-gray-800">
            詳細設定
            <span className="ml-2 text-xs font-normal text-gray-500">必要なときだけ開く</span>
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
                  上の条件から、このページが計算に使っている値です。確認できているものと、
                  まだ推定のものを分けて表示しています。
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
                    <div className="mb-1 font-semibold">まだ推定している部分</div>
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
