import { describe, it, expect } from 'vitest';
import { getPreset, mazon } from './index.js';

describe('mazon preset', () => {
  it('is registered under its vertical id', () => {
    expect(getPreset('mazon')).toBe(mazon);
  });
  it('requires the rental-vertical facts and enables availability', () => {
    expect(mazon.requiredFacts).toContain('rent_terms');
    expect(mazon.requiredFacts).toContain('deposit');
    expect(mazon.tools).toContain('check_availability');
  });
  it('has one onboarding question per required fact', () => {
    const asked = mazon.onboardingQuestions.map((q) => q.factKey);
    for (const f of mazon.requiredFacts) expect(asked).toContain(f);
  });
});
