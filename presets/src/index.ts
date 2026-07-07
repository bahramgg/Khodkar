import type { Vertical } from '@khodkar/shared';
import type { VerticalPreset } from './types.js';
import { mazon } from './mazon.js';

export * from './types.js';
export { mazon };

/** Registry of shipped presets. Only `mazon` exists in week 1. */
export const presets: Partial<Record<Vertical, VerticalPreset>> = {
  mazon,
};

export function getPreset(vertical: Vertical): VerticalPreset | undefined {
  return presets[vertical];
}
