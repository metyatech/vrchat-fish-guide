import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { STAT_THEME } from '@/components/Calculator/statTheme';
import { calculateDistribution, getDefaultParams } from '@/lib/calculator';

// ── Step 1 UI quality regression checks ───────────────────────────────────────
// These tests catch regressions that previously caused horizontal overflow,
// awkward label wrapping, and weak visual linkage between the loadout table
// and the picker side panel.

describe('Step 1 loadout UI quality', () => {
  it('current-loadout table has no stat column headers (no Luck/Strength etc in thead)', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    const thead = currentLoadoutTable.querySelector('thead');
    // The compact current-loadout table keeps a minimal header but does not
    // show detailed stat column headers to prevent horizontal overflow.
    expect(thead).not.toBeNull();
    expect(within(currentLoadoutTable).queryByText('Luck')).not.toBeInTheDocument();
    expect(within(currentLoadoutTable).queryByText('Strength')).not.toBeInTheDocument();
    expect(within(currentLoadoutTable).queryByText('Expertise')).not.toBeInTheDocument();
  });

  it('picker panel badge labels have whitespace-nowrap to prevent wrapping', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    // The picker panel (rod open by default) must contain whitespace-nowrap badges
    // so that compact action labels never wrap across lines.
    const pickerPanel = screen.getByTestId('slot-picker-panel');
    const noWrapBadges = pickerPanel.querySelectorAll('span.whitespace-nowrap');
    expect(noWrapBadges.length).toBeGreaterThan(0);
  });

  it('active slot row is visually marked as pressed on mount', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    // Rod row should be active (aria-pressed="true") by default.
    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    const rodRow = within(currentLoadoutTable).getByRole('button', { name: 'Rod を選び直す' });
    expect(rodRow).toHaveAttribute('aria-pressed', 'true');

    // Other rows must be inactive.
    const lineRow = within(currentLoadoutTable).getByRole('button', { name: 'Line を選び直す' });
    expect(lineRow).toHaveAttribute('aria-pressed', 'false');
  });

  it('picker panel becomes visible with correct slot when a row is clicked', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    // Click Bobber row — picker should switch to Bobber candidates.
    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    const bobberRow = within(currentLoadoutTable).getByRole('button', {
      name: 'Bobber を選び直す',
    });
    fireEvent.click(bobberRow);

    expect(screen.getByTestId('slot-picker-panel')).toHaveTextContent('Bobber の候補一覧');
  });
});

describe('ParameterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows color-coded stat summaries for the selected gear and total stats', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);

    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    expect(
      within(currentLoadoutTable).getByRole('button', { name: 'Rod を選び直す' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('Luck')[0]).toHaveStyle({ color: STAT_THEME.luck.surfaceText });

    const totalStatsSection = screen.getByTestId('total-stats-section');

    const attractionLabel = within(totalStatsSection).getByText('Attraction Rate');
    const bigCatchLabel = within(totalStatsSection).getByText('Big Catch Rate');

    expect(attractionLabel).toHaveStyle({ backgroundColor: STAT_THEME.attractionRate.accent });
    expect(bigCatchLabel).toHaveStyle({ backgroundColor: STAT_THEME.bigCatchRate.accent });

    const maxWeightLabel = within(totalStatsSection).getByText('Max Weight');
    expect(maxWeightLabel).toHaveStyle({ backgroundColor: STAT_THEME.maxWeight.accent });
  });

  it('updates loadout when a table row is selected', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    const onChange = vi.fn();

    render(<ParameterForm params={params} model={result.model} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    fireEvent.click(screen.getByText('Fortunate Rod'));

    expect(onChange).toHaveBeenCalledWith({
      ...params,
      loadout: {
        ...params.loadout,
        rodId: 'fortunate-rod',
      },
    });
  });

  it('does not show floating-point precision artifacts in total stats', () => {
    const params = {
      ...getDefaultParams(),
      loadout: {
        rodId: 'metallic-rod',
        lineId: 'diamond-line',
        bobberId: 'rainbow-slime-bobber',
        enchantId: 'no-enchant',
      },
    };
    const result = calculateDistribution(params);

    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    expect(screen.queryByText(/11\.999999999999/)).not.toBeInTheDocument();
    expect(screen.queryByText(/16\.999999999999/)).not.toBeInTheDocument();
  });

  it('uses the current loadout table as the entry point and does not auto-scroll on selection', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    const onChange = vi.fn();
    const scrollIntoViewSpy = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewSpy,
    });

    render(<ParameterForm params={params} model={result.model} onChange={onChange} />);

    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    const lineRow = within(currentLoadoutTable).getByRole('button', { name: 'Line を選び直す' });
    fireEvent.click(lineRow);

    expect(screen.getByTestId('slot-picker-panel')).toHaveTextContent('Line の候補一覧');

    fireEvent.click(screen.getByText('Lucky Line'));

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith({
      ...params,
      loadout: {
        ...params.loadout,
        lineId: 'lucky-line',
      },
    });

    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: originalScrollIntoView,
    });
  });

  it('keeps the active loadout state visually anchored and avoids clipping or label wrapping', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);

    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    const currentLoadoutCard = screen.getByTestId('current-loadout-card');
    expect(currentLoadoutCard).toHaveClass('overflow-visible');

    const activeRow = within(currentLoadoutCard).getByRole('button', { name: 'Rod を選び直す' });
    expect(activeRow).toHaveAttribute('data-state', 'active');

    const activeIndicator = screen.getByTestId('active-slot-indicator');
    expect(activeIndicator).toHaveTextContent('Rod');

    const pickerPanel = screen.getByTestId('slot-picker-panel');
    expect(pickerPanel).toHaveTextContent('Rod の候補一覧');
    const nowrapBadges = pickerPanel.querySelectorAll('span.whitespace-nowrap');
    expect(nowrapBadges.length).toBeGreaterThan(0);
  });
});
