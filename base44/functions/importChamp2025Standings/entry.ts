/**
 * importChamp2025Standings()
 * Orchestrates the 2025 CHAMP Off Road standings import into staging.
 * Does NOT write to production Standings table.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CHAMP_BASE_URL = 'https://www.champoffroad.com';
const SEASON_YEAR = 2025;

const KNOWN_STANDINGS_PATHS = [
  '/standings/',
  '/2025-standings/',
  '/points/',
  '/2025-points/',
  '/championship-standings/',
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

    const run = await base44.asServiceRole.entities.ImportSourceRun.create({
      source_name: 'champoffroad',
      source_url: CHAMP_BASE_URL,
      season_year: SEASON_YEAR,
      import_type: 'standings',
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

    const standingsUrls = await discoverStandingsPages(CHAMP_BASE_URL, KNOWN_STANDINGS_PATHS, warnings);
    const allUrls = [...new Set([...standingsUrls, ...extra_urls])];

    const classMap = {};

    for (const url of allUrls) {
      try {
        const standings = await parseStandingsPage(url, SEASON_YEAR);
        totalFound += standings.length;

        for (const row of standings) {
          // Stage class if new
          if (!classMap[row.class_name]) {
            const existing = await base44.asServiceRole.entities.ImportedClassStaging.filter({
              import_run_id: run.id,
              source_class_name: row.class_name,
            });
            if (existing.length === 0) {
              const cls = await base44.asServiceRole.entities.ImportedClassStaging.create({
                import_run_id: run.id,
                source_class_name: row.class_name,
                import_status: 'pending',
              });
              classMap[row.class_name] = cls.id;
            } else {
              classMap[row.class_name] = existing[0].id;
            }
          }

          await base44.asServiceRole.entities.ImportedStandingStaging.create({
            import_run_id: run.id,
            ...row,
            import_status: 'pending',
          });
          totalCreated++;
        }
      } catch (e) {
        errors.push(`Standings parse failed for ${url}: ${e.message}`);
      }
    }

    await base44.asServiceRole.entities.ImportSourceRun.update(run.id, {
      status: errors.length > 0 && totalCreated === 0 ? 'failed' : 'completed',
      records_found: totalFound,
      records_created: totalCreated,
      warnings,
      errors,
    });

    return Response.json({
      import_run_id: run.id,
      standings_staged: totalCreated,
      warnings,
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function discoverStandingsPages(baseUrl, paths, warnings) {
  const urls = [];
  for (const path of paths) {
    try {
      const url = `${baseUrl}${path}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaceCoreImporter/1.0)' } });
      if (!res.ok) { warnings.push(`Could not fetch ${url}: HTTP ${res.status}`); continue; }
      const html = await res.text();
      const linkPattern = /href="([^"]*(?:standing|point|champion)[^"]*2025[^"]*)"/gi;
      const links = [...html.matchAll(linkPattern)].map(m => m[1]);
      for (const link of links) {
        const full = link.startsWith('http') ? link : `${baseUrl}${link.startsWith('/') ? '' : '/'}${link}`;
        urls.push(full);
      }
      urls.push(url);
    } catch (e) {
      warnings.push(`Discovery failed for ${path}: ${e.message}`);
    }
  }
  return [...new Set(urls)];
}

async function parseStandingsPage(url, seasonYear) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaceCoreImporter/1.0)' } });
  if (!res.ok) return [];
  const html = await res.text();
  return parseStandingsFromHtml(html, url, seasonYear);
}

function parseStandingsFromHtml(html, url, seasonYear) {
  const standings = [];
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
      const pos = parseInt(row.pos || row.position || row.rank || cells[0]) || null;
      const points = parseFloat(row.points || row.pts || row.total_points || row.total || cells[2]) || null;
      if (!driverName || !pos) continue;
      const nameParts = splitName(driverName);
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
      });
    }
  }
  return standings;
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