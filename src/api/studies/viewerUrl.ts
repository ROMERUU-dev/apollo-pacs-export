// Guards viewer URLs handed back by Apollo before we hand them to window.open.
// Relative paths are trusted as-is; absolute URLs must be http(s) and nothing else.
export function safeViewerUrl(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
