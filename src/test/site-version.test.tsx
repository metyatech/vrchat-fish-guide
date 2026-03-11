import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Layout/Header';
import { Footer } from '@/components/Layout/Footer';
import { SITE_VERSION } from '@/lib/site';

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
  AdSlot: () => null,
}));

describe('site version visibility', () => {
  it('shows the current site version in the header', () => {
    render(<Header />);

    expect(screen.getByText(SITE_VERSION)).toBeInTheDocument();
  });

  it('shows the current site version in the footer', () => {
    render(<Footer />);

    expect(screen.getByText(new RegExp(SITE_VERSION.replace('.', '\\.')))).toBeInTheDocument();
  });
});
