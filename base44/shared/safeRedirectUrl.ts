/**
 * Safe redirect URL validation — prevents open redirect attacks by
 * validating redirect URLs against the server's actual origin (derived
 * from the request URL), not the client-controlled Origin header.
 *
 * The request URL is set by the server and reflects the actual host the
 * request was received on. The Origin header is fully client-controlled
 * and can be spoofed to produce a Stripe checkout/portal session whose
 * post-payment redirect lands on an attacker-controlled site.
 */
export function createSafeUrlValidator(req: Request) {
  const allowedOrigin = new URL(req.url).origin;

  return function safeUrl(url: string | undefined | null): string | null {
    if (!url || typeof url !== 'string') return null;
    // Allow relative paths (but not protocol-relative URLs like //evil.com)
    if (url.startsWith('/') && !url.startsWith('//')) return `${allowedOrigin}${url}`;
    try {
      const parsed = new URL(url);
      if (parsed.origin === allowedOrigin) return url;
    } catch {}
    return null;
  };
}

/** The server-verified origin for building fallback redirect URLs. */
export function serverOrigin(req: Request): string {
  return new URL(req.url).origin;
}