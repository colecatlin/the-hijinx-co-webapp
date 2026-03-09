/**
 * Robots.txt server — serves search engine crawl rules
 * Allows public content indexing, protects admin/operational areas
 */
Deno.serve(async (req) => {
  const robotsTxt = `# HIJINX Platform — Robots Configuration
# Last updated: 2026-03-09

# Default: Allow public discovery
User-agent: *

# Allow public-facing pages
Allow: /Home
Allow: /MotorsportsHome
Allow: /DriverProfile
Allow: /DriverDirectory
Allow: /TeamProfile
Allow: /TeamDirectory
Allow: /TrackProfile
Allow: /TrackDirectory
Allow: /SeriesDetail
Allow: /SeriesHome
Allow: /EventProfile
Allow: /EventDirectory
Allow: /OutletHome
Allow: /OutletStoryPage
Allow: /StandingsHome
Allow: /ApparelHome
Allow: /About
Allow: /Contact
Allow: /ScheduleHome

# Disallow admin and restricted areas
Disallow: /Management
Disallow: /Diagnostics
Disallow: /RegistrationDashboard
Disallow: /MyDashboard
Disallow: /Profile
Disallow: /MediaPortal
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

# Sitemap — uncomment when domain is finalized
# Sitemap: https://hijinx.com/robots

# Crawl delay (conservative, user-friendly)
Crawl-delay: 1

# Comment: Public content indexed for discovery, admin/operational areas protected
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