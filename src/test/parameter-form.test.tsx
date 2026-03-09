import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { STAT_THEME } from '@/components/Calculator/statTheme';
import { calculateDistribution, getDefaultParams } from '@/lib/calculator';

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

    const maxWeightHeader = screen.getAllByText('Max Weight')[0];
    expect(maxWeightHeader).toHaveStyle({ color: STAT_THEME.maxWeight.surfaceText });
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

    expect(screen.getByTestId('slot-picker-panel')).toHaveTextContent('Line の候補を右から選ぶ');

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
});
