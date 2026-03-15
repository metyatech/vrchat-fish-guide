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
import { describe, expect, it, vi } from 'vitest';
import { CalculatorPageClient } from '@/app/calculator/CalculatorPageClient';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { calculateDistribution, getDefaultParams } from '@/lib/calculator';

describe('UI quality – overflow and wrapping prevention', () => {
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
    expect(context).toHaveTextContent('いまは「ランキングだけ見る」を表示中');
    expect(context).toHaveTextContent(/基準装備:/);
    expect(context).toHaveTextContent(/釣り場:/);
    expect(context).toHaveTextContent(/時間帯:/);
    expect(context).toHaveTextContent(/天気:/);
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

    expect(screen.getByRole('heading', { name: '組み合わせランキング' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rod + Line だけを組み合わせて順位を出します。残りのスロットは基準装備のまま固定です。',
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

    expect(screen.getByRole('heading', { name: 'Line のランキング' })).toBeInTheDocument();
    expect(
      within(selector)
        .getByTestId('compare-slot-button-rod')
        .querySelector('[data-slot-indicator="idle"]'),
    ).not.toBeNull();
  });

  it('keeps the ranking flow in a top-to-bottom order', () => {
    render(<CalculatorPageClient />);

    const selectionHeading = screen.getByRole('heading', { name: '3. ランキング対象を決める' });
    const context = screen.getByTestId('current-goal-context');
    const rankingHeading = screen.getByRole('heading', { name: 'Rod のランキング' });

    expect(
      selectionHeading.compareDocumentPosition(context) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      context.compareDocumentPosition(rankingHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText('4. ランキングを見る')).toBeInTheDocument();
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
});
