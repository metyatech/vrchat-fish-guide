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
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

    // The picker panel is open by default (activeSlot='rod'), so badges are visible.
    // Use selector:'span' to avoid matching text elsewhere.
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

  it('active row (Rod by default) carries a slot-specific amber ring class', () => {
    renderDefault();

    const table = screen.getByTestId('current-loadout-table');
    const rodRow = within(table).getByRole('button', { name: 'Rod を選び直す' });

    // Slot-specific active class uses ring-amber-400 (not the generic ring-ocean-500).
    expect(rodRow.className).toContain('ring-amber-400');
    expect(rodRow.className).not.toContain('ring-ocean-500');
  });

  it('picker panel uses white background (bg-white), not slot-tinted bg', () => {
    renderDefault();

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

    // The picker panel is open by default (activeSlot='rod').
    const pickerPanel = screen.getByTestId('slot-picker-panel');
    // The 閉じる button label span must have whitespace-nowrap so it never wraps.
    const closeButtonNowrap = pickerPanel.querySelector('span.whitespace-nowrap');
    expect(closeButtonNowrap).not.toBeNull();
  });

  it('selection relationship is explicit in both source row and chooser panel', () => {
    renderDefault();

    const table = screen.getByTestId('current-loadout-table');
    const rodRow = within(table).getByRole('button', { name: 'Rod を選び直す' });
    expect(rodRow).toHaveTextContent('右の一覧から選ぶと、この行が更新されます');

    const pickerPanel = screen.getByTestId('slot-picker-panel');
    expect(pickerPanel).toHaveTextContent('左の Rod 行を更新');
    expect(screen.getByTestId('active-slot-indicator')).toHaveTextContent('Rod を右から選ぶ');
  });
});
