'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdSlot } from '@/components/AdSlot';
import { BuildTabs } from '@/components/Calculator/BuildTabs';
import { ComparisonSummary } from '@/components/Calculator/ComparisonSummary';
import { DistributionChart } from '@/components/Calculator/DistributionChart';
import {
  CALCULATOR_GOAL_COPY,
  CalculatorGoal,
  GoalModePicker,
} from '@/components/Calculator/GoalModePicker';
import { OptimizerView } from '@/components/Calculator/OptimizerView';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { RankingView } from '@/components/Calculator/RankingView';
import { ResultTable } from '@/components/Calculator/ResultTable';
import { CompareTarget, SLOT_THEME } from '@/components/Calculator/slotTheme';
import { WarningBanner } from '@/components/Calculator/WarningBanner';
import { AREA_MAP, RARITY_LABELS, TIME_OF_DAY_LABELS, WEATHER_TYPE_LABELS } from '@/data/fish';
import {
  BEST_AREA_ID,
  calculateDistribution,
  formatCurrency,
  getDefaultParams,
} from '@/lib/calculator';
import { rankAllSlots, RankSlot } from '@/lib/ranking';
import {
  createBuildFrom,
  createDefaultBuild,
  decodeUrlStateWithReason,
  duplicateBuild,
  encodeUrlState,
  removeBuild,
  renameBuild,
  updateBuildParams,
} from '@/lib/url-state';
import { BuildConfig, CalculatorParams, DistributionResult, Rarity } from '@/types';

const SLOT_LABELS: Record<RankSlot, string> = {
  rod: 'Rod',
  line: 'Line',
  bobber: 'Bobber',
  enchant: 'Enchant',
};

const ALL_SLOTS: RankSlot[] = ['rod', 'line', 'bobber', 'enchant'];

const GOAL_HELPER_COPY: Record<CalculatorGoal, string> = {
  ranking: '変えたい欄だけを入れ替え、残りを固定したまま順位を見ます。',
  upgrade: '変えたいスロットを選び、気になる候補だけを比較へ送ります。',
  compare: '追加した候補を並べて、どれが一番伸びるかを選びます。',
  summary: 'いまの条件でどれだけ稼げるかを、主要指標から先に確認します。',
  fish: '上の条件に合う魚を見て、どの魚が収益を支えているかを確認します。',
};

const SETUP_SECTION_COPY: Record<CalculatorGoal, { title: string; description: string }> = {
  ranking: {
    title: '2. ランキングの条件と基準装備を決める',
    description: 'どの条件で順位を見るかを、装備・釣り場・時間帯・天気から決めます。',
  },
  upgrade: {
    title: '2. 今の装備と比較条件を決める',
    description: 'いま使っている装備と条件を入れると、次に試す候補をその下に出します。',
  },
  compare: {
    title: '2. 保存した候補を比べる条件を決める',
    description: '比較一覧にある候補を、同じ釣り場と同じ前提で比べられるように整えます。',
  },
  summary: {
    title: '2. 時給を見る条件と基準装備を決める',
    description: 'この装備でどれくらい稼げるかを見るための条件を、先にここで決めます。',
  },
  fish: {
    title: '2. 魚の内訳を見る条件と基準装備を決める',
    description: 'どの魚が期待値を支えているかを見るために、先に装備と条件をそろえます。',
  },
};

const RESULT_SECTION_COPY: Record<
  Exclude<CalculatorGoal, 'ranking' | 'upgrade'>,
  { title: string; description: string }
> = {
  compare: {
    title: '選択中の候補の結果',
    description: '比較一覧で選んだ候補の数値です。',
  },
  summary: {
    title: 'いまの装備の結果',
    description: '主要指標は期待値/時間です。',
  },
  fish: {
    title: '魚一覧の前に見る数値',
    description: 'この数値を見ながら、下の魚一覧で収益の内訳を確認します。',
  },
};

function formatSelectedTimeLabel(value: CalculatorParams['timeOfDay']): string {
  return value === 'any' ? '平均で見る' : TIME_OF_DAY_LABELS[value];
}

