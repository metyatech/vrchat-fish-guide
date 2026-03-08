import { describe, expect, it } from 'vitest';
import { getNextConfig } from '../../next.config.shared.js';

describe('next config deployment target handling', () => {
  it('keeps root paths for normal local and CI runs', () => {
    const config = getNextConfig({ GITHUB_ACTIONS: 'true' });

    expect(config.basePath).toBe('');
    expect(config.assetPrefix).toBeUndefined();
  });

  it('enables repository base path only for GitHub Pages builds', () => {
    const config = getNextConfig({ DEPLOY_TARGET: 'github-pages' });

    expect(config.basePath).toBe('/vrchat-fish-guide');
    expect(config.assetPrefix).toBe('/vrchat-fish-guide/');
  });
});
