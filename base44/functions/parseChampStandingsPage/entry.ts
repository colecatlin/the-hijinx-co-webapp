/**
 * parseChampStandingsPage(url)
 * Fetches a CHAMP Off Road standings/points page and extracts standing rows.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { url, season_year = 2025 } = await req.json();
    if (!url) return Response.json({ error: 'url required' }, { status: 400 });

    const html = await fetchPage(url);
    const standings = parseStandingsFromHtml(html, url, season_year);

    return Response.json({ standings, count: standings.length, source_url: url });
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

function parseStandingsFromHtml(html, url, seasonYear) {
  const standings = [];

  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = [...html.matchAll(tablePattern)];

  const sectionPattern = /<(?:h2|h3|h4)[^>]*>([^<]+)<\/(?:h2|h3|h4)>/gi;
  const sections = [...html.matchAll(sectionPattern)].map(m => ({
    text: cleanText(m[1]),
    index: m.index,
  }));

  for (const tableMatch of tables) {
    const tableHtml = tableMatch[1];
    const tableIndex = tableMatch.index;

    const prevSection = sections.filter(s => s.index < tableIndex).pop();
    const className = prevSection?.text || 'Unknown';

    const headerMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
    const headers = headerMatch
      ? extractCells(headerMatch[1]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
      : [];

    const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) continue;

    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [...tbodyMatch[1].matchAll(rowPattern)];

    for (const rowMatch of rows) {
      const cells = extractCells(rowMatch[1]);
      if (cells.length < 2) continue;

      const row = mapRowToHeaders(cells, headers);
      const driverName = row.driver || row.name || row.racer || cells[1] || '';
      const pos = parseInt(row.pos || row.position || row.rank || cells[0]) || null;
      const points = parseFloat(row.points || row.pts || row.total_points || row.total || cells[2]) || null;

      if (!driverName || !pos) continue;

      const nameParts = splitName(cleanText(driverName));
      standings.push({
        season_year: seasonYear,
        class_name: className,
        standing_position: pos,
        driver_name: nameParts.full,
        driver_first_name: nameParts.first,
        driver_last_name: nameParts.last,
        driver_number: cleanText(row.number || row.no || row['#'] || ''),
        total_points: points,
        wins: parseInt(row.wins || row.w) || null,
        podiums: parseInt(row.podiums || row.pod) || null,
        source_url: url,
        import_status: 'pending',
      });
    }
  }

  return standings;
}

function extractCells(rowHtml) {
  const cellPattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  return [...rowHtml.matchAll(cellPattern)].map(m => cleanText(stripTags(m[1])));
}

function mapRowToHeaders(cells, headers) {
  const obj = {};
  headers.forEach((h, i) => { if (cells[i] !== undefined) obj[h] = cells[i]; });
  return obj;
}

function splitName(full) {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { full, first: full, last: '' };
  return { full, first: parts[0], last: parts.slice(1).join(' ') };
}

function stripTags(html) { return html.replace(/<[^>]+>/g, ' '); }
function cleanText(str) {
  return str.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}