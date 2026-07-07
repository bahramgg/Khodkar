import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit + integration tests across the workspace. Node env — no DOM needed
    // for week-1 logic (auth core, crypto, presets, sms).
    include: ['packages/**/*.test.ts', 'presets/**/*.test.ts', 'apps/**/lib/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
