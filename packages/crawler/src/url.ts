/** Small URL helpers shared by the extractors. */

/** Strip a trailing slash and any path, returning `scheme://host[:port]`. */
export function normalizeBase(input: string): string {
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const u = new URL(withScheme);
  return `${u.protocol}//${u.host}`;
}

/** Resolve a possibly-relative href against a base URL; null on failure. */
export function absolutize(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}
