import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import HomePage from '@/app/page';
import CalculatorPage from '@/app/calculator/page';
import SourcesPage from '@/app/sources/page';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/AdSlot', () => ({
  AdSlot: ({ position }: { position: string }) => (
    <div role="note" aria-label={`${position} ad placeholder`} data-testid={`ad-slot-${position}`}>
      ad placeholder
    </div>
  ),
}));

vi.mock('@/components/Calculator/DistributionChart', () => ({
  DistributionChart: () => (
    <figure aria-label="distribution chart mock" data-testid="distribution-chart">
      chart placeholder
    </figure>
  ),
}));

vi.mock('@/components/Calculator/OptimizerView', () => ({
  OptimizerView: ({ title = '候補一覧' }: { title?: string }) => (
    <section aria-label={title} data-testid="optimizer-view-mock">
      optimizer placeholder
    </section>
  ),
}));

vi.mock('@/components/Calculator/RankingView', () => ({
  RankingView: ({ title = '候補一覧' }: { title?: string }) => (
    <section aria-label={title} data-testid="ranking-view-mock">
      ranking placeholder
    </section>
  ),
}));

const runAxe = async (ui: React.ReactElement) => {
  const { container } = render(ui);
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
  });

  expect(results.violations).toEqual([]);
};

describe('accessibility smoke tests', () => {
  test('home page has no obvious accessibility violations', async () => {
    await runAxe(<HomePage />);
  });

  test('calculator page has no obvious accessibility violations', { timeout: 15000 }, async () => {
    await runAxe(<CalculatorPage />);
  });

  test('sources page has no obvious accessibility violations', async () => {
    await runAxe(<SourcesPage />);
  });
});
