import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('metadata routes', () => {
  it('publishes all primary pages in sitemap', () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://metyatech.github.io/vrchat-fish-guide/');
    expect(urls).toContain('https://metyatech.github.io/vrchat-fish-guide/calculator/');
    expect(urls).toContain('https://metyatech.github.io/vrchat-fish-guide/sources/');
  });

  it('publishes robots settings with sitemap reference', () => {
    const rules = robots();

    expect(rules.host).toBe('https://metyatech.github.io/vrchat-fish-guide/');
    expect(rules.sitemap).toBe('https://metyatech.github.io/vrchat-fish-guide/sitemap.xml');
  });
});
