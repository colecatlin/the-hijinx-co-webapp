/**
 * rateLimitRetry — shared React Query policy for platform rate limiting.
 *
 * Base44 answers a temporarily over-budget request with HTTP 429
 * ("Rate limit exceeded"). The documented remedy is to wait briefly and retry,
 * so configuration loads back off and recover on their own instead of
 * dead-ending in a "Failed to load configuration" error.
 *
 * Usage:
 *   useQuery({ queryKey: [...], queryFn: ..., ...rateLimitRetry })
 */
export function isRateLimitError(error) {
  if (!error) return false;
  const status = error?.response?.status ?? error?.status;
  if (status === 429) return true;
  const message = `${error?.message || ''} ${error?.response?.data?.error || ''}`;
  return /rate limit/i.test(message);
}

/** Rate limits: back off up to 4 attempts (1s, 2s, 4s, 8s). Other errors: one retry. */
export const rateLimitRetry = {
  retry: (failureCount, error) =>
    isRateLimitError(error) ? failureCount < 4 : failureCount < 1,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
};