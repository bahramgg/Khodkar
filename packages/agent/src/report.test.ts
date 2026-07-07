import { describe, it, expect } from 'vitest';
import { buildQualityReport } from './report.js';

describe('buildQualityReport', () => {
  it('rewards high deflection and clean weeks', () => {
    const r = buildQualityReport(
      { conversations: 40, autoSent: 36, drafts: 4, unanswered: 0, leads: 5 },
      '1405-W12',
    );
    expect(r.deflectionPct).toBe(90);
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.issues).toHaveLength(0);
    expect(r.summary).toContain('گزارش هفتگی');
    expect(r.summary).toContain('۴۰'); // Persian conversations count
  });

  it('flags low deflection and unanswered questions as issues + missed sales', () => {
    const r = buildQualityReport(
      { conversations: 20, autoSent: 8, drafts: 12, unanswered: 5, leads: 1 },
      '1405-W13',
    );
    expect(r.deflectionPct).toBe(40);
    expect(r.issues.map((i) => i.type)).toContain('low_deflection');
    expect(r.issues.map((i) => i.type)).toContain('unanswered');
    expect(r.missedSales).toEqual([{ reason: 'unanswered', count: 5 }]);
    expect(r.score).toBeLessThan(70);
  });

  it('treats a zero-activity week as full deflection', () => {
    const r = buildQualityReport(
      { conversations: 0, autoSent: 0, drafts: 0, unanswered: 0, leads: 0 },
      '1405-W14',
    );
    expect(r.deflectionPct).toBe(100);
    expect(r.score).toBe(100);
  });
});
