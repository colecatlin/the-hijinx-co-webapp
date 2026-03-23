/**
 * parseChampResultsPage(url)
 * Fetches a CHAMP Off Road results page and extracts result rows.
 * Returns array of result objects for staging.
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
    const results = parseResultsFromHtml(html, url);

    return Response.json({ results, count: results.length, source_url: url });
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

function parseResultsFromHtml(html, url) {
  const results = [];

  // Extract event and class context from page
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const eventName = cleanText(h1Match?.[1] || '');

  const dateMatch = html.match(/(\w+ \d{1,2}(?:[-–]\d{1,2})?,?\s*202[45])/);
  const raceDate = dateMatch?.[1] || null;

  // Find all tables in the page
  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = [...html.matchAll(tablePattern)];

  // Try to find class context headers near each table
  const sectionPattern = /<(?:h2|h3|h4)[^>]*>([^<]+)<\/(?:h2|h3|h4)>/gi;
  const sections = [...html.matchAll(sectionPattern)].map(m => ({
    text: cleanText(m[1]),
    index: m.index,
  }));

  for (const tableMatch of tables) {
    const tableHtml = tableMatch[1];
    const tableIndex = tableMatch.index;

    // Find closest preceding section header = class context
    const prevSection = sections.filter(s => s.index < tableIndex).pop();
    const className = prevSection?.text || 'Unknown';

    // Parse header row to understand column layout
    const headerMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
    const headers = headerMatch
      ? extractCells(headerMatch[1]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
      : [];

    // Parse data rows
    const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) continue;

    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [...tbodyMatch[1].matchAll(rowPattern)];

    for (const rowMatch of rows) {
      const cells = extractCells(rowMatch[1]);
      if (cells.length < 2) continue;

      const row = mapRowToHeaders(cells, headers);
      const driverName = row.driver || row.name || row.racer || cells[1] || '';
      const pos = parseInt(row.pos || row.position || row.finish || cells[0]) || null;

      if (!driverName || !pos) continue;

      const nameParts = splitName(cleanText(driverName));
      results.push({
        event_name: eventName,
        race_date: raceDate,
        class_name: className,
        session_type: 'race',
        finishing_position: pos,
        driver_name: nameParts.full,
        driver_first_name: nameParts.first,
        driver_last_name: nameParts.last,
        driver_number: cleanText(row.number || row.no || row['#'] || ''),
        laps_completed: parseInt(row.laps) || null,
        status_text: row.status || row.notes || null,
        best_lap: row.best_lap || row.fastest_lap || null,
        points_awarded: parseFloat(row.points || row.pts) || null,
        source_url: url,
        import_status: 'pending',
      });
    }
  }

  return results;
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

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ');
}

function cleanText(str) {
  return str.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}