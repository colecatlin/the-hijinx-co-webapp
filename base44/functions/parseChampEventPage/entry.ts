/**
 * parseChampEventPage(url)
 * Fetches a CHAMP Off Road event page and extracts event metadata.
 * Returns structured event data for staging.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'url required' }, { status: 400 });

    const html = await fetchPage(url);
    const event = parseEventFromHtml(html, url);

    return Response.json({ event, source_url: url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaceCoreImporter/1.0)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function parseEventFromHtml(html, url) {
  // Extract event name from title or h1
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const name = cleanText(h1Match?.[1] || titleMatch?.[1] || '');

  // Look for dates
  const datePattern = /(\w+ \d{1,2}(?:[-–]\d{1,2})?,?\s*202[45])/g;
  const dates = [...html.matchAll(datePattern)].map(m => m[1]);

  // Look for location
  const locationMatch = html.match(/(?:at|@|location:?)\s*([A-Za-z\s,]+(?:Raceway|Park|Circuit|Stadium|Track)[^<\n]*)/i);
  const location = cleanText(locationMatch?.[1] || '');

  // Try to extract slug from URL
  const slugMatch = url.match(/\/([^/]+)\/?$/);
  const slug = slugMatch?.[1] || '';

  return {
    source_event_name: name,
    source_event_slug: slug,
    source_event_date_start: dates[0] || null,
    source_event_date_end: dates[1] || dates[0] || null,
    source_location: location,
    source_url: url,
  };
}

function cleanText(str) {
  return str.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}