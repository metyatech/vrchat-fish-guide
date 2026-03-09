import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { STAT_THEME } from '@/components/Calculator/statTheme';
import { calculateDistribution, getDefaultParams } from '@/lib/calculator';

describe('ParameterForm', () => {
  it('shows color-coded stat summaries for the selected gear and total stats', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);

    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    const selectedRodButton = screen.getByRole('button', { name: 'Stick and String は使用中' });
    expect(selectedRodButton).toHaveAttribute('aria-pressed', 'true');
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
});
