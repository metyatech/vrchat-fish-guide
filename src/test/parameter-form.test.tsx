import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ParameterForm } from '@/components/Calculator/ParameterForm';
import { STAT_THEME } from '@/components/Calculator/statTheme';
import { calculateDistribution, getDefaultParams } from '@/lib/calculator';

describe('ParameterForm', () => {
  it('shows color-coded stat summaries for the selected gear and total stats', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);

    const { container } = render(
      <ParameterForm params={params} model={result.model} onChange={vi.fn()} />,
    );

    const rodSelect = container.querySelector('#calc-rod');
    expect(rodSelect).not.toBeNull();
    const rodPanel = rodSelect?.parentElement;
    expect(rodPanel).not.toBeNull();

    const rodScope = within(rodPanel as HTMLElement);
    const rodLuckChip = rodScope.getByText('Luck');
    expect(rodLuckChip).toHaveStyle({ color: STAT_THEME.luck.accentText });

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
});
