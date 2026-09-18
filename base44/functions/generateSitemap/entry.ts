import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BASE_URL = 'https://hijinx.com';
const MAX_ENTITIES = 500; // guard against extremely large collections

function loc(url) {
  return `  <url>\n    <loc>${url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
}

function staticPage(path, priority = '0.9', freq = 'weekly') {
  return `  <url>\n    <loc>${BASE_URL}/${path}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all entity collections (safe limits applied)
    const [drivers, teams, tracks, series, events, stories] = await Promise.all([
      base44.asServiceRole.entities.Driver.filter({ visibility_status: 'live' }, '-updated_date', MAX_ENTITIES),
      base44.asServiceRole.entities.Team.filter({ racing_status: 'Active' }, '-updated_date', MAX_ENTITIES),
      base44.asServiceRole.entities.Track.filter({ operational_status: 'Active' }, '-updated_date', MAX_ENTITIES),
      base44.asServiceRole.entities.Series.filter({ operational_status: 'Active' }, '-updated_date', MAX_ENTITIES),
      base44.asServiceRole.entities.Event.filter({ published_flag: true }, '-updated_date', MAX_ENTITIES),
      base44.asServiceRole.entities.OutletStory.filter({ status: 'published' }, '-updated_date', MAX_ENTITIES),
    ]);

    const urls = [];

    // ── Static pages (canonical public routes only) ──────────────────────────
    // Homepage canonicalizes to "/" — NOT /Home or /Home1
    urls.push(`  <url>\n    <loc>${BASE_URL}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`);
    urls.push(staticPage('MotorsportsHome', '0.9', 'weekly'));
    urls.push(staticPage('Directory', '0.9', 'daily'));
    urls.push(staticPage('OutletHome', '0.8', 'daily'));
    urls.push(staticPage('ApparelHome', '0.6', 'weekly'));
    urls.push(staticPage('MarketplaceHome', '0.6', 'weekly'));
    urls.push(staticPage('Registration', '0.7', 'weekly'));
    urls.push(staticPage('StandingsHome', '0.7', 'weekly'));
    urls.push(staticPage('About', '0.5', 'monthly'));
    urls.push(staticPage('Contact', '0.5', 'monthly'));

    // Legacy routes (/Home, /Home1, /LegacyHome) are NOT included — they
    // canonicalize to "/" and should not appear as duplicate sitemap entries.

    // ── Racer profiles (canonical /racers/:slug route) ───────────────────────
    for (const d of drivers) {
      const slug = d.slug;
      if (slug) {
        urls.push(`  <url>\n    <loc>${BASE_URL}/racers/${slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
      }
    }

    // ── Team profiles ─────────────────────────────────────────────────────────
    for (const t of teams) {
      const slug = t.slug;
      if (slug) {
        urls.push(`  <url>\n    <loc>${BASE_URL}/Directory?cat=teams</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
      }
    }

    // ── Track profiles (canonical /tracks/:slug route) ───────────────────────
    for (const t of tracks) {
      const slug = t.slug;
      if (slug) {
        urls.push(`  <url>\n    <loc>${BASE_URL}/tracks/${slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
      }
    }

    // ── Series detail (canonical /series/:slug route) ────────────────────────
    for (const s of series) {
      const slug = s.slug;
      if (slug) {
        urls.push(`  <url>\n    <loc>${BASE_URL}/series/${slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
      }
    }

    // ── Event profiles (canonical /events/:slug route) ───────────────────────
    for (const e of events) {
      const slug = e.slug;
      if (slug) {
        urls.push(`  <url>\n    <loc>${BASE_URL}/events/${slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
      }
    }

    // ── Outlet stories (canonical /story/:slug route only) ───────────────────
    for (const s of stories) {
      if (!s.slug) continue; // skip stories without a slug — not route-ready
      urls.push(`  <url>\n    <loc>${BASE_URL}/story/${s.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'noindex',
        'X-Sitemap-Entries': String(urls.length),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});