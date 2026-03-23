/**
 * importChamp2025Results()
 * Orchestrates the 2025 CHAMP Off Road results import into staging.
 * Does NOT write to production tables.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CHAMP_BASE_URL = 'https://www.champoffroad.com';
const SEASON_YEAR = 2025;

// Known 2025 CHAMP event result page paths — extend as season progresses
const KNOWN_RESULT_PATHS = [
  '/results/',
  '/2025-results/',
  '/race-results/',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { extra_urls = [] } = body;

    // Create import run record
    const run = await base44.asServiceRole.entities.ImportSourceRun.create({
      source_name: 'champoffroad',
      source_url: CHAMP_BASE_URL,
      season_year: SEASON_YEAR,
      import_type: 'results',
      status: 'running',
      records_found: 0,
      records_created: 0,
      records_updated: 0,
      records_skipped: 0,
      warnings: [],
      errors: [],
    });

    const warnings = [];
    const errors = [];
    let totalFound = 0;
    let totalCreated = 0;

    // Discover event result pages
    const resultUrls = await discoverResultPages(CHAMP_BASE_URL, KNOWN_RESULT_PATHS, warnings);
    const allUrls = [...new Set([...resultUrls, ...extra_urls])];

    // Stage events first
    const eventMap = {};
    for (const url of allUrls) {
      try {
        const eventData = await parseEventPage(url);
        if (eventData?.source_event_name) {
          const staged = await base44.asServiceRole.entities.ImportedEventStaging.create({
            import_run_id: run.id,
            ...eventData,
            import_status: 'pending',
          });
          eventMap[url] = staged.id;
        }
      } catch (e) {
        warnings.push(`Event parse failed for ${url}: ${e.message}`);
      }
    }

    // Parse and stage results
    const classMap = {};
    for (const url of allUrls) {
      try {
        const results = await parseResultsPage(url);
        totalFound += results.length;

        for (const result of results) {
          // Stage class if new
          if (!classMap[result.class_name]) {
            const existing = await base44.asServiceRole.entities.ImportedClassStaging.filter({
              import_run_id: run.id,
              source_class_name: result.class_name,
            });
            if (existing.length === 0) {
              const cls = await base44.asServiceRole.entities.ImportedClassStaging.create({
                import_run_id: run.id,
                source_class_name: result.class_name,
                import_status: 'pending',
              });
              classMap[result.class_name] = cls.id;
            } else {
              classMap[result.class_name] = existing[0].id;
            }
          }

          await base44.asServiceRole.entities.ImportedResultStaging.create({
            import_run_id: run.id,
            ...result,
            import_status: 'pending',
          });
          totalCreated++;
        }
      } catch (e) {
        errors.push(`Results parse failed for ${url}: ${e.message}`);
      }
    }

    // Update run record
    await base44.asServiceRole.entities.ImportSourceRun.update(run.id, {
      status: errors.length > 0 && totalCreated === 0 ? 'failed' : 'completed',
      records_found: totalFound,
      records_created: totalCreated,
      warnings,
      errors,
    });

    return Response.json({
      import_run_id: run.id,
      events_staged: Object.keys(eventMap).length,
      results_staged: totalCreated,
      warnings,
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function discoverResultPages(baseUrl, paths, warnings) {
  const urls = [];
  for (const path of paths) {
    try {
      const url = `${baseUrl}${path}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaceCoreImporter/1.0)' }
      });
      if (!res.ok) { warnings.push(`Could not fetch ${url}: HTTP ${res.status}`); continue; }
      const html = await res.text();

      // Find links to result sub-pages
      const linkPattern = /href="([^"]*(?:result|race|round|event)[^"]*2025[^"]*)"/gi;
      const links = [...html.matchAll(linkPattern)].map(m => m[1]);
      for (const link of links) {
        const full = link.startsWith('http') ? link : `${baseUrl}${link.startsWith('/') ? '' : '/'}${link}`;
        urls.push(full);
      }
      // Also add the listing page itself
      urls.push(url);
    } catch (e) {
      warnings.push(`Discovery failed for ${path}: ${e.message}`);
    }
  }
  return [...new Set(urls)];
}

async function parseEventPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaceCoreImporter/1.0)' }
  });
  if (!res.ok) return null;
  const html = await res.text();

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const name = cleanText(h1Match?.[1] || titleMatch?.[1] || '');

  const datePattern = /(\w+ \d{1,2}(?:[-–]\d{1,2})?,?\s*202[45])/g;
  const dates = [...html.matchAll(datePattern)].map(m => m[1]);
  const locationMatch = html.match(/(?:at|@|location:?)\s*([A-Za-z\s,]+(?:Raceway|Park|Circuit|Stadium|Track)[^<\n]*)/i);
  const slugMatch = url.match(/\/([^/]+)\/?$/);

  return {
    source_event_name: name,
    source_event_slug: slugMatch?.[1] || '',
    source_event_date_start: dates[0] || null,
    source_event_date_end: dates[1] || dates[0] || null,
    source_location: cleanText(locationMatch?.[1] || ''),
    source_url: url,
  };
}

async function parseResultsPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaceCoreImporter/1.0)' }
  });
  if (!res.ok) return [];
  const html = await res.text();
  return parseResultsFromHtml(html, url);
}

function parseResultsFromHtml(html, url) {
  const results = [];
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const eventName = cleanText(h1Match?.[1] || '');
  const dateMatch = html.match(/(\w+ \d{1,2}(?:[-–]\d{1,2})?,?\s*202[45])/);
  const raceDate = dateMatch?.[1] || null;

  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = [...html.matchAll(tablePattern)];
  const sectionPattern = /<(?:h2|h3|h4)[^>]*>([^<]+)<\/(?:h2|h3|h4)>/gi;
  const sections = [...html.matchAll(sectionPattern)].map(m => ({ text: cleanText(m[1]), index: m.index }));

  for (const tableMatch of tables) {
    const tableHtml = tableMatch[1];
    const prevSection = sections.filter(s => s.index < tableMatch.index).pop();
    const className = prevSection?.text || 'Unknown';

    const headerMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
    const headers = headerMatch ? extractCells(headerMatch[1]).map(h => h.toLowerCase().replace(/\s+/g, '_')) : [];
    const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) continue;

    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    for (const rowMatch of [...tbodyMatch[1].matchAll(rowPattern)]) {
      const cells = extractCells(rowMatch[1]);
      if (cells.length < 2) continue;
      const row = mapRowToHeaders(cells, headers);
      const driverName = cleanText(row.driver || row.name || row.racer || cells[1] || '');
      const pos = parseInt(row.pos || row.position || row.finish || cells[0]) || null;
      if (!driverName || !pos) continue;
      const nameParts = splitName(driverName);
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
        status_text: row.status || null,
        best_lap: row.best_lap || null,
        points_awarded: parseFloat(row.points || row.pts) || null,
        source_url: url,
      });
    }
  }
  return results;
}

function extractCells(rowHtml) {
  return [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
    .map(m => cleanText(stripTags(m[1])));
}
function mapRowToHeaders(cells, headers) {
  const obj = {};
  headers.forEach((h, i) => { if (cells[i] !== undefined) obj[h] = cells[i]; });
  return obj;
}
function splitName(full) {
  const parts = full.trim().split(/\s+/);
  return parts.length === 1 ? { full, first: full, last: '' } : { full, first: parts[0], last: parts.slice(1).join(' ') };
}
function stripTags(html) { return html.replace(/<[^>]+>/g, ' '); }
function cleanText(str) {
  return str.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}