/**
 * Tool catalog + per-vertical allowlist (§6). Which tools the agent may call
 * is decided by the tenant's vertical preset — e.g. `check_availability` is
 * only enabled for rental verticals. Enforced here, not in the prompt.
 */
import type { VerticalPreset, ToolName } from '@khodkar/presets';

export const ALL_TOOLS: ToolName[] = [
  'search_products',
  'get_product',
  'check_availability',
  'get_fact',
  'create_lead',
  'register_interest',
  'book_slot',
  'escalate_to_owner',
  'log_unanswered',
];

/** Tools enabled for a preset (falls back to a safe read-only set). */
export function allowedTools(preset: VerticalPreset | undefined): ToolName[] {
  return preset?.tools ?? ['search_products', 'get_product', 'get_fact', 'escalate_to_owner'];
}

export function isToolAllowed(preset: VerticalPreset | undefined, tool: ToolName): boolean {
  return allowedTools(preset).includes(tool);
}
