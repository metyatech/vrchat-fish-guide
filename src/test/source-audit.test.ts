import { describe, expect, it } from 'vitest';
import { SOURCE_AUDIT } from '@/data/sourceAudit';

describe('SOURCE_AUDIT snapshot', () => {
  it('has internally consistent counts', () => {
    expect(new Date(SOURCE_AUDIT.checkedAt).toString()).not.toBe('Invalid Date');
    expect(SOURCE_AUDIT.summary.inScopeButUnmodeledCount).toBe(
      SOURCE_AUDIT.inScopeButUnmodeled.length,
    );
    expect(SOURCE_AUDIT.summary.outsideCalculatorScopeCount).toBe(
      SOURCE_AUDIT.outsideCalculatorScope.length,
    );
    expect(SOURCE_AUDIT.summary.modeledDiffCount).toBe(SOURCE_AUDIT.modeledDiffs.length);
    expect(SOURCE_AUDIT.summary.equipmentDiffCount).toBe(SOURCE_AUDIT.equipmentDiffs.length);
    expect(SOURCE_AUDIT.revisions.length).toBeGreaterThanOrEqual(4);
  });

  it('filters placeholder rows and malformed names out of the published-gap lists', () => {
    const gapNames = [
      ...SOURCE_AUDIT.inScopeButUnmodeled.map((gap) => gap.name),
      ...SOURCE_AUDIT.outsideCalculatorScope.map((gap) => gap.name),
    ];

    gapNames.forEach((name) => {
      expect(name).not.toContain('[object Object]');
    });

    expect(gapNames).not.toContain('Fish Name');
    expect(gapNames).not.toContain('Secret Fish');
    expect(gapNames).not.toContain('Ultimate Secret Fish');
  });
});
