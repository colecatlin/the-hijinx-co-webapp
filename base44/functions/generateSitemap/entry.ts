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

    // ── Static pages ─────────────────────────────────────────────────────────
    urls.push(staticPage('Home', '1.0', 'daily'));
    urls.push(staticPage('MotorsportsHome', '0.9', 'weekly'));
    urls.push(staticPage('DriverDirectory', '0.8', 'daily'));
    urls.push(staticPage('TeamDirectory', '0.8', 'weekly'));
    urls.push(staticPage('TrackDirectory', '0.8', 'weekly'));
    urls.push(staticPage('SeriesHome', '0.8', 'weekly'));
    urls.push(staticPage('EventDirectory', '0.8', 'daily'));
    urls.push(staticPage('OutletHome', '0.8', 'daily'));
    urls.push(staticPage('Registration', '0.7', 'weekly'));
    urls.push(staticPage('StandingsHome', '0.7', 'weekly'));
    urls.push(staticPage('ApparelHome', '0.6', 'weekly'));
    urls.push(staticPage('CreativeServices', '0.6', 'monthly'));
    urls.push(staticPage('About', '0.5', 'monthly'));
    urls.push(staticPage('Contact', '0.5', 'monthly'));

    // ── Driver profiles (prefer slug, fallback to id) ─────────────────────
    for (const d of drivers) {
      const param = d.slug || d.id;
      if (!param) continue;
      const key = d.slug ? `slug=${d.slug}` : `id=${d.id}`;
      urls.push(`  <url>\n    <loc>${BASE_URL}/DriverProfile?${key}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    }

    // ── Team profiles ─────────────────────────────────────────────────────
    for (const t of teams) {
      const key = t.slug ? `slug=${t.slug}` : `id=${t.id}`;
      urls.push(`  <url>\n    <loc>${BASE_URL}/TeamProfile?${key}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    }

    // ── Track profiles ────────────────────────────────────────────────────
    for (const t of tracks) {
      const key = t.slug ? `slug=${t.slug}` : `id=${t.id}`;
      urls.push(`  <url>\n    <loc>${BASE_URL}/TrackProfile?${key}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    }

    // ── Series detail ─────────────────────────────────────────────────────
    for (const s of series) {
      const key = s.slug ? `slug=${s.slug}` : `id=${s.id}`;
      urls.push(`  <url>\n    <loc>${BASE_URL}/SeriesDetail?${key}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    }

    // ── Event profiles ────────────────────────────────────────────────────
    for (const e of events) {
      const key = e.slug ? `slug=${e.slug}` : `id=${e.id}`;
      urls.push(`  <url>\n    <loc>${BASE_URL}/EventProfile?${key}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
    }

    // ── Outlet stories (slug-based canonical route only) ──────────────────
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