function formatSelectedWeatherLabel(value: CalculatorParams['weatherType']): string {
  return value === 'any' ? '平均で見る' : WEATHER_TYPE_LABELS[value];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initState(): {
  builds: BuildConfig[];
  activeId: string;
  urlRestoreError?: string;
} {
  if (typeof window === 'undefined') {
    const first = createDefaultBuild();
    return { builds: [first], activeId: first.id };
  }
  const hash = window.location.hash;
  const { state, failureReason } = decodeUrlStateWithReason(hash);
  if (state) return { ...state };
  const first = createDefaultBuild();
  return { builds: [first], activeId: first.id, urlRestoreError: failureReason };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalculatorPageClient() {
  // initState() must only be called ONCE — two separate lazy initialisers would each call
  // generateBuildId(), producing mismatched ids between builds and activeId.
  const [{ builds: initialBuilds, activeId: initialActiveId, urlRestoreError: initialUrlError }] =
    useState(initState);
  const [builds, setBuilds] = useState(initialBuilds);
  const [activeId, setActiveId] = useState(initialActiveId);
  const [chartMode, setChartMode] = useState<'per-catch' | 'per-hour'>('per-hour');
  const [urlRestoreError, setUrlRestoreError] = useState<string | undefined>(initialUrlError);
  const [selectedSlots, setSelectedSlots] = useState<RankSlot[]>(['rod']);
  const [goalView, setGoalView] = useState<CalculatorGoal>(() =>
    initialBuilds.length > 1 ? 'compare' : 'ranking',
  );
  const [notesOpen, setNotesOpen] = useState(false);
  // Setup section collapsed by default for ranking/upgrade goals (result-first UX).
  // User-initiated toggle; only valid for the goal it was set in.
  // When the goal changes, auto-derived logic takes over (no useEffect needed).
  const [setupOverride, setSetupOverride] = useState<{
    forGoal: CalculatorGoal;
    open: boolean;
  } | null>(null);
  // Auto-logic: open for compare/summary/fish; collapsed for ranking/upgrade.
  const setupAutoOpen = goalView !== 'ranking' && goalView !== 'upgrade';
  const setupOpen = setupOverride?.forGoal === goalView ? setupOverride.open : setupAutoOpen;
  const handleSetupToggle = useCallback(() => {
    setSetupOverride({ forGoal: goalView, open: !setupOpen });
  }, [goalView, setupOpen]);
  // Toast shown briefly after adding a candidate to compare.
  const [compareToast, setCompareToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to the setup section (step 2); used to scroll into view after goal selection.
  const nextSectionRef = useRef<HTMLElement | null>(null);
  const handleGoalChange = useCallback((goal: CalculatorGoal) => {
    setGoalView(goal);
    requestAnimationFrame(() => {
      nextSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  // Sync URL hash whenever builds/activeId change
  useEffect(() => {
    const hash = encodeUrlState({ builds, activeId });
    if (hash) {
      window.history.replaceState(null, '', hash);
    }
  }, [builds, activeId]);

  // On mount, restore from hash (handles direct navigation with a share URL).
  // We already seeded state from initState(), so this is a no-op if the hash
  // was already applied in SSR — but it also handles browser back/forward.
  useEffect(() => {
    function onHashChange() {
      const { state: restored, failureReason } = decodeUrlStateWithReason(window.location.hash);
      if (restored) {
        setBuilds(restored.builds);
        setActiveId(restored.activeId);
        setUrlRestoreError(undefined);
      } else if (failureReason) {
        // A share hash was present but could not be decoded — show feedback.
        setUrlRestoreError(failureReason);
      } else {
        // No b= param — navigated away from a share URL; clear any stale error.
        setUrlRestoreError(undefined);
      }
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // ── Build operations ───────────────────────────────────────────────────────

  const activeBuild = builds.find((b) => b.id === activeId) ?? builds[0];
  const orderedSelectedSlots = ALL_SLOTS.filter((slot) => selectedSlots.includes(slot));
  const isSingleSlotSelection = orderedSelectedSlots.length === 1;
  const primarySlot = orderedSelectedSlots[0] ?? 'rod';

  const handleParamsChange = useCallback(
    (params: CalculatorParams) => {
      setBuilds((prev) => updateBuildParams(prev, activeId, params));
    },
    [activeId],
  );

  const handleAddBuild = useCallback(() => {
    const ref = builds.find((b) => b.id === activeId) ?? builds[0];
    const newBuild = createBuildFrom(ref, builds.length);
    setBuilds((prev) => [...prev, newBuild]);
    setActiveId(newBuild.id);
    setGoalView('compare');
  }, [builds, activeId]);

  const handleDuplicateBuild = useCallback(
    (id: string) => {
      const src = builds.find((b) => b.id === id);
      if (!src) return;
      const dup = duplicateBuild(src);
      setBuilds((prev) => {
        const idx = prev.findIndex((b) => b.id === id);
        const next = [...prev];
        next.splice(idx + 1, 0, dup);
        return next;
      });
      setActiveId(dup.id);
      setGoalView('compare');
    },
    [builds],
  );

  const handleRemoveBuild = useCallback(
    (id: string) => {
      const { builds: next, nextActiveId } = removeBuild(builds, id, activeId);
      setBuilds(next);
      setActiveId(nextActiveId);
    },
    [builds, activeId],
  );

  const handleRenameBuild = useCallback((id: string, name: string) => {
    setBuilds((prev) => renameBuild(prev, id, name));
  }, []);

  const handleCreateSlotComparison = useCallback(
    (slot: RankSlot, itemId: string, itemName: string) => {
      if (!activeBuild) return;

      const currentItemId =
        slot === 'rod'
          ? activeBuild.params.loadout.rodId
          : slot === 'line'
            ? activeBuild.params.loadout.lineId
            : slot === 'bobber'
              ? activeBuild.params.loadout.bobberId
              : activeBuild.params.loadout.enchantId;

      if (itemId === currentItemId) return;

      const nextBuild = createBuildFrom(activeBuild, builds.length);
      nextBuild.name = `${itemName} を試す`;
      nextBuild.params = {
        ...nextBuild.params,
        loadout: {
          ...nextBuild.params.loadout,
          [`${slot}Id`]: itemId,
        },
      };

      setBuilds((prev) => [...prev, nextBuild]);
      setActiveId(nextBuild.id);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setCompareToast(nextBuild.name);
      toastTimerRef.current = setTimeout(() => setCompareToast(null), 4000);
      setGoalView('compare');
    },
    [activeBuild, builds.length],
  );

  const handleCreateRecommendationBuild = useCallback(() => {
    if (!activeBuild || !isSingleSlotSelection) return;
    const rankedBySlot = rankAllSlots(activeBuild.params);
    const bestEntry = rankedBySlot[primarySlot][0];
    if (!bestEntry) return;

    const currentItemId =
      primarySlot === 'rod'
        ? activeBuild.params.loadout.rodId
        : primarySlot === 'line'
          ? activeBuild.params.loadout.lineId
          : primarySlot === 'bobber'
            ? activeBuild.params.loadout.bobberId
            : activeBuild.params.loadout.enchantId;

    if (bestEntry.item.id === currentItemId) return;

    handleCreateSlotComparison(primarySlot, bestEntry.item.id, bestEntry.item.nameEn);
  }, [activeBuild, handleCreateSlotComparison, isSingleSlotSelection, primarySlot]);

  const handleCreateOptimizedBuild = useCallback(
    (
      entry: {
        loadout: { rodId: string; lineId: string; bobberId: string; enchantId: string };
      },
      rank: number,
    ) => {
      if (!activeBuild) return;
      const nextBuild = createBuildFrom(activeBuild, builds.length);
      const varyingLabel =
        orderedSelectedSlots.length === ALL_SLOTS.length
          ? '4スロット比較'
          : orderedSelectedSlots.map((slot) => SLOT_LABELS[slot]).join('+');
      nextBuild.name = rank === 0 ? `${varyingLabel}のおすすめ` : `${varyingLabel} ${rank + 1}`;
      nextBuild.params = {
        ...nextBuild.params,
        loadout: {
          ...nextBuild.params.loadout,
          ...entry.loadout,
        },
      };

      setBuilds((prev) => [...prev, nextBuild]);
      setActiveId(nextBuild.id);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setCompareToast(nextBuild.name);
      toastTimerRef.current = setTimeout(() => setCompareToast(null), 4000);
      setGoalView('compare');
    },
    [activeBuild, builds.length, orderedSelectedSlots],
  );

  // ── Calculations ───────────────────────────────────────────────────────────

  const results: DistributionResult[] = useMemo(
    () => builds.map((b) => calculateDistribution(b.params)),
    [builds],
  );

  const activeResult = results[builds.findIndex((b) => b.id === activeId)] ?? results[0];
  const catchesPerHour = 3600 / Math.max(1, activeResult.model.effectiveAvgCatchTimeSec);
  const rankedBySlot = useMemo(() => rankAllSlots(activeBuild.params), [activeBuild.params]);
  const effectiveAreaId = activeResult.model.autoSelectedAreaId ?? activeResult.params.areaId;
  const effectiveAreaName = AREA_MAP[effectiveAreaId]?.nameEn ?? '—';
  const areaContextText =
    activeBuild.params.areaId === BEST_AREA_ID
      ? `${effectiveAreaName}（おすすめから自動選択）`
      : effectiveAreaName;

  const bestNextTry = useMemo(() => {
    if (!isSingleSlotSelection) return null;

    const entries = rankedBySlot[primarySlot];
    const bestEntry = entries[0];
    const currentItemId =
      primarySlot === 'rod'
        ? activeBuild.params.loadout.rodId
        : primarySlot === 'line'
          ? activeBuild.params.loadout.lineId
          : primarySlot === 'bobber'
            ? activeBuild.params.loadout.bobberId
            : activeBuild.params.loadout.enchantId;
    const currentEntry = entries.find((entry) => entry.item.id === currentItemId);

    if (!bestEntry || !currentEntry) return null;

    return {
      bestEntry,
      currentEntry,
      alreadyBest: bestEntry.item.id === currentEntry.item.id,
      upliftPct:
        currentEntry.expectedValuePerHour > 0
          ? ((bestEntry.expectedValuePerHour - currentEntry.expectedValuePerHour) /
              currentEntry.expectedValuePerHour) *
            100
          : 0,
    };
  }, [activeBuild.params, isSingleSlotSelection, primarySlot, rankedBySlot]);

  // Key that changes when result values change meaningfully — drives the CSS update animation.
  const resultAnimKey = `${Math.round(activeResult.expectedValuePerHour)}-${Math.round(activeResult.expectedValuePerCatch)}-${activeResult.fishResults.length}`;

  const selectionThemeKey: CompareTarget = isSingleSlotSelection ? primarySlot : 'full-build';
  const compareTargetTheme = SLOT_THEME[selectionThemeKey];
  const selectedSlotsLabel = orderedSelectedSlots.map((slot) => SLOT_LABELS[slot]).join(' + ');
  const fixedSlots = ALL_SLOTS.filter((slot) => !orderedSelectedSlots.includes(slot));
  const fixedSlotsLabel =
    fixedSlots.length > 0 ? fixedSlots.map((slot) => SLOT_LABELS[slot]).join(' / ') : 'なし';
  const isRankingGoal = goalView === 'ranking';
  const isUpgradeGoal = goalView === 'upgrade';
  const showSelectionTools = isRankingGoal || isUpgradeGoal;
  const selectionHelperText = isSingleSlotSelection
    ? isRankingGoal
      ? `${SLOT_LABELS[primarySlot]} だけを入れ替えます。${fixedSlotsLabel} は今の装備のまま固定です。もう1つ押すと、その組み合わせの順位に切り替わります。`
      : `${SLOT_LABELS[primarySlot]} だけを変えた候補を見ます。もう1つ押すと組み合わせ検索に切り替わります。`
    : isRankingGoal
      ? `${selectedSlotsLabel} だけを入れ替えます。${fixedSlotsLabel} は今の装備のまま固定です。`
      : `${selectedSlotsLabel} を変え、残りのスロットは現在の装備で固定します。`;

  const hasComparisons = builds.length > 1;
  const goalCopy = CALCULATOR_GOAL_COPY[goalView];
  const goalHelperText = GOAL_HELPER_COPY[goalView];
  const showCompareTools = goalView === 'compare';
  const showResultInsights =
    goalView === 'compare' || goalView === 'summary' || goalView === 'fish';
  const showChart = goalView === 'summary' || goalView === 'fish';
  const showMetricLegend = goalView === 'summary';
  const showFishDetails = goalView === 'fish';
  const showNotes = goalView === 'summary' || goalView === 'fish';
  const resultSectionCopy =
    goalView === 'summary'
      ? RESULT_SECTION_COPY.summary
      : goalView === 'fish'
        ? RESULT_SECTION_COPY.fish
        : RESULT_SECTION_COPY.compare;
  const goalContextLoadoutLabel = goalView === 'compare' ? '表示中の候補' : '基準装備';
  const currentValueCardTitle = goalView === 'summary' ? 'いまの時給' : 'この条件の目安';
  const selectionSectionTitle = isRankingGoal
    ? '3. どの欄を入れ替えて順位を見るか決める'
    : '3. 次に試す欄を決める';
  const selectionSectionDescription = isRankingGoal
    ? '選んだ欄だけ変わります。選んでいない欄は今の装備のまま固定です。'
    : '1つ選ぶと個別ランキング、2つ以上選ぶと組み合わせ最適化になります。';
  const rankingResultsStepLabel = isRankingGoal ? '4. 条件つきの順位を見る' : '4. 候補を見る';
  const goalContextEyebrow = showSelectionTools ? 'この条件で見ています' : '3. 結果を見る';
  const setupSectionCopy = SETUP_SECTION_COPY[goalView];

  // ── Share URL ──────────────────────────────────────────────────────────────

  const [copied, setCopied] = useState(false);
  const handleCopyLink = useCallback(() => {
    const hash = encodeUrlState({ builds, activeId });
    const url = window.location.origin + window.location.pathname + hash;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [builds, activeId]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!activeBuild) return null;

  const goalContextSection = (
    <section
      className="rounded-[30px] border border-white/80 bg-white/84 p-6 shadow-[0_24px_72px_rgba(15,23,42,0.10)] backdrop-blur-sm"
      data-testid="current-goal-context"
    >
      <div
        className={`text-xs font-semibold tracking-[0.16em] ${
          showSelectionTools ? 'text-slate-500' : 'uppercase text-ocean-700'
        }`}
      >
        {goalContextEyebrow}
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${goalCopy.accentClassName}`}
          >
            {goalCopy.badge}
          </div>
          <h2 className="mt-3 text-lg font-semibold text-gray-900">
            いまは「{goalCopy.title}」を表示中
          </h2>
          <p className="mt-1 text-sm text-gray-500">{goalHelperText}</p>
        </div>
        {hasComparisons && goalView !== 'compare' ? (
          <button
            type="button"
            onClick={() => setGoalView('compare')}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            保存した候補を開く
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-700">
        <span className="rounded-full border border-ocean-200 bg-white px-3 py-1 font-semibold">
          {goalContextLoadoutLabel}: {activeBuild.name}
        </span>
        <span className="rounded-full border border-ocean-200 bg-white px-3 py-1 font-semibold">
          釣り場: {areaContextText}
        </span>
        <span className="rounded-full border border-ocean-200 bg-white px-3 py-1 font-semibold">
          時間帯: {formatSelectedTimeLabel(activeResult.params.timeOfDay)}
        </span>
        <span className="rounded-full border border-ocean-200 bg-white px-3 py-1 font-semibold">
          天気: {formatSelectedWeatherLabel(activeResult.params.weatherType)}
        </span>
        {showSelectionTools ? (
          <>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-900">
              変える欄: {selectedSlotsLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
              固定したまま: {fixedSlotsLabel}
            </span>
          </>
        ) : null}
      </div>

      {showSelectionTools ? (
        /* Ranking/upgrade: compact single-line metric row so results stay primary focus */
        <div
          data-testid="context-expected-value-per-hour"
          className="mt-4 flex flex-wrap gap-3 rounded-xl border border-ocean-100 bg-ocean-50/60 px-4 py-2.5 text-sm"
        >
          <span className="font-semibold text-ocean-700">
            {currentValueCardTitle}: {formatCurrency(activeResult.expectedValuePerHour)}
          </span>
          <span className="text-slate-500">試行 {catchesPerHour.toFixed(0)}回/時間</span>
          <span className="text-slate-500">
            釣獲率 {(activeResult.totalFishProbability * 100).toFixed(0)}%
          </span>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div
            className="rounded-2xl border-2 border-ocean-300 bg-[linear-gradient(145deg,rgba(219,238,254,0.95),rgba(239,248,255,0.96))] p-4 shadow-[0_18px_48px_rgba(37,120,232,0.16)]"
            data-testid="context-expected-value-per-hour"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ocean-600">
              {currentValueCardTitle}
            </div>
            <div className="mt-2 text-3xl font-bold text-ocean-700">
              {formatCurrency(activeResult.expectedValuePerHour)}
            </div>
            <div className="mt-1 text-xs text-ocean-600">期待値/時間</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              投げられる回数
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-800">
              {catchesPerHour.toFixed(0)}回
            </div>
            <div className="mt-1 text-xs text-slate-500">試行回数/時間</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              釣れる確率
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-800">
              {(activeResult.totalFishProbability * 100).toFixed(0)}%
            </div>
            <div className="mt-1 text-xs text-slate-500">逃がし込みの実釣率</div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <WarningBanner
          warnings={activeResult.warnings.map((warning) =>
            warning.replaceAll('Time of Day', '時間帯').replaceAll('Weather', '天気'),
          )}
        />
      </div>
    </section>
  );

  return (
    <div className="relative mx-auto max-w-[96rem] px-4 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden"
      >
        <div className="absolute left-[-5%] top-10 h-56 w-56 rounded-full bg-ocean-200/40 blur-3xl" />
        <div className="absolute right-[5%] top-0 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="absolute left-[35%] top-32 h-48 w-48 rounded-full bg-white/60 blur-3xl" />
      </div>
      {/* URL restore failure banner — shown only when a share link was present but invalid */}
      {urlRestoreError && (
        <div
          role="alert"
          data-testid="url-restore-error"
          className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <div>
            <span className="font-semibold">共有リンクの復元に失敗しました。</span>{' '}
            {urlRestoreError} デフォルト設定を使用しています。
          </div>
          <button
            onClick={() => setUrlRestoreError(undefined)}
            className="shrink-0 rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-100"
            aria-label="エラーバナーを閉じる"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mb-8">
        <div className="overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top_left,_rgba(147,209,252,0.34),_rgba(37,120,232,0.98)_36%,_rgba(12,74,153,1)_100%)] px-6 py-6 text-white shadow-[0_28px_90px_rgba(37,120,232,0.28)] ring-1 ring-white/20">
          <h1 className="text-2xl font-bold tracking-tight">📊 装備込みの期待値比較</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ocean-100">
            まず何をしたいかを選び、その目的で使う条件だけを上から順に入れていけます。
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <GoalModePicker value={goalView} onChange={handleGoalChange} />

        <section
          ref={nextSectionRef}
          className="rounded-[30px] border border-white/80 bg-white/84 shadow-[0_24px_72px_rgba(15,23,42,0.10)] backdrop-blur-sm"
          data-testid="setup-section"
        >
          {/* Header – always visible regardless of collapse state */}
          <div className="flex items-start justify-between gap-3 p-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ocean-700">
                {setupSectionCopy.title}
              </div>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">条件と基準装備を決める</h2>
              <p className="mt-1 text-sm text-gray-500">{setupSectionCopy.description}</p>
            </div>
            {showSelectionTools && (
              <button
                type="button"
                data-testid="setup-toggle"
                aria-expanded={setupOpen}
                onClick={handleSetupToggle}
                className="mt-1 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                {setupOpen ? '▲ 折りたたむ' : '▼ 前提を変える'}
              </button>
            )}
          </div>

          {/* Compact assumptions summary – visible when collapsed for ranking/upgrade */}
          {showSelectionTools && !setupOpen && (
            <div
              data-testid="setup-collapsed-summary"
              className="flex flex-wrap gap-2 border-t border-slate-100 px-5 pb-4 pt-3"
            >
              <span className="rounded-full border border-ocean-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                釣り場: {areaContextText}
              </span>
              <span className="rounded-full border border-ocean-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                時間帯: {formatSelectedTimeLabel(activeBuild.params.timeOfDay)}
              </span>
              <span className="rounded-full border border-ocean-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                天気: {formatSelectedWeatherLabel(activeBuild.params.weatherType)}
              </span>
            </div>
          )}

          {/* ParameterForm – visible when not a ranking/upgrade goal, or when explicitly expanded */}
          {(!showSelectionTools || setupOpen) && (
            <div className="border-t border-slate-100">
              <ParameterForm
                params={activeBuild.params}
                model={activeResult.model}
                onChange={handleParamsChange}
              />
            </div>
          )}
        </section>

        {showSelectionTools ? (
          <>
            <section className="rounded-[30px] border border-white/80 bg-white/82 p-6 shadow-[0_24px_72px_rgba(15,23,42,0.10)] backdrop-blur-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectionSectionTitle}</h2>
                  <p className="mt-1 text-sm text-gray-500">{selectionSectionDescription}</p>
                </div>
                {hasComparisons ? (
                  <button
                    type="button"
                    data-testid="saved-count-badge"
                    onClick={() => setGoalView('compare')}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                  >
                    保存済み {builds.length - 1}件 → 比較を見る
                  </button>
                ) : null}
              </div>

              <div data-testid="compare-slot-selector" className="mb-4 flex flex-wrap gap-2">
                {ALL_SLOTS.map((slot) => {
                  const isSelected = orderedSelectedSlots.includes(slot);
                  const theme = SLOT_THEME[slot];
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() =>
                        setSelectedSlots((prev) => {
                          const next = isSelected
                            ? prev.length > 1
                              ? prev.filter((candidate) => candidate !== slot)
                              : prev
                            : [...prev, slot];
                          return ALL_SLOTS.filter((candidate) => next.includes(candidate));
                        })
                      }
                      aria-pressed={isSelected}
                      aria-label={`${SLOT_LABELS[slot]} ${isSelected ? '選択中' : '未選択'}`}
                      data-state={isSelected ? 'selected' : 'idle'}
                      data-testid={`compare-slot-button-${slot}`}
                      className={`flex min-w-[9.5rem] items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left text-sm font-semibold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                        isSelected
                          ? `${theme.buttonActiveClassName} shadow-[0_10px_24px_rgba(15,23,42,0.18)] ring-2 ring-white/75 ring-offset-2 ring-offset-white`
                          : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 rounded-full ${theme.dotClassName} ${
                            isSelected ? '' : 'opacity-40'
                          }`}
                        />
                        <span>{SLOT_LABELS[slot]}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        data-slot-indicator={isSelected ? 'selected' : 'idle'}
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                          isSelected
                            ? 'border-white/35 bg-white/15 text-white shadow-inner'
                            : 'border-slate-300 bg-slate-50 text-slate-300'
                        }`}
                      >
                        {isSelected ? (
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-3.5 w-3.5"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4.5 10.5 8.2 14 15.5 6.5" />
                          </svg>
                        ) : (
                          <span className="h-2.5 w-2.5 rounded-full border-2 border-current" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-medium text-emerald-800">{selectionHelperText}</p>
              </div>
            </section>

            {goalContextSection}

            <section className="space-y-4 rounded-[30px] border border-white/80 bg-white/82 p-6 shadow-[0_24px_72px_rgba(15,23,42,0.10)] backdrop-blur-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ocean-700">
                  {rankingResultsStepLabel}
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {isSingleSlotSelection
                    ? isRankingGoal
                      ? `${SLOT_LABELS[primarySlot]} を入れ替えた順位`
                      : `${SLOT_LABELS[primarySlot]} の候補を追加`
                    : isRankingGoal
                      ? `${selectedSlotsLabel} を入れ替えた順位`
                      : '組み合わせ候補を追加'}
                </h2>
                {isRankingGoal ? (
                  <p className="mt-1 text-sm text-gray-500">
                    上から順にそのまま見られます。比較したくなったときだけ、別モードへ切り替えてください。
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">
                    1 件追加すると、自動で「保存した候補を並べて比べる」に切り替わります。
                  </p>
                )}
              </div>

              {isUpgradeGoal && isSingleSlotSelection && bestNextTry ? (
                <div
                  className={`rounded-2xl border p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${compareTargetTheme.panelClassName}`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                    おすすめ候補
                  </div>
                  <div className="mt-2 rounded-xl border border-white/60 bg-white/80 p-3 text-sm text-gray-700">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                      <dt className="text-gray-500">今の{SLOT_LABELS[primarySlot]}:</dt>
                      <dd className="font-semibold">「{bestNextTry.currentEntry.item.nameEn}」</dd>
                      <dt className="text-gray-500">おすすめ候補:</dt>
                      <dd className="font-semibold">「{bestNextTry.bestEntry.item.nameEn}」</dd>
                      <dt className="text-gray-500">期待値/時間:</dt>
                      <dd>
                        <strong>
                          {formatCurrency(bestNextTry.currentEntry.expectedValuePerHour)}
                        </strong>
                        {' → '}
                        <strong>
                          {formatCurrency(bestNextTry.bestEntry.expectedValuePerHour)}
                        </strong>
                      </dd>
                      {!bestNextTry.alreadyBest ? (
                        <>
                          <dt className="text-gray-500">伸び幅:</dt>
                          <dd className="font-semibold">{bestNextTry.upliftPct.toFixed(1)}%</dd>
                        </>
                      ) : null}
                    </dl>
                  </div>
                  {!bestNextTry.alreadyBest ? (
                    <button
                      onClick={handleCreateRecommendationBuild}
                      className={`mt-3 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${compareTargetTheme.buttonActiveClassName}`}
                    >
                      この候補を比較に追加
                    </button>
                  ) : (
                    <p className="mt-3 text-xs text-gray-700">
                      いまの装備がこの欄では一番良い状態です。別の欄を選ぶと、次に試す候補が出ます。
                    </p>
                  )}
                </div>
              ) : null}

              <div
                key={orderedSelectedSlots.join('-')}
                className="animate-pop-in"
                data-testid="ranking-results-container"
              >
                {!isSingleSlotSelection ? (
                  <OptimizerView
                    key={`optimizer-${orderedSelectedSlots.join('-')}`}
                    baseParams={activeBuild.params}
                    varyingSlots={orderedSelectedSlots}
                    initialExpanded={true}
                    alwaysOpen={true}
                    onPickBuild={isRankingGoal ? undefined : handleCreateOptimizedBuild}
                    showPickActions={!isRankingGoal}
                    helperText={
                      isRankingGoal
                        ? '複数スロットを同時に変えたときの順位です。上位だけでなく、特定の順位帯や下位帯も同じ結果のまま見返せます。'
                        : undefined
                    }
                  />
                ) : (
                  <RankingView
                    key={`ranking-${primarySlot}`}
                    baseParams={activeBuild.params}
                    focusSlot={primarySlot}
                    initialExpanded={true}
                    alwaysOpen={true}
                    onPickItem={isRankingGoal ? undefined : handleCreateSlotComparison}
                    showPickActions={!isRankingGoal}
                    includeAreaBreakdown={
                      isRankingGoal && activeBuild.params.areaId === BEST_AREA_ID
                    }
                    title={isRankingGoal ? undefined : `${SLOT_LABELS[primarySlot]} の候補一覧`}
                    description={
                      isRankingGoal
                        ? activeBuild.params.areaId === BEST_AREA_ID
                          ? `${SLOT_LABELS[primarySlot]} だけを入れ替えた順位を、釣り場ごとに並べています。${fixedSlotsLabel} は今の装備のまま固定です。`
                          : `${SLOT_LABELS[primarySlot]} だけを入れ替えた順位です。${fixedSlotsLabel} は今の装備のまま固定です。`
                        : undefined
                    }
                    helperText={
                      isRankingGoal
                        ? activeBuild.params.areaId === BEST_AREA_ID
                          ? `${SLOT_LABELS[primarySlot]} だけを変えた結果を、釣り場ごとに見ます。`
                          : `${SLOT_LABELS[primarySlot]} だけを変えた結果です。`
                        : undefined
                    }
                  />
                )}
              </div>
            </section>
          </>
        ) : null}

        {!showSelectionTools ? goalContextSection : null}

        {showCompareTools ? (
          <section className="space-y-4 rounded-[30px] border border-white/80 bg-white/82 p-6 shadow-[0_24px_72px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            {compareToast !== null && (
              <div
                role="status"
                data-testid="compare-toast"
                className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-900"
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <strong>「{compareToast}」</strong>を比較に追加しました。
                  </span>
                  <button
                    type="button"
                    onClick={() => setCompareToast(null)}
                    aria-label="通知を閉じる"
                    className="shrink-0 rounded px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-100"
                  >
                    ✕
                  </button>
                </div>
                <div
                  data-testid="compare-toast-progress"
                  className="h-0.5 w-full bg-emerald-200"
                  aria-hidden="true"
                >
                  <div className="h-full bg-emerald-500 animate-toast-shrink" />
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">保存した候補を比べる</h2>
                <p className="mt-1 text-sm text-gray-500">
                  追加した候補だけを並べて、どれが一番伸びるかを見ます。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm transition-all duration-150 hover:border-ocean-300 hover:shadow-md hover:text-ocean-700"
                  title="今の比較内容を URL で共有"
                >
                  {copied ? '✓ コピー済み' : '🔗 この比較を URL で共有'}
                </button>
                {!hasComparisons ? (
                  <button
                    type="button"
                    onClick={() => setGoalView('ranking')}
                    className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-800 transition-colors hover:bg-cyan-100"
                  >
                    ランキングに戻る
                  </button>
                ) : null}
              </div>
            </div>

            <BuildTabs
              builds={builds}
              activeId={activeId}
              onSelect={setActiveId}
              onAdd={handleAddBuild}
              onDuplicate={handleDuplicateBuild}
              onRemove={handleRemoveBuild}
              onRename={handleRenameBuild}
            />

            {!hasComparisons ? (
              <div
                data-testid="compare-empty-state"
                className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 px-5 py-5"
              >
                <div className="mb-1.5 font-semibold text-emerald-900">
                  まだ比較する候補がありません
                </div>
                <p className="mb-3 text-xs leading-relaxed text-emerald-800">
                  ランキングや候補探しで気になった装備を「この候補を比較に追加」で保存すると、ここに並んで比べられます。
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="compare-empty-go-ranking"
                    onClick={() => handleGoalChange('ranking')}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                  >
                    ランキングで候補を探す →
                  </button>
                  <button
                    type="button"
                    data-testid="compare-empty-go-upgrade"
                    onClick={() => handleGoalChange('upgrade')}
                    className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900 transition-colors hover:bg-cyan-100"
                  >
                    候補探しモードへ →
                  </button>
                </div>
              </div>
            ) : (
              <ComparisonSummary
                builds={builds}
                results={results}
                activeId={activeId}
                onSelect={setActiveId}
              />
            )}
          </section>
        ) : null}

        {showResultInsights ? (
          <section className="space-y-6" data-testid="result-summary-section">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{resultSectionCopy.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{resultSectionCopy.description}</p>
              </div>
              {hasComparisons && goalView !== 'compare' ? (
                <button
                  type="button"
                  onClick={() => setGoalView('compare')}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
                >
                  保存した候補を比べる
                </button>
              ) : null}
            </div>

            {hasComparisons && goalView !== 'compare' ? (
              <div className="rounded-xl border border-ocean-200 bg-ocean-50 px-4 py-3 text-sm text-ocean-900">
                いま表示しているのは <strong>{activeBuild.name}</strong>{' '}
                です。別の候補に切り替えるときは 「保存した候補を比べる」を開いてください。
              </div>
            ) : null}

            <div
              key={resultAnimKey}
              className="animate-flash-update grid grid-cols-2 gap-3 md:grid-cols-4"
            >
              <div
                className="rounded-2xl border border-ocean-200/80 bg-[linear-gradient(145deg,rgba(239,248,255,0.95),rgba(255,255,255,1))] p-4 text-center shadow-[0_16px_40px_rgba(37,120,232,0.10)]"
                data-testid="summary-expected-value-per-catch"
              >
                <div className="text-2xl font-bold text-ocean-700">
                  {formatCurrency(activeResult.expectedValuePerCatch)}
                </div>
                <div className="mt-1.5 text-xs font-medium text-ocean-500">期待値/回</div>
              </div>
              <div
                className="rounded-2xl border-2 border-ocean-400 bg-[linear-gradient(145deg,rgba(219,238,254,0.95),rgba(239,248,255,0.96))] p-4 text-center shadow-[0_18px_48px_rgba(37,120,232,0.20)]"
                data-testid="summary-expected-value-per-hour"
              >
                <div className="text-3xl font-bold text-ocean-700">
                  {formatCurrency(activeResult.expectedValuePerHour)}
                </div>
                <div className="mt-1.5 text-xs font-semibold text-ocean-600">期待値/時間</div>
              </div>
              <div
                className="rounded-2xl border border-white/80 bg-[linear-gradient(145deg,rgba(249,250,251,0.92),rgba(255,255,255,1))] p-4 text-center shadow-[0_14px_36px_rgba(15,23,42,0.08)]"
                data-testid="summary-catches-per-hour"
              >
                <div className="text-2xl font-bold text-gray-700">
                  {catchesPerHour.toFixed(0)}回
                </div>
                <div className="mt-1.5 text-xs font-medium text-gray-500">試行回数/時間</div>
              </div>
              <div
                className="rounded-2xl border border-white/80 bg-[linear-gradient(145deg,rgba(249,250,251,0.92),rgba(255,255,255,1))] p-4 text-center shadow-[0_14px_36px_rgba(15,23,42,0.08)]"
                data-testid="summary-total-fish-probability"
              >
                <div className="text-2xl font-bold text-gray-700">
                  {(activeResult.totalFishProbability * 100).toFixed(0)}%
                </div>
                <div className="mt-1.5 text-xs font-medium text-gray-500">魚が釣れる確率</div>
              </div>
            </div>

            {showMetricLegend ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  <div className="mb-1 font-semibold text-gray-800">期待値/回</div>
                  {'1回あたりの平均収益です。'}
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  <div className="mb-1 font-semibold text-gray-800">期待値/時間</div>
                  周回効率の比較に使う指標です。
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  <div className="mb-1 font-semibold text-gray-800">試行回数/時間</div>
                  {'1時間に投げられる回数です。'}
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  <div className="mb-1 font-semibold text-gray-800">魚が釣れる確率</div>
                  逃がしを差し引いた確率です。
                </div>
              </div>
            ) : null}

            {showChart ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-800">確率・期待値グラフ</h2>
                  <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                    <button
                      onClick={() => setChartMode('per-catch')}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-150 ${
                        chartMode === 'per-catch'
                          ? 'bg-white text-ocean-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      1回あたり
                    </button>
                    <button
                      onClick={() => setChartMode('per-hour')}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-150 ${
                        chartMode === 'per-hour'
                          ? 'bg-white text-ocean-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      1時間あたり
                    </button>
                  </div>
                </div>
                <DistributionChart result={activeResult} mode={chartMode} />
                <p className="mt-3 text-xs leading-relaxed text-gray-500">
                  `1回あたり` は1投ごとの寄与、`1時間あたり`
                  は1回にかかる時間を反映した時給寄与です。 見たい軸に合わせて切り替えてください。
                </p>
              </div>
            ) : null}

            {showChart || showFishDetails ? (
              <div className="flex justify-center">
                <AdSlot position="in-content" size="leaderboard" showPlaceholder={false} />
              </div>
            ) : null}

            {showFishDetails ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-gray-800">魚種別詳細</h2>
                <ResultTable result={activeResult} />
                <p className="mt-4 text-xs leading-relaxed text-gray-500">
                  各魚の条件や売値レンジ、釣獲率、期待値を確認できます。
                </p>
              </div>
            ) : null}

            {showNotes ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-xs leading-relaxed text-gray-600">
                <button
                  type="button"
                  onClick={() => setNotesOpen((current) => !current)}
                  aria-expanded={notesOpen}
                  aria-controls="calculation-notes-panel"
                  className="flex w-full items-center justify-between gap-3 text-left font-semibold text-gray-700"
                >
                  <span>📝 この計算について</span>
                  <span className="text-xs text-gray-500">{notesOpen ? '閉じる' : '開く'}</span>
                </button>
                <div
                  id="calculation-notes-panel"
                  data-testid="calculation-notes-panel"
                  aria-hidden={!notesOpen}
                  className="mt-3 grid transition-[grid-template-rows,opacity] duration-300 ease-out"
                  style={{
                    gridTemplateRows: notesOpen ? '1fr' : '0fr',
                    opacity: notesOpen ? 1 : 0,
                  }}
                >
                  <div className="overflow-hidden">
                    <ul className="space-y-1.5">
                      <li>
                        • <strong>いま見ている条件</strong>: 釣り場{' '}
                        {AREA_MAP[
                          activeResult.model.autoSelectedAreaId ?? activeResult.params.areaId
                        ]?.nameEn ?? '—'}
                        、時間帯 {formatSelectedTimeLabel(activeResult.params.timeOfDay)}、天気{' '}
                        {formatSelectedWeatherLabel(activeResult.params.weatherType)}
                      </li>
                      <li>
                        • <strong>計算に入っている魚</strong>: {activeResult.fishResults.length} 種{' '}
                        {activeResult.missingPriceFish.length > 0
                          ? `(価格情報が未取得の魚 ${activeResult.missingPriceFish.length} 種を除く)`
                          : ''}
                      </li>
                      <li>
                        • <strong>どの魚が釣れるか</strong>:
                        各釣り場の魚リストから、時間帯と天気の条件に合う魚を選んでいます。
                      </li>
                      <li>
                        • <strong>装備の効果</strong>: 選んだ Rod / Line / Bobber / Enchant
                        のステータスを合算しています。
                      </li>
                      <li>
                        • <strong>レア度の影響</strong>:
                        公開されているレア度テーブルを基準に、同じレア度の魚は同じ確率で出るように計算しています。
                      </li>
                      <li>
                        • <strong>Luck の効果</strong>:{' '}
                        {activeResult.model.effectiveLuckMultiplier.toFixed(2)}x
                        の補正として反映しています。(※内部計算式は未公開のため推定値)
                      </li>
                      <li>
                        • <strong>Big Catch / Max Weight の効果</strong>: 魚の重さを上位{' '}
                        {(activeResult.model.weightPercentile * 100).toFixed(0)}%
                        の範囲に寄せる形で反映しています。(※推定式)
                      </li>
                      <li>
                        • <strong>見た目・サイズボーナス</strong>:{' '}
                        {activeResult.params.modifierAssumptions.includeModifiers
                          ? `約 ${activeResult.model.modifierEvFactor.toFixed(3)}x のボーナスとして計算に入れています。(※コミュニティ観測値に基づく推定)`
                          : '現在はオフです。左の「詳細設定」からオンにできます。'}
                      </li>
                      <li>
                        • <strong>期待値/回</strong>: 各魚の釣れる確率 × 推定売値
                        {activeResult.params.modifierAssumptions.includeModifiers
                          ? ' × 見た目・サイズボーナス'
                          : ''}
                        を全魚種で合計した値です。
                      </li>
                      <li>
                        • <strong>期待値/時間</strong>: 期待値/回 × (1時間 ÷ 1回の所要時間)
                        で計算しています。
                      </li>
                      <li>
                        • <strong>使用中のレア度重み</strong>:{' '}
                        {Object.entries(activeResult.effectiveRarityWeights)
                          .map(
                            ([rarity, weight]) =>
                              `${RARITY_LABELS[rarity as Rarity]} ${weight?.toFixed(2)}`,
                          )
                          .join(', ') || 'なし'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default CalculatorPageClient;
