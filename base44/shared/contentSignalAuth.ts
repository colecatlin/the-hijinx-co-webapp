/**
 * Shared internal token used to authorize service-to-service invocations of
 * `createContentSignalFromUpdate` from scheduled automations (which run
 * without a user session).
 *
 * Keeping the token in a shared module prevents drift between the caller
 * (scanForContentSignals) and the callee (createContentSignalFromUpdate).
 * Server-side only — never exposed to public HTTP callers.
 */
export const INTERNAL_SIGNAL_TOKEN = 'hijinx-internal-signal-dispatch-7f3a9c1e4b2d';