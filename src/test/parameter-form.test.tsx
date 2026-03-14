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
  it('current loadout board presents four selectable rows and starts with no picker open', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    const rowButtons = currentLoadoutTable.querySelectorAll('[data-slot]');
    expect(rowButtons).toHaveLength(4);
    expect(currentLoadoutTable.querySelectorAll('[data-state="active"]')).toHaveLength(0);
    expect(screen.queryByTestId('slot-picker-panel')).not.toBeInTheDocument();
  });

  it('picker panel badge labels have whitespace-nowrap to prevent wrapping', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    const pickerPanel = screen.getByTestId('slot-picker-panel');
    const noWrapBadges = pickerPanel.querySelectorAll('span.whitespace-nowrap');
    expect(noWrapBadges.length).toBeGreaterThan(0);
  });

  it('active slot row is visually marked after selection while other rows stay selectable', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    const rodRow = currentLoadoutTable.querySelector('[data-slot="rod"]');
    expect(rodRow).toHaveAttribute('data-state', 'active');

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

    expect(screen.getByTestId('slot-picker-panel')).toHaveTextContent('Bobber の候補');
  });

  it('keeps the current selected equipment visible above the candidate list while comparing', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));

    const currentItemRow = screen.getByTestId('picker-current-item-row');
    expect(currentItemRow).toHaveTextContent('いまの装備');
    expect(currentItemRow).toHaveTextContent('Stick and String');

    const candidateRows = screen.getAllByTestId('picker-option-row');
    expect(candidateRows.length).toBeGreaterThan(0);
    expect(candidateRows.some((row) => row.textContent?.includes('Stick and String'))).toBe(false);
  });

  it('shows a separate price column in both the current loadout table and the picker table', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    expect(within(currentLoadoutTable).getByText('Price')).toBeInTheDocument();
    expect(within(currentLoadoutTable).getAllByText('—').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));

    const pickerHeader = screen.getByTestId('picker-column-header');
    expect(within(pickerHeader).getByText('Price')).toBeInTheDocument();
    expect(screen.getByTestId('picker-current-item-row')).toHaveTextContent('—');
    expect(screen.getByText('750G')).toBeInTheDocument();
  });

  it('shows per-column deltas against the current equipment in the picker table', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));

    const sunleafRow = screen
      .getAllByTestId('picker-option-row')
      .find((row) => row.textContent?.includes('Sunleaf Rod'));

    expect(sunleafRow).toBeTruthy();
    expect(sunleafRow).toHaveTextContent('+60');
    expect(sunleafRow).toHaveTextContent('+115');
    expect(sunleafRow).toHaveTextContent('+245kg');
  });

  it('shows recommendation controls and can filter to only better candidates', () => {
    const params = {
      ...getDefaultParams(),
      loadout: {
        ...getDefaultParams().loadout,
        rodId: 'slim-rod',
      },
    };
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));

    expect(screen.getByLabelText('候補の並び順')).toBeInTheDocument();
    expect(screen.getByLabelText('いまより期待値が上がる候補だけを表示')).toBeInTheDocument();

    const beforeFilter = screen
      .getAllByTestId('picker-option-row')
      .some((row) => row.textContent?.includes('Stick and String'));
    expect(beforeFilter).toBe(true);

    fireEvent.click(screen.getByLabelText('いまより期待値が上がる候補だけを表示'));

    const afterFilter = screen
      .getAllByTestId('picker-option-row')
      .some((row) => row.textContent?.includes('Stick and String'));
    expect(afterFilter).toBe(false);

    const metallicRow = screen
      .getAllByTestId('picker-option-row')
      .find((row) => row.textContent?.includes('Metallic Rod'));
    expect(metallicRow).toHaveTextContent('期待値/時間');
    expect(metallicRow).toHaveTextContent('いまより');
  });

  it('closes the picker when clicking outside the picker panel', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    expect(screen.getByTestId('slot-picker-panel')).toHaveTextContent('Rod の候補');

    fireEvent.pointerDown(document.body);

    expect(screen.queryByTestId('slot-picker-panel')).not.toBeInTheDocument();
  });

  it('closes the picker when the already-active row is clicked again', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));
    expect(screen.getByTestId('slot-picker-panel')).toHaveTextContent('Rod の候補');

    const activeRodRow = screen
      .getByTestId('current-loadout-table')
      .querySelector('[data-slot="rod"]');
    expect(activeRodRow).not.toBeNull();
    fireEvent.click(activeRodRow as HTMLElement);

    expect(screen.queryByTestId('slot-picker-panel')).not.toBeInTheDocument();
  });

  it('uses the row container for focus styling instead of the browser default button outline', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    const rodRow = currentLoadoutTable.querySelector('[data-slot="rod"]');
    expect(rodRow).not.toBeNull();
    expect(rodRow?.className).toContain('focus-within:ring-inset');

    const rodButton = within(rodRow as HTMLElement).getByRole('button', { name: 'Rod を選び直す' });
    expect(rodButton.className).toContain('focus:outline-none');
  });

  it('keeps loadout detail text hidden by default and only shows it when expanded', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    const rodRow = currentLoadoutTable.querySelector('[data-slot="rod"]');
    expect(rodRow).not.toBeNull();
    const activeDetailPanels = (rodRow as HTMLElement).querySelectorAll(
      '[data-loadout-detail="rod"]',
    );
    expect(activeDetailPanels.length).toBeGreaterThan(0);
    activeDetailPanels.forEach((node) => {
      expect(node).toHaveAttribute('aria-hidden', 'true');
    });

    const lineRow = currentLoadoutTable.querySelector('[data-slot="line"]');
    expect(lineRow).not.toBeNull();
    const detailPanels = (lineRow as HTMLElement).querySelectorAll('[data-loadout-detail="line"]');
    expect(detailPanels.length).toBeGreaterThan(0);
    detailPanels.forEach((node) => {
      expect(node).toHaveAttribute('aria-hidden', 'true');
    });

    fireEvent.click(
      within(lineRow as HTMLElement).getAllByRole('button', { name: '詳細を開く' })[0],
    );

    const openedPanels = (lineRow as HTMLElement).querySelectorAll('[data-loadout-detail="line"]');
    expect(openedPanels.length).toBeGreaterThan(0);
    expect(
      Array.from(openedPanels).some((node) => node.getAttribute('aria-hidden') === 'false'),
    ).toBe(true);
  });

  it('clicking the detail icon does not open the equipment picker for that row', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    const lineRow = currentLoadoutTable.querySelector('[data-slot="line"]');
    expect(lineRow).not.toBeNull();

    fireEvent.click(
      within(lineRow as HTMLElement).getAllByRole('button', { name: '詳細を開く' })[0],
    );

    expect(screen.queryByTestId('slot-picker-panel')).not.toBeInTheDocument();
    expect(currentLoadoutTable.querySelectorAll('[data-state="active"]')).toHaveLength(0);
    expect(currentLoadoutTable.querySelector('[data-slot="line"]')).toHaveAttribute(
      'data-state',
      'inactive',
    );
  });

  it('keeps the detail disclosure visually quiet after mouse clicks by using focus-visible styling', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);
    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    const currentLoadoutTable = screen.getByTestId('current-loadout-table');
    const rodRow = currentLoadoutTable.querySelector('[data-slot="rod"]');
    expect(rodRow).not.toBeNull();

    const detailButton = within(rodRow as HTMLElement).getAllByRole('button', {
      name: '詳細を開く',
    })[0];

    expect(detailButton.className).toContain('focus-visible:bg-slate-100');
    expect(detailButton.className).not.toContain('focus:bg-slate-100');
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

    const totalStatsSection = screen.getByTestId('total-stats-section');
    expect(totalStatsSection).toHaveTextContent('装備の合計');

    const luckBadge = totalStatsSection.querySelector('[data-total-stat="luck"] span.rounded-full');
    const attractionBadge = totalStatsSection.querySelector(
      '[data-total-stat="attractionRate"] span.rounded-full',
    );
    const bigCatchBadge = totalStatsSection.querySelector(
      '[data-total-stat="bigCatchRate"] span.rounded-full',
    );
    const maxWeightBadge = totalStatsSection.querySelector(
      '[data-total-stat="maxWeight"] span.rounded-full',
    );

    expect(luckBadge).not.toBeNull();
    expect(attractionBadge).not.toBeNull();
    expect(bigCatchBadge).not.toBeNull();
    expect(maxWeightBadge).not.toBeNull();

    expect(luckBadge as HTMLElement).toHaveStyle({
      backgroundColor: STAT_THEME.luck.cardBackground,
    });
    expect(attractionBadge as HTMLElement).toHaveStyle({
      backgroundColor: STAT_THEME.attractionRate.cardBackground,
    });
    expect(bigCatchBadge as HTMLElement).toHaveStyle({
      backgroundColor: STAT_THEME.bigCatchRate.cardBackground,
    });
    expect(maxWeightBadge as HTMLElement).toHaveStyle({
      backgroundColor: STAT_THEME.maxWeight.cardBackground,
    });
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

    expect(screen.getByTestId('slot-picker-panel')).toHaveTextContent('Line の候補');

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

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));

    const activeRow = currentLoadoutCard.querySelector('[data-slot="rod"]');
    expect(activeRow).toHaveAttribute('data-state', 'active');
    expect(activeRow).toHaveTextContent('選んだ装備がここに反映されます');

    const activeIndicator = screen.getByTestId('active-slot-indicator');
    expect(activeIndicator).toHaveTextContent('Rod を編集中');

    const pickerPanel = screen.getByTestId('slot-picker-panel');
    expect(pickerPanel).toHaveTextContent('Rod の候補');
    expect(pickerPanel).toHaveTextContent('Rod を編集中');
    expect(screen.getByTestId('slot-picker-workspace-shell')).toBeInTheDocument();
    const nowrapBadges = pickerPanel.querySelectorAll('span.whitespace-nowrap');
    expect(nowrapBadges.length).toBeGreaterThan(0);
  });

  it('uses a wider desktop picker so stat comparison stays readable', () => {
    const params = getDefaultParams();
    const result = calculateDistribution(params);

    render(<ParameterForm params={params} model={result.model} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rod を選び直す' }));

    expect(screen.getByTestId('slot-picker-panel')).toHaveTextContent(
      '左の「いまの装備」を見たまま、この候補と比べて選べます。',
    );
    expect(screen.getByTestId('picker-current-item-row')).toHaveTextContent('Stick and String');
    expect(screen.getByTestId('current-loadout-table')).toHaveTextContent('Basic Line');
    expect(screen.getByTestId('current-loadout-table')).toHaveTextContent('Basic Bobber');
    expect(screen.getByTestId('current-loadout-table')).toHaveTextContent('No Enchant');
    expect(screen.getByTestId('total-stats-section')).toHaveTextContent('装備の合計');
    expect(
      screen.getByTestId('total-stats-section').querySelector('[data-total-stat="luck"]'),
    ).not.toBeNull();
  });
});
