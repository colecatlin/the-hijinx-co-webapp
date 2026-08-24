// ── SECURITY NOTE ──────────────────────────────────────────────────
// This endpoint is INTENTIONALLY PUBLIC and READ-ONLY. It must remain so.
//
// GOOGLE_MAPS_API_KEY is a client-side Google Maps JavaScript API key.
// It is necessarily exposed in the browser (the frontend injects the
// returned scriptUrl into a <script> tag), so it is NOT a server secret.
// Public maps for unauthenticated visitors must keep working.
//
// Hardening guarantees (verified):
//   1. No database reads.    2. No database writes.
//   3. No service role client is ever initialized (no SDK import, no
//      asServiceRole, no entity access).
//   4. No user records are accessed (no base44.auth.me(), no User entity).
//   5. The only env var read is GOOGLE_MAPS_API_KEY, and it is returned
//      ONLY embedded inside the fixed Maps JS loader URL — never as a
//      raw field, never alongside any other env var, secret, or config.
//   6. Errors return a generic message — no stack traces, internal
//      config, or implementation details are exposed.
//   7. The script URL is built from a fixed template; no request input
//      (query, body, headers) is interpolated, so only the expected
//      Google Maps loader URL can ever be produced.
//   8. This endpoint is intentionally public and read-only.
//
// Security enforced in Google Cloud, NOT here:
//   • Application restriction: HTTP referrer allowlist (Hijinx domains).
//   • API restriction: enable ONLY "Maps JavaScript API" (+ Places).
// Do NOT add base44.auth.me() here — it would break public maps without
// protecting the key (it is already visible in the browser).
//
// If future functionality needs DB access, user info, or privileged
// operations, implement it in a SEPARATE authenticated backend function.
// Do NOT expand this public endpoint.
Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!apiKey) {
      return Response.json({ error: "Google Maps API key not configured" }, { status: 500 });
    }

    // Fixed template — no user input is interpolated. Only the browser-safe
    // Maps JS loader URL is returned: the minimum the frontend needs.
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;

    return Response.json({ scriptUrl });
  } catch (error) {
    // Generic message only — never leak stack traces or internals.
    return Response.json({ error: "Failed to initialize Google Maps" }, { status: 500 });
  }
});