import { describe, it, expect } from 'vitest';
import { mazon } from '@khodkar/presets';
import { allowedTools, isToolAllowed } from './tools.js';

describe('tool allowlist', () => {
  it('enables the rental tool for the mazon preset', () => {
    expect(allowedTools(mazon)).toContain('check_availability');
    expect(isToolAllowed(mazon, 'book_slot')).toBe(true);
  });

  it('falls back to a safe read-only set when no preset is given', () => {
    expect(isToolAllowed(undefined, 'check_availability')).toBe(false);
    expect(isToolAllowed(undefined, 'create_lead')).toBe(false);
    expect(isToolAllowed(undefined, 'get_fact')).toBe(true);
  });
});
