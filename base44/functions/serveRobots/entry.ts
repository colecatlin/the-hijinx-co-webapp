/**
 * Robots.txt server — serves search engine crawl rules.
 * Allows public content indexing, protects admin/operational areas.
 *
 * Safety rules (Disallow for management/admin/operational routes) are
 * HARDCODED and cannot be overridden by Management configuration.
 */
Deno.serve(async (req) => {
  const robotsTxt = `# HIJINX Platform — Robots Configuration

# Default: Allow public discovery
User-agent: *

# Allow public-facing pages
Allow: /
Allow: /Home
Allow: /MotorsportsHome
Allow: /Directory
Allow: /OutletHome
Allow: /racers/
Allow: /teams/
Allow: /tracks/
Allow: /series/
Allow: /events/
Allow: /story/
Allow: /StandingsHome
Allow: /ApparelHome
Allow: /MarketplaceHome
Allow: /About
Allow: /Contact
Allow: /Registration

# ── Protected: Management & admin (never indexable) ──
Disallow: /management/
Disallow: /admin/
Disallow: /racecore/
Disallow: /race-core/
Disallow: /race-control/
Disallow: /Diagnostics
Disallow: /AnalyticsDashboard
Disallow: /RegistrationDashboard
Disallow: /MyDashboard
Disallow: /Profile
Disallow: /ProfileSetup
Disallow: /ClaimUsername
Disallow: /MediaPortal
Disallow: /MediaHome
Disallow: /DriverEditor
Disallow: /EntityEditor
Disallow: /ManageAccess
Disallow: /ManageEvents
Disallow: /ManageSeries
Disallow: /ManageTeams
Disallow: /ManageTracks
Disallow: /ManageResults
Disallow: /ManageStandings
Disallow: /ManageDrivers
Disallow: /ManagePointsConfig
Disallow: /cart
Disallow: /checkout
Disallow: /order-confirmation
Disallow: /digital-downloads

# ── Protected: Legacy & utility ──
Disallow: /LegacyHome

# Sitemap
Sitemap: https://hijinx.com/sitemap.xml

# Crawl delay (conservative, user-friendly)
Crawl-delay: 1
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
});