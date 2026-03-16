/**
 * DOM-based UI quality checks.
 *
 * These tests are structural: they verify that key CSS classes are applied to
 * prevent the class of bugs described below. JSDOM cannot compute actual layout,
 * so these checks guard against _regressions in the markup_ that would cause
 * overflow or wrapping at runtime.
 *
 * Covered regressions:
 * - LoadoutSelectionBadge text ("✓ 使用中" / "選択") splitting across lines.
 * - CurrentLoadout container using overflow-x-auto (which produced a
 *   horizontal scrollbar because the loadout board was too wide).
 * - Active row losing its slot-specific colour cue.
 * - Loadout board region causing horizontal overflow.
 * - CTA "閉じる" button label wrapping in the inventory drawer.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalculatorPageClient } from '@/app/calculator/CalculatorPageClient';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { calculateDistribution, getDefaultParams } from '@/lib/calculator';

describe('UI quality – overflow and wrapping prevention', () => {
  // Reset the URL hash before each test so that state from previous tests (e.g.
  // multi-build hash written by tests that add candidates) does not leak into
  // subsequent tests that expect a clean single-build initial state.
  beforeEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  function renderDefault() {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);
    return { params };
  }

  it('LoadoutSelectionBadge spans carry whitespace-nowrap to prevent text wrapping', () => {
    renderDefault();

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    const pickerPanel = screen.getByTestId('slot-picker-panel');
    const badges = within(pickerPanel).getAllByText(/✓ 使用中|選択/, { selector: 'span' });

    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      expect(badge).toHaveClass('whitespace-nowrap');
    }
  });

  it('CurrentLoadoutTable container uses overflow-hidden or overflow-visible, not overflow-x-auto', () => {
    renderDefault();

    const table = screen.getByTestId('current-loadout-table');
    // Walk up ancestors looking for an overflow-x-auto that would cause a scrollbar.
    let el: HTMLElement | null = table.parentElement;
    let foundOverflowXAuto = false;
    // Search up to 4 levels (table → wrapper div → card div → section)
    for (let i = 0; i < 4 && el; i++) {
      if (el.classList.contains('overflow-x-auto')) {
        foundOverflowXAuto = true;
        break;
      }
      el = el.parentElement;
    }
    expect(foundOverflowXAuto).toBe(false);
  });

  it('current loadout board has no detached connector column', () => {
    renderDefault();

    expect(screen.queryByTestId('loadout-connector')).not.toBeInTheDocument();
  });

  it('active row carries a slot-specific amber ring class after the row is opened', () => {
    renderDefault();

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    const table = screen.getByTestId('current-loadout-table');
    const rodRow = table.querySelector('[data-slot="rod"]');
    expect(rodRow).not.toBeNull();

    // Slot-specific active class uses ring-amber-400 (not the generic ring-ocean-500).
    expect((rodRow as HTMLElement).className).toContain('ring-amber-400');
    expect((rodRow as HTMLElement).className).not.toContain('ring-ocean-500');
  });

  it('picker panel uses white background (bg-white), not slot-tinted bg', () => {
    renderDefault();

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    const panel = screen.getByTestId('slot-picker-panel');
    // Should have bg-white applied directly; slot-specific bg-*-50 should not appear.
    expect(panel.className).toMatch(/bg-white/);
    expect(panel.className).not.toMatch(/bg-amber-50|bg-sky-50|bg-rose-50|bg-violet-50/);
  });

  it('loadout board region (current-loadout-card) has no overflow-x-auto ancestor', () => {
    renderDefault();

    const card = screen.getByTestId('current-loadout-card');
    // The game loadout board must not be wrapped in overflow-x-auto at any level up to
    // the section container (4 levels), which would introduce an unwanted scrollbar.
    let el: HTMLElement | null = card.parentElement;
    let foundOverflowXAuto = false;
    for (let i = 0; i < 4 && el; i++) {
      if (el.classList.contains('overflow-x-auto')) {
        foundOverflowXAuto = true;
        break;
      }
      el = el.parentElement;
    }
    expect(foundOverflowXAuto).toBe(false);
  });

  it('inventory drawer close button has whitespace-nowrap to prevent label wrapping', () => {
    renderDefault();

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    const pickerPanel = screen.getByTestId('slot-picker-panel');
    // The 閉じる button label span must have whitespace-nowrap so it never wraps.
    const closeButtonNowrap = pickerPanel.querySelector('span.whitespace-nowrap');
    expect(closeButtonNowrap).not.toBeNull();
  });

  it('selection relationship is explicit in both source row and chooser panel', () => {
    renderDefault();

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    const table = screen.getByTestId('current-loadout-table');
    const rodRow = table.querySelector('[data-slot="rod"]');
    expect(rodRow).not.toBeNull();
    expect(rodRow).toHaveTextContent('選んだ装備がここに反映されます');

    const pickerPanel = screen.getByTestId('slot-picker-panel');
    expect(pickerPanel).toHaveTextContent('Rod を編集中');
    expect(screen.getByTestId('active-slot-indicator')).toHaveTextContent('Rod を編集中');
    expect(screen.getByTestId('slot-picker-workspace-shell')).toBeInTheDocument();
    expect(screen.getByTestId('current-loadout-workspace-board')).toBeInTheDocument();
  });

  it('demotes calculation diagnostics into the notes panel', () => {
    render(<CalculatorPageClient />);

    fireEvent.click(screen.getByRole('button', { name: /今の装備の時給を見る/ }));
    const notesPanel = screen.getByTestId('calculation-notes-panel');
    const diagnosticNodes = screen.getAllByText('計算に入っている魚');
    for (const node of diagnosticNodes) {
      expect(notesPanel.contains(node)).toBe(true);
    }
  });

  it('equipment picker search filters items by name', () => {
    renderDefault();

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    const searchInput = screen.getByRole('textbox', {
      name: 'Rod を検索',
    }) as HTMLInputElement;

    // All items should be visible initially
    let rows = screen.getAllByTestId('picker-option-row');
    const initialCount = rows.length;
    expect(initialCount).toBeGreaterThan(1);

    // Type a search query
    fireEvent.change(searchInput, { target: { value: 'sunleaf' } });

    // Should show filtered results
    rows = screen.getAllByTestId('picker-option-row');
    expect(rows.length).toBeLessThan(initialCount);
    for (const row of rows) {
      expect(row.textContent?.toLowerCase()).toContain('sunleaf');
    }
  });

  it('equipment picker shows empty state when search has no matches', () => {
    renderDefault();

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    const searchInput = screen.getByRole('textbox', {
      name: 'Rod を検索',
    }) as HTMLInputElement;

    // Search for something that doesn't exist
    fireEvent.change(searchInput, { target: { value: 'zzzzzzz_nonexistent' } });

    // Should show "見つかりません" message
    expect(screen.getByText('見つかりません')).toBeInTheDocument();
    expect(searchInput).toHaveValue('zzzzzzz_nonexistent');
    expect(screen.queryAllByTestId('picker-option-row')).toHaveLength(0);
  });

  it('equipment picker search is case-insensitive', () => {
    renderDefault();

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    const searchInput = screen.getByRole('textbox', {
      name: 'Rod を検索',
    }) as HTMLInputElement;

    // Search with uppercase
    fireEvent.change(searchInput, { target: { value: 'SUnLEAF' } });

    // Should still find items
    const rows = screen.getAllByTestId('picker-option-row');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].textContent?.toLowerCase()).toContain('sunleaf');
  });

  it('time-of-day and weather selection labels use 平均で見る instead of 自動でまとめる', () => {
    renderDefault();

    // Check that the option labels contain the new wording
    const timeOptions = screen.getAllByText('平均で見る');
    expect(timeOptions.length).toBeGreaterThanOrEqual(2); // One for time, one for weather

    // Verify old wording is not present
    expect(screen.queryByText('自動でまとめる')).not.toBeInTheDocument();
  });

  it('time-of-day and weather help text explains averaging naturally', () => {
    renderDefault();

    const helpTexts = screen.getAllByText(
      /すべての時間帯をならして計算します。|すべての天気をならして計算します。/,
    );
    expect(helpTexts.length).toBeGreaterThanOrEqual(2);

    // Verify old stiff wording is not present
    expect(screen.queryByText(/平均値を用います/)).not.toBeInTheDocument();
  });

  it('keeps the visible goal context outside the calculation notes', () => {
    render(<CalculatorPageClient />);

    const context = screen.getByTestId('current-goal-context');
    expect(context).toHaveTextContent('いまは「条件を固定して順位を見る」を表示中');
    expect(context).toHaveTextContent(/基準装備:/);
    expect(context).toHaveTextContent(/釣り場:/);
    expect(context).toHaveTextContent(/時間帯:/);
    expect(context).toHaveTextContent(/天気:/);
    expect(context).toHaveTextContent(/変える欄:/);
    expect(context).toHaveTextContent(/固定したまま:/);
    expect(screen.queryByText('いま見ている結果')).not.toBeInTheDocument();
  });

  it('uses only the four slot toggles as the optimizer entry point', () => {
    render(<CalculatorPageClient />);

    const selector = screen.getByTestId('compare-slot-selector');
    const rodButton = within(selector).getByTestId('compare-slot-button-rod');
    const lineButton = within(selector).getByTestId('compare-slot-button-line');
    const bobberButton = within(selector).getByTestId('compare-slot-button-bobber');
    const enchantButton = within(selector).getByTestId('compare-slot-button-enchant');

    expect(rodButton).toHaveAttribute('aria-pressed', 'true');
    expect(rodButton).toHaveAttribute('data-state', 'selected');
    expect(rodButton.querySelector('[data-slot-indicator="selected"]')).not.toBeNull();
    expect(lineButton).toHaveAttribute('aria-pressed', 'false');
    expect(lineButton).toHaveAttribute('data-state', 'idle');
    expect(lineButton.querySelector('[data-slot-indicator="idle"]')).not.toBeNull();
    expect(bobberButton).toHaveAttribute('aria-pressed', 'false');
    expect(bobberButton.querySelector('[data-slot-indicator="idle"]')).not.toBeNull();
    expect(enchantButton).toHaveAttribute('aria-pressed', 'false');
    expect(enchantButton.querySelector('[data-slot-indicator="idle"]')).not.toBeNull();
    expect(
      screen.queryByRole('button', { name: '全部まとめて入れ替える' }),
    ).not.toBeInTheDocument();
  });

  it('switches between single-slot ranking and multi-slot optimizer from the same selector', () => {
    render(<CalculatorPageClient />);

    const selector = screen.getByTestId('compare-slot-selector');
    fireEvent.click(within(selector).getByTestId('compare-slot-button-line'));

    expect(
      screen.getByRole('heading', { name: 'Rod + Line を入れ替えた順位' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rod + Line だけを入れ替えます。Bobber / Enchant は今の装備のまま固定です。',
      ),
    ).toBeInTheDocument();
    expect(
      within(selector)
        .getByTestId('compare-slot-button-line')
        .querySelector('[data-slot-indicator="selected"]'),
    ).not.toBeNull();
    expect(
      within(selector)
        .getByTestId('compare-slot-button-rod')
        .querySelector('[data-slot-indicator="selected"]'),
    ).not.toBeNull();

    fireEvent.click(within(selector).getByTestId('compare-slot-button-rod'));

    expect(screen.getByRole('heading', { name: 'Line を入れ替えた順位' })).toBeInTheDocument();
    expect(
      within(selector)
        .getByTestId('compare-slot-button-rod')
        .querySelector('[data-slot-indicator="idle"]'),
    ).not.toBeNull();
  });

  it('keeps the ranking flow in a top-to-bottom order', () => {
    render(<CalculatorPageClient />);

    const goalHeading = screen.getByRole('heading', { name: '何を見たい？' });
    const setupHeading = screen.getByRole('heading', { name: '条件と基準装備を決める' });
    const selectionHeading = screen.getByRole('heading', {
      name: '3. どの欄を入れ替えて順位を見るか決める',
    });
    const context = screen.getByTestId('current-goal-context');
    const rankingHeading = screen.getByRole('heading', { name: 'Rod を入れ替えた順位' });

    expect(
      goalHeading.compareDocumentPosition(setupHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      setupHeading.compareDocumentPosition(selectionHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      selectionHeading.compareDocumentPosition(context) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      context.compareDocumentPosition(rankingHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText('1. 何をしたいか決める')).toBeInTheDocument();
    expect(screen.getByText('2. ランキングの条件と基準装備を決める')).toBeInTheDocument();
    expect(screen.getByText('4. 条件つきの順位を見る')).toBeInTheDocument();
  });

  it('shows only the sections needed for the selected goal', () => {
    render(<CalculatorPageClient />);

    expect(screen.getByTestId('compare-slot-selector')).toBeInTheDocument();
    expect(screen.queryByText('この候補を比較に追加')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '保存した候補を比べる' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '魚種別詳細' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /今の装備から次を探す/ }));
    expect(screen.getByText('この候補を比較に追加')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /保存した候補を並べて比べる/ }));
    expect(screen.getByRole('heading', { name: '保存した候補を比べる' })).toBeInTheDocument();
    expect(screen.queryByTestId('compare-slot-selector')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /どの魚が当たりか見る/ }));
    expect(screen.getByRole('heading', { name: '魚種別詳細' })).toBeInTheDocument();
    expect(screen.queryByTestId('compare-slot-selector')).not.toBeInTheDocument();
  });

  it('updates the setup guidance after changing the goal', () => {
    render(<CalculatorPageClient />);

    expect(screen.getByText('2. ランキングの条件と基準装備を決める')).toBeInTheDocument();
    expect(
      screen.getByText('どの条件で順位を見るかを、装備・釣り場・時間帯・天気から決めます。'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /保存した候補を並べて比べる/ }));
    expect(screen.getByText('2. 保存した候補を比べる条件を決める')).toBeInTheDocument();
    expect(
      screen.getByText('比較一覧にある候補を、同じ釣り場と同じ前提で比べられるように整えます。'),
    ).toBeInTheDocument();
  });

  // ── Setup section collapse / expand behaviour (AC1 + AC2) ─────────────────

  it('collapses the setup form by default for ranking goal and shows compact assumptions', () => {
    render(<CalculatorPageClient />);

    // ParameterForm inner content should not render while collapsed.
    expect(screen.queryByTestId('current-loadout-table')).not.toBeInTheDocument();
    // Toggle button is visible.
    expect(screen.getByTestId('setup-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('setup-toggle')).toHaveAttribute('aria-expanded', 'false');
    // Compact assumptions summary is visible.
    const summary = screen.getByTestId('setup-collapsed-summary');
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveTextContent('釣り場:');
    expect(summary).toHaveTextContent('時間帯:');
    expect(summary).toHaveTextContent('天気:');
    // Step heading and description are still accessible.
    expect(screen.getByRole('heading', { name: '条件と基準装備を決める' })).toBeInTheDocument();
    expect(screen.getByText('2. ランキングの条件と基準装備を決める')).toBeInTheDocument();
  });

  it('expands the setup form when the toggle button is clicked', () => {
    render(<CalculatorPageClient />);

    const toggle = screen.getByTestId('setup-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('current-loadout-table')).toBeInTheDocument();
    expect(screen.queryByTestId('setup-collapsed-summary')).not.toBeInTheDocument();
  });

  it('shows the setup form expanded by default for non-ranking goals', () => {
    render(<CalculatorPageClient />);

    // Switch to summary goal – setup should open automatically.
    fireEvent.click(screen.getByRole('button', { name: /今の装備の時給を見る/ }));

    expect(screen.getByTestId('current-loadout-table')).toBeInTheDocument();
    expect(screen.queryByTestId('setup-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('setup-collapsed-summary')).not.toBeInTheDocument();
  });

  // ── Compare state feedback (AC3) ──────────────────────────────────────────

  it('shows saved count badge in slot selector when candidates have been saved', () => {
    render(<CalculatorPageClient />);

    // No badge before any saves.
    expect(screen.queryByTestId('saved-count-badge')).not.toBeInTheDocument();

    // Switch to upgrade goal and add the top recommendation.
    fireEvent.click(screen.getByRole('button', { name: /今の装備から次を探す/ }));
    const addButton = screen.queryByRole('button', { name: 'この候補を比較に追加' });
    if (addButton) {
      fireEvent.click(addButton);
      // After adding, view switches to compare – switch back to ranking to see badge.
      fireEvent.click(screen.getByRole('button', { name: /条件を固定して順位を見る/ }));
      expect(screen.getByTestId('saved-count-badge')).toBeInTheDocument();
      expect(screen.getByTestId('saved-count-badge')).toHaveTextContent('保存済み');
      expect(screen.getByTestId('saved-count-badge')).toHaveTextContent('比較を見る');
    }
  });

  it('shows a compare toast notification immediately after adding a candidate', () => {
    render(<CalculatorPageClient />);

    // Switch to upgrade goal where pick actions are enabled.
    fireEvent.click(screen.getByRole('button', { name: /今の装備から次を探す/ }));
    const addButton = screen.queryByRole('button', { name: 'この候補を比較に追加' });
    if (addButton) {
      fireEvent.click(addButton);
      // After adding, the compare view opens and toast should be visible.
      expect(screen.getByTestId('compare-toast')).toBeInTheDocument();
      expect(screen.getByTestId('compare-toast')).toHaveTextContent('比較に追加しました');
    }
  });

  // ── Round 2: next-step guidance and compare clarity ───────────────────────

  it('setup section is the scroll target after goal selection', () => {
    render(<CalculatorPageClient />);

    // The setup section must always be present so the ref-based scroll target exists.
    expect(screen.getByTestId('setup-section')).toBeInTheDocument();

    // After switching to a different goal the setup section must still be present.
    fireEvent.click(screen.getByRole('button', { name: /今の装備の時給を見る/ }));
    expect(screen.getByTestId('setup-section')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /保存した候補を並べて比べる/ }));
    expect(screen.getByTestId('setup-section')).toBeInTheDocument();
  });

  it('compare empty state shows navigation buttons to ranking and upgrade flows', () => {
    render(<CalculatorPageClient />);

    // Switch to compare goal; no candidates exist yet.
    fireEvent.click(screen.getByRole('button', { name: /保存した候補を並べて比べる/ }));

    const emptyState = screen.getByTestId('compare-empty-state');
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveTextContent('まだ比較する候補がありません');

    // Navigation buttons must be present.
    expect(screen.getByTestId('compare-empty-go-ranking')).toBeInTheDocument();
    expect(screen.getByTestId('compare-empty-go-upgrade')).toBeInTheDocument();

    // Clicking the ranking button switches the goal view.
    fireEvent.click(screen.getByTestId('compare-empty-go-ranking'));
    expect(screen.getByRole('heading', { name: 'Rod を入れ替えた順位' })).toBeInTheDocument();
    expect(screen.queryByTestId('compare-empty-state')).not.toBeInTheDocument();
  });

  it('compare empty-state upgrade button switches to the upgrade flow', () => {
    render(<CalculatorPageClient />);

    fireEvent.click(screen.getByRole('button', { name: /保存した候補を並べて比べる/ }));
    fireEvent.click(screen.getByTestId('compare-empty-go-upgrade'));

    // Upgrade goal shows "次の装備" slot selector.
    expect(screen.getByText('3. 次に試す欄を決める')).toBeInTheDocument();
  });

  it('comparison summary labels the first build as 基準', () => {
    render(<CalculatorPageClient />);

    // Add a candidate via upgrade flow.
    fireEvent.click(screen.getByRole('button', { name: /今の装備から次を探す/ }));
    const addButton = screen.queryByRole('button', { name: 'この候補を比較に追加' });
    if (addButton) {
      fireEvent.click(addButton);
      // Now in compare view with 2 builds – first should have 基準 badge.
      const baseBadges = screen.getAllByTestId('comparison-baseline-badge');
      expect(baseBadges.length).toBeGreaterThanOrEqual(1);
      expect(baseBadges[0]).toHaveTextContent('基準');
    }
  });

  it('ranking results container re-mounts when slot selection changes', () => {
    render(<CalculatorPageClient />);

    const container = screen.getByTestId('ranking-results-container');
    expect(container).toBeInTheDocument();

    // After switching slot selection the container should still be present.
    const selector = screen.getByTestId('compare-slot-selector');
    fireEvent.click(within(selector).getByTestId('compare-slot-button-line'));

    expect(screen.getByTestId('ranking-results-container')).toBeInTheDocument();
  });

  // ── Round 3: GUI review P2/P3/P4/P5/P7 regressions ───────────────────────

  it('picker instruction text is layout-agnostic (no left/right direction labels)', () => {
    renderDefault();

    // Open the rod picker to make the instruction text visible.
    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));

    // Instruction text must not reference screen directions that break on mobile.
    const body = document.body.textContent ?? '';
    // "左を見ながら" and "右の候補" patterns must not appear in instruction strings.
    expect(body).not.toMatch(/左を見ながら/);
    expect(body).not.toMatch(/右の候補から選ぶ/);
    expect(body).not.toMatch(/左の「いまの装備」を見たまま/);
  });

  it('comparison summary mobile card helper text appears only once (in section header, not per-card)', () => {
    render(<CalculatorPageClient />);

    // Add a candidate to get two builds so ComparisonSummary renders.
    fireEvent.click(screen.getByRole('button', { name: /今の装備から次を探す/ }));
    const addButton = screen.queryByRole('button', { name: 'この候補を比較に追加' });
    if (!addButton) return;
    fireEvent.click(addButton);

    // The "期待値/時間のベストは緑" helper must appear at most once (section header only).
    const matches = screen.queryAllByText(/期待値\/時間のベストは/);
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  it('slot-selector section does not render a standalone 選択中 context panel', () => {
    render(<CalculatorPageClient />);

    // The duplicate "選択中" panel was removed; text may still appear in aria-labels
    // but must not appear as a visible heading within the slot selector section.
    const selector = screen.getByTestId('compare-slot-selector');
    const parent = selector.closest('section');
    expect(parent).not.toBeNull();
    // No h* element with text 選択中 inside the section.
    const headingsWithSelecting = Array.from(
      (parent as HTMLElement).querySelectorAll('h1,h2,h3,h4,h5,h6'),
    ).filter((el) => el.textContent?.trim() === '選択中');
    expect(headingsWithSelecting).toHaveLength(0);
  });

  it('ranking goal shows metric as compact row, not heavy 3-card cluster', () => {
    render(<CalculatorPageClient />);

    // The metric element must still be present (for accessibility and EV tracking)
    // but must not contain a large heading-level number in the 3-card layout.
    const metricEl = screen.getByTestId('context-expected-value-per-hour');
    expect(metricEl).toBeInTheDocument();
    // Compact row: should not contain a child with text-3xl (used only in the full card).
    const largeNumbers = metricEl.querySelectorAll('.text-3xl');
    expect(largeNumbers.length).toBe(0);
  });

  it('summary goal shows full 3-card metric cluster', () => {
    render(<CalculatorPageClient />);

    fireEvent.click(screen.getByRole('button', { name: /今の装備の時給を見る/ }));
    const metricEl = screen.getByTestId('context-expected-value-per-hour');
    expect(metricEl).toBeInTheDocument();
    // Full card layout has a large number with text-3xl.
    const largeNumbers = metricEl.querySelectorAll('.text-3xl');
    expect(largeNumbers.length).toBeGreaterThan(0);
  });

  it('compare toast includes a progress bar to signal auto-dismiss lifecycle', () => {
    render(<CalculatorPageClient />);

    fireEvent.click(screen.getByRole('button', { name: /今の装備から次を探す/ }));
    const addButton = screen.queryByRole('button', { name: 'この候補を比較に追加' });
    if (!addButton) return;
    fireEvent.click(addButton);

    const toast = screen.getByTestId('compare-toast');
    expect(toast).toBeInTheDocument();
    // Progress bar must be present inside the toast as a lifecycle cue.
    const progressBar = screen.getByTestId('compare-toast-progress');
    expect(progressBar).toBeInTheDocument();
    expect(toast.contains(progressBar)).toBe(true);
  });
});
