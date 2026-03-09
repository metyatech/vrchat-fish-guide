import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { STAT_THEME } from '@/components/Calculator/statTheme';
import { calculateDistribution, getDefaultParams } from '@/lib/calculator';

describe('ParameterForm', () => {
  it('shows color-coded stat summaries for the selected gear and total stats', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);

    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    const selectedRodCard = screen.getByRole('button', { name: /Stick and String/ });
    expect(selectedRodCard).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('Luck')[0]).toHaveStyle({ color: STAT_THEME.luck.accentText });

    const attractionLabel = screen
      .getAllByText('Attraction Rate')
      .find((element) => element.className.includes('rounded-full'));
    const bigCatchLabel = screen
      .getAllByText('Big Catch Rate')
      .find((element) => element.className.includes('rounded-full'));

    expect(attractionLabel).toBeDefined();
    expect(bigCatchLabel).toBeDefined();
    expect(attractionLabel).toHaveStyle({ backgroundColor: STAT_THEME.attractionRate.accent });
    expect(bigCatchLabel).toHaveStyle({ backgroundColor: STAT_THEME.bigCatchRate.accent });
  });

  it('updates loadout when a gear card is clicked', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    const onChange = vi.fn();

    render(<ParameterForm params={params} model={result.model} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Fortunate Rod/ }));

    expect(onChange).toHaveBeenCalledWith({
      ...params,
      loadout: {
        ...params.loadout,
        rodId: 'fortunate-rod',
      },
    });
  });
});
