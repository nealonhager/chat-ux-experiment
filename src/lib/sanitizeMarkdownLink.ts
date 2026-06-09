const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function sanitizeMarkdownLinkHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed, "https://example.invalid");
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}
