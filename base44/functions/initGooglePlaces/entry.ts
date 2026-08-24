import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── SECURITY NOTE ──────────────────────────────────────────────────
// This endpoint is INTENTIONALLY PUBLIC and READ-ONLY.
//
// GOOGLE_MAPS_API_KEY is a client-side Google Maps JavaScript API key.
// It is necessarily exposed in the browser (the frontend injects the
// returned scriptUrl into a <script> tag), so it is NOT a server secret.
// Public maps for unauthenticated visitors must keep working.
//
// Security is enforced in Google Cloud, NOT here:
//   • Application restriction: HTTP referrer allowlist (hijinx domains only).
//   • API restriction: enable ONLY "Maps JavaScript API" (+ Places if used).
// Do NOT add base44.auth.me() here — that would break public maps without
// protecting the key (it is already visible in the browser).
// Do NOT return any other env var, secret, or config — only the scriptUrl.
Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!apiKey) {
      return Response.json({ error: "Google Maps API key not configured" }, { status: 500 });
    }

    // Only the Maps JS loader URL is returned — the minimum the frontend
    // needs. No raw key field, no other env vars, no service role, no DB.
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;

    return Response.json({ scriptUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});