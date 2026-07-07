/** Process-wide embedder. Offline 1536-dim baseline; swap for OpenRouter later. */
import 'server-only';
import { HashEmbedder } from '@khodkar/agent';

export const embedder = new HashEmbedder();
