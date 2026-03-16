import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RankingView } from '@/components/Calculator/RankingView';
import { getDefaultParams } from '@/lib/calculator';
import { rankSlot, rankSlotWithAreaBreakdown } from '@/lib/ranking';

describe('RankingView rank window controls', () => {
  it('supports load more, arbitrary rank windows, and reverse order for slot suggestions', () => {
    const params = {
      ...getDefaultParams('coconut-bay'),
      timeOfDay: 'day' as const,
      weatherType: 'clear' as const,
    };
    const entries = rankSlot(params, 'rod');

    render(<RankingView baseParams={params} focusSlot="rod" alwaysOpen topN={3} />);

    const table = screen.getByRole('table');
    let rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(`1. ${entries[0].item.nameEn}`);

    fireEvent.click(screen.getByRole('button', { name: /もっと見る/ }));

    rows = within(table).getAllByRole('row');
    expect(rows[4]).toHaveTextContent(`4. ${entries[3].item.nameEn}`);

    fireEvent.change(screen.getByLabelText('Rod の開始順位'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Rod の終了順位'), {
      target: { value: '4' },
    });

    rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent(`2. ${entries[1].item.nameEn}`);
    expect(rows.slice(1).some((row) => row.textContent?.includes(entries[0].item.nameEn))).toBe(
      false,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rod 表示順: ベスト→ワースト' }));

    rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(`4. ${entries[3].item.nameEn}`);

    fireEvent.click(screen.getByRole('button', { name: 'Rod の下位3件を表示' }));

    rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(
      `${entries.length}. ${entries[entries.length - 1].item.nameEn}`,
    );
  });

  it('can show one ranking row per area when auto area is enabled', () => {
    const params = {
      ...getDefaultParams(),
      timeOfDay: 'day' as const,
      weatherType: 'clear' as const,
    };
    const entries = rankSlotWithAreaBreakdown(params, 'rod');

    render(
      <RankingView
        baseParams={params}
        focusSlot="rod"
        alwaysOpen
        topN={5}
        includeAreaBreakdown={true}
      />,
    );

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(`1. ${entries[0].item.nameEn}`);
    expect(rows[1]).toHaveTextContent(`釣り場: ${entries[0].areaName}`);
  });
});
