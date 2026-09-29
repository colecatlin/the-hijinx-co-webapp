/**
 * importSheetWriter.ts — the single writer that mirrors import results into
 * the master Google workbook.
 *
 * Contract with the rest of the platform
 * ─────────────────────────────────────
 * The workbook is an OUTPUT. Nothing here reads it back: no push, no
 * import-from-sheet, no approval gate. An import never waits on it, and a
 * failed write never affects an import's outcome.
 *
 * Every import that reports goes through reportImportRun, so an import added
 * later inherits reporting instead of needing its own wiring.
 *
 * Two kinds of tab, deliberately different:
 *   - Import Log / Problems — append-only history. Never rewritten.
 *   - Domain tabs — current state. Rewritten in full on every run, so no
 *     stale row survives beside fresh data and a re-run never doubles a row.
 */

import {
  SHEETS_API, extractSpreadsheetId, getSheetsToken, sheetsFetch, getSpreadsheet,
  quoteTab, rangeOf, colLetter, writeValues, batchWriteValues, appendValues,
  batchUpdateSpreadsheet, gridRange, flattenValue,
} from './sheetsApi.ts';

export const TAB_READ_ME = 'Read Me';
export const TAB_SUMMARY = 'Summary';
export const TAB_LOG = 'Import Log';
export const TAB_PROBLEMS = 'Problems';

export const TAB_REF_VISIBILITY = 'Ref · Visibility';
export const TAB_REF_DISCIPLINES = 'Ref · Disciplines';
export const TAB_REF_CLASSES = 'Ref · Classes';
export const TAB_REF_COUNTRIES = 'Ref · Countries';
export const TAB_REF_STATES = 'Ref · States';

/** One tab per import domain. Tab names are stable — never change between runs. */
export const DOMAINS = [
  { key: 'racers',        tab: 'Racers',        entity: 'RacerProfile', label: 'Racers' },
  { key: 'teams',         tab: 'Teams',         entity: 'Team',         label: 'Teams' },
  { key: 'organizations', tab: 'Organizations', entity: 'Organization', label: 'Organizations' },
  { key: 'tracks',        tab: 'Tracks',        entity: 'Track',        label: 'Tracks' },
  { key: 'series',        tab: 'Series',        entity: 'Series',       label: 'Series' },
  { key: 'events',        tab: 'Events',        entity: 'Event',        label: 'Events' },
];

export const DOMAIN_KEYS = DOMAINS.map(function (d) { return d.key; });

/** Pinned leading columns — traceability first, then the record's own shape. */
const LEADING = ['id', 'racecore_id', 'slug', 'canonical_slug'];
/** Trailing group — what the most recent run did with this row. */
const TRAILING = ['last_action', 'last_run_at', 'last_seen_at'];

const COLUMN_NOTES = {
  id: 'Platform record ID — the internal handle. Use with racecore_id / slug to trace a row.',
  racecore_id: 'RaceCore ID. Blank for domains with no ID family — trace those by slug.',
  slug: 'Public slug — the trace key for domains without a RaceCore ID family.',
  canonical_slug: 'Canonical slug used for routing and deduplication.',
  last_action: 'What the most recent run did: created, updated or unchanged.',
  last_run_at: 'When the most recent run that touched this row ran.',
  last_seen_at: 'When the record itself was last modified on the platform.',
};

const LOG_HEADERS = ['Run At', 'Import', 'Actor', 'Source', 'Rows Read', 'Created', 'Updated', 'Skipped', 'Failed', 'Status', 'Message'];
const PROBLEM_HEADERS = ['Run At', 'Import', 'Row Ref', 'Action', 'Reason'];

const REFERENCE_TABS = [
  { tab: TAB_REF_VISIBILITY, note: 'Lookup only — visibility values accepted by the platform. Do not type new values here.' },
  { tab: TAB_REF_DISCIPLINES, note: 'Lookup only — disciplines present on the platform. Populated from the Discipline entity.' },
  { tab: TAB_REF_CLASSES, note: 'Lookup only — racing classes present on the platform. Populated from SeriesClass.' },
  { tab: TAB_REF_COUNTRIES, note: 'Lookup only — countries already present on platform records.' },
  { tab: TAB_REF_STATES, note: 'Lookup only — states and regions already present on platform records.' },
];

const STATIC_VISIBILITY = ['live', 'draft', 'public', 'private', 'archived', 'Active', 'Inactive', 'Upcoming', 'Completed'];

// ════════════════════════════════════════════════════════════════════
// config
// ════════════════════════════════════════════════════════════════════

export async function getImportSheetConfig(base44) {
  const rows = await base44.asServiceRole.entities.ImportSheetConfig
    .filter({ is_active: true })
    .catch(function () { return []; });
  return rows && rows.length > 0 ? rows[0] : null;
}

async function saveImportSheetConfig(base44, configRow, patch) {
  await base44.asServiceRole.entities.ImportSheetConfig.update(configRow.id, patch);
}

/**
 * Record a write failure where the admin can see it. This is the whole point:
 * a reporting layer that fails silently would reproduce the exact problem it
 * exists to cure.
 */
async function recordWriteFailure(base44, message) {
  try {
    const config = await getImportSheetConfig(base44);
    if (config) {
      await saveImportSheetConfig(base44, config, {
        last_write_error: String(message).slice(0, 900),
        last_write_error_at: new Date().toISOString(),
      });
    }
  } catch (e) { /* nothing further we can do */ }
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'import_sheet_write_failed',
      source_type: 'google_sheets',
      entity_name: 'ImportSheetConfig',
      function_name: 'importSheetWriter',
      status: 'failed',
      message: String(message).slice(0, 900),
    });
  } catch (e) { /* nothing further we can do */ }
}

// ════════════════════════════════════════════════════════════════════
// workbook structure
// ════════════════════════════════════════════════════════════════════

export function allTabTitles() {
  const titles = [TAB_READ_ME, TAB_SUMMARY, TAB_LOG, TAB_PROBLEMS];
  DOMAINS.forEach(function (d) { titles.push(d.tab); });
  REFERENCE_TABS.forEach(function (r) { titles.push(r.tab); });
  return titles;
}

/**
 * Read the workbook and add any tab we own that is missing. Existing tabs are
 * never renamed or deleted, so anything the template does not own is left
 * exactly as the admin left it.
 */
async function ensureWorkbook(token, spreadsheetId) {
  const meta = await getSpreadsheet(token, spreadsheetId);
  const existing = (meta.sheets || []).map(function (s) { return s.properties; });
  const byTitle = {};
  existing.forEach(function (p) { byTitle[p.title] = p.sheetId; });

  const missing = allTabTitles().filter(function (t) { return byTitle[t] === undefined; });
  if (missing.length > 0) {
    await batchUpdateSpreadsheet(token, spreadsheetId, missing.map(function (title) {
      return { addSheet: { properties: { title: title, gridProperties: { rowCount: 1000, columnCount: 40 } } } };
    }));
    const refreshed = await getSpreadsheet(token, spreadsheetId);
    (refreshed.sheets || []).forEach(function (s) { byTitle[s.properties.title] = s.properties.sheetId; });
  }

  return { title: (meta.properties || {}).title || '', sheetIds: byTitle };
}

/** Clear a tab's content below its header rows before a full rewrite. */
async function clearTab(token, spreadsheetId, tabName, fromRow) {
  await sheetsFetch(
    token,
    SHEETS_API + '/' + spreadsheetId + '/values/' +
      encodeURIComponent(rangeOf(tabName, 'A' + fromRow + ':ZZ')) + ':clear',
    { method: 'POST', body: JSON.stringify({}) }
  );
}

// ════════════════════════════════════════════════════════════════════
// domain grids
// ════════════════════════════════════════════════════════════════════

async function fetchDomainRecords(base44, entity) {
  const rows = await base44.asServiceRole.entities[entity].list('-updated_date', 5000);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Column order is fixed, not discovered per run: pinned columns first, then
 * the record's own fields in a stable order, then the trailing run group.
 * A full-record tab whose columns move between imports is unusable for
 * filtering, so the order must never appear to shuffle.
 */
function unionColumns(records) {
  const seen = {};
  records.forEach(function (record) {
    Object.keys(record || {}).forEach(function (key) {
      if (LEADING.indexOf(key) === -1 && TRAILING.indexOf(key) === -1) seen[key] = true;
    });
  });
  const middle = Object.keys(seen).sort();
  return LEADING.concat(middle.filter(function (k) { return LEADING.indexOf(k) === -1; })).concat(TRAILING);
}

function sortKeyOf(record) {
  const candidates = ['display_name', 'name', 'full_name', 'title', 'series_name', 'nickname'];
  for (let i = 0; i < candidates.length; i++) {
    const value = record[candidates[i]];
    if (typeof value === 'string' && value.length > 0) return value.toLowerCase();
  }
  return String(record.id || '');
}

function buildDomainRows(records, columns, runStartedAt) {
  const started = new Date(runStartedAt).getTime();
  return records
    .slice()
    .sort(function (a, b) {
      const ka = sortKeyOf(a);
      const kb = sortKeyOf(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    })
    .map(function (record) {
      let action = 'unchanged';
      const created = record.created_date ? new Date(record.created_date).getTime() : 0;
      const updated = record.updated_date ? new Date(record.updated_date).getTime() : 0;
      if (created && created >= started) action = 'created';
      else if (updated && updated >= started) action = 'updated';

      const enriched = Object.assign({}, record, {
        last_action: action,
        last_run_at: runStartedAt,
        last_seen_at: record.updated_date || '',
      });

      return columns.map(function (column) {
        return flattenValue(enriched[column]);
      });
    });
}

function notesRow(columns, records) {
  return columns.map(function (column) {
    if (COLUMN_NOTES[column]) return COLUMN_NOTES[column];
    let sample = '';
    for (let i = 0; i < records.length; i++) {
      const value = flattenValue(records[i][column]);
      if (value !== '') { sample = value; break; }
    }
    const example = sample ? ' e.g. ' + sample.slice(0, 40) : '';
    return 'Raw platform field "' + column + '".' + example;
  });
}

/** Dropdowns keep controlled values from drifting. Unmatched columns stay free text. */
function dropdownRules(sheetId, columns) {
  const requests = [];
  const apply = function (patterns, sourceTab) {
    columns.forEach(function (column, index) {
      const matches = patterns.some(function (re) { return re.test(column); });
      if (!matches) return;
      requests.push({
        setDataValidation: {
          range: gridRange(sheetId, 2, 5000, index, index + 1),
          rule: {
            condition: {
              type: 'ONE_OF_RANGE',
              values: [{ userEnteredValue: '=' + quoteTab(sourceTab) + '!$A$2:$A$400' }],
            },
            strict: false,
            showCustomUi: true,
          },
        },
      });
    });
  };
  apply([/^visibility/i], TAB_REF_VISIBILITY);
  apply([/^primary_discipline$/i, /^discipline$/i], TAB_REF_DISCIPLINES);
  apply([/^class_name$/i, /^name_of_class/i], TAB_REF_CLASSES);
  apply([/country/i], TAB_REF_COUNTRIES);
  apply([/_state$/i, /_province$/i], TAB_REF_STATES);
  return requests;
}

/** Colour carries the meaning so trouble is found by scrolling, not reading. */
function actionFormatting(sheetId, columnCount, actionColumnIndex, firstDataRowIndex, tabKind) {
  const actionLetter = colLetter(actionColumnIndex);
  const formulaRow = firstDataRowIndex + 1;
  const range = gridRange(sheetId, firstDataRowIndex, firstDataRowIndex + 4998, 0, columnCount);
  const rule = function (text, background) {
    return {
      addConditionalFormatRule: {
        rule: {
          ranges: [range],
          booleanRule: {
            condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: '=$' + actionLetter + formulaRow + '="' + text + '"' }] },
            format: { backgroundColor: background },
          },
        },
        index: 0,
      },
    };
  };
  if (tabKind === 'problems') {
    return [rule('failed', { red: 0.98, green: 0.9, blue: 0.9 }), rule('skipped', { red: 1, green: 0.96, blue: 0.85 })];
  }
  return [
    rule('created', { red: 0.9, green: 0.97, blue: 0.92 }),
    rule('updated', { red: 0.94, green: 0.98, blue: 0.94 }),
  ];
}

// ════════════════════════════════════════════════════════════════════
// reference tabs
// ════════════════════════════════════════════════════════════════════

function distinctValues(records, columnPattern) {
  const seen = {};
  records.forEach(function (record) {
    Object.keys(record || {}).forEach(function (key) {
      if (!columnPattern.test(key)) return;
      const value = flattenValue(record[key]);
      if (value !== '' && value.length < 80) seen[value] = true;
    });
  });
  return Object.keys(seen).sort();
}

async function buildReferenceTabs(base44, token, spreadsheetId, sheetIds, recordsByDomain) {
  const allRecords = [];
  Object.keys(recordsByDomain).forEach(function (key) {
    recordsByDomain[key].forEach(function (r) { allRecords.push(r); });
  });

  const disciplines = await base44.asServiceRole.entities.Discipline.list().catch(function () { return []; });
  const classes = await base44.asServiceRole.entities.SeriesClass.list('-created_date', 2000).catch(function () { return []; });

  const sources = [
    { tab: TAB_REF_VISIBILITY, values: STATIC_VISIBILITY },
    { tab: TAB_REF_DISCIPLINES, values: (disciplines || []).map(function (d) { return d.name; }).filter(Boolean).sort() },
    { tab: TAB_REF_CLASSES, values: Array.from(new Set((classes || []).map(function (c) { return c.class_name; }).filter(Boolean))).sort() },
    { tab: TAB_REF_COUNTRIES, values: distinctValues(allRecords, /country/i) },
    { tab: TAB_REF_STATES, values: distinctValues(allRecords, /_state$/i) },
  ];

  for (const source of sources) {
    const sheetId = sheetIds[source.tab];
    if (sheetId === undefined) continue;
    await clearTab(token, spreadsheetId, source.tab, 1);
    const note = (REFERENCE_TABS.find(function (r) { return r.tab === source.tab; }) || {}).note || 'Lookup only.';
    const rows = [[source.tab.replace('Ref · ', '') + ' (lookup only)'], [note]];
    source.values.forEach(function (value) { rows.push([value]); });
    await writeValues(token, spreadsheetId, rangeOf(source.tab, 'A1'), rows);
    await batchUpdateSpreadsheet(token, spreadsheetId, [
      {
        updateSheetProperties: {
          properties: { sheetId: sheetId, gridProperties: { frozenRowCount: 2 } },
          fields: 'gridProperties.frozenRowCount',
        },
      },
      {
        repeatCell: {
          range: gridRange(sheetId, 0, 1, 0, 1),
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat.textFormat.bold',
        },
      },
      {
        autoResizeDimensions: { dimensions: { sheetId: sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 } },
      },
    ]);
  }
}

// ════════════════════════════════════════════════════════════════════
// Read Me + Summary
// ════════════════════════════════════════════════════════════════════

async function writeReadMe(token, spreadsheetId, sheetIds, config, meta) {
  const sheetId = sheetIds[TAB_READ_ME];
  const domainList = DOMAINS.map(function (d) { return d.tab; }).join(', ');
  const lines = [
    ['HIJINX — Import Workbook'],
    [''],
    ['This workbook is written BY the platform. It is never read back.'],
    ['Editing a cell here changes nothing in the app — there is no push, no import-from-sheet, and no approval step. It is a record of what the platform already did.'],
    [''],
    ['How it updates'],
    ['Every import the platform runs — scheduled or manual — appends a row to Import Log and rewrites the domain tabs it touched, the moment it finishes. Imports do not wait on this workbook.'],
    ['A manual refresh from the app rebuilds any tab from the platform, which is how a failed write heals itself.'],
    [''],
    ['What each tab is'],
    ['Summary — the current picture: last import, what it produced, and when each tab last refreshed.'],
    ['Import Log — append-only history of every run, newest first. Never rewritten, so the audit trail survives.'],
    ['Problems — append-only: rows that were skipped or failed, with the reason.'],
    ['Domain tabs — ' + domainList + '. One row per record, carrying the record in full.'],
    ['Reference tabs — lookup only. They feed the dropdowns and sit at the end so nothing gets typed into the middle of a record row.'],
    [''],
    ['Reading a cell'],
    ['An empty cell means "not provided" — not "no".'],
    ['A blank racecore_id is normal on domains that have no ID family; trace those rows by slug.'],
    ['The trailing last_action column says what the most recent run did with that row: created, updated or unchanged.'],
    [''],
    ['Workbook'],
    ['Title: ' + (meta.title || config.spreadsheet_title || '')],
    ['Sheet ID: ' + config.spreadsheet_id],
    ['Setup last run: ' + (config.last_setup_at || 'not yet')],
  ];

  await clearTab(token, spreadsheetId, TAB_READ_ME, 1);
  await writeValues(token, spreadsheetId, rangeOf(TAB_READ_ME, 'A1'), lines);
  await batchUpdateSpreadsheet(token, spreadsheetId, [
    {
      updateSheetProperties: {
        properties: { sheetId: sheetId, gridProperties: { frozenRowCount: 0 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    {
      repeatCell: {
        range: gridRange(sheetId, 0, 1, 0, 1),
        cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14 } } },
        fields: 'userEnteredFormat.textFormat',
      },
    },
    { autoResizeDimensions: { dimensions: { sheetId: sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 } } },
  ]);
}

async function writeSummary(token, spreadsheetId, sheetIds, state) {
  const tabRefresh = state.tabRefreshState || {};
  const lastRun = state.lastRun || null;
  const lines = [
    ['Summary'],
    [''],
    ['Last refresh', state.lastRefreshAt || 'not yet'],
    ['Last import', lastRun ? lastRun.import_name : 'none recorded'],
    ['Last import actor', lastRun ? lastRun.actor : ''],
    ['Last import status', lastRun ? lastRun.status : ''],
    ['Rows read', lastRun ? String(lastRun.rows_read || 0) : '0'],
    ['Created', lastRun ? String(lastRun.created || 0) : '0'],
    ['Updated', lastRun ? String(lastRun.updated || 0) : '0'],
    ['Skipped', lastRun ? String(lastRun.skipped || 0) : '0'],
    ['Failed', lastRun ? String(lastRun.failed || 0) : '0'],
    ['Last write error', state.lastWriteError || 'none'],
    [''],
    ['Tab', 'Rows', 'Last refreshed'],
  ];
  Object.keys(tabRefresh).sort().forEach(function (tab) {
    lines.push([tab, String(tabRefresh[tab].rows || 0), tabRefresh[tab].refreshed_at || '']);
  });
  if (Object.keys(tabRefresh).length === 0) lines.push(['no tabs refreshed yet', '', '']);

  const sheetId = sheetIds[TAB_SUMMARY];
  await clearTab(token, spreadsheetId, TAB_SUMMARY, 1);
  await writeValues(token, spreadsheetId, rangeOf(TAB_SUMMARY, 'A1'), lines);
  await batchUpdateSpreadsheet(token, spreadsheetId, [
    {
      updateSheetProperties: {
        properties: { sheetId: sheetId, gridProperties: { frozenRowCount: 0 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    {
      repeatCell: {
        range: gridRange(sheetId, 0, 1, 0, 1),
        cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14 } } },
        fields: 'userEnteredFormat.textFormat',
      },
    },
    { autoResizeDimensions: { dimensions: { sheetId: sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 3 } } },
  ]);
}

// ════════════════════════════════════════════════════════════════════
// structural tabs (log + problems)
// ════════════════════════════════════════════════════════════════════

async function ensureLogTabs(token, spreadsheetId, sheetIds) {
  const logId = sheetIds[TAB_LOG];
  const problemId = sheetIds[TAB_PROBLEMS];

  const headerRequests = [];
  if (logId !== undefined) {
    headerRequests.push({
      updateSheetProperties: {
        properties: { sheetId: logId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    });
  }
  if (problemId !== undefined) {
    headerRequests.push({
      updateSheetProperties: {
        properties: { sheetId: problemId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    });
  }
  const requests = headerRequests.concat(
    logId !== undefined ? actionFormatting(logId, LOG_HEADERS.length, 9, 1, 'problems') : [],
    problemId !== undefined ? actionFormatting(problemId, PROBLEM_HEADERS.length, 3, 1, 'problems') : [],
    [
      { autoResizeDimensions: { dimensions: { sheetId: logId, dimension: 'COLUMNS', startIndex: 0, endIndex: LOG_HEADERS.length } } },
      { autoResizeDimensions: { dimensions: { sheetId: problemId, dimension: 'COLUMNS', startIndex: 0, endIndex: PROBLEM_HEADERS.length } } },
    ]
  );
  await batchUpdateSpreadsheet(token, spreadsheetId, requests);
}

/** Insert one row directly under the header so newest reads first. */
async function insertTopRow(token, spreadsheetId, sheetId, tabName, row) {
  try {
    await batchUpdateSpreadsheet(token, spreadsheetId, [
      {
        insertRange: {
          range: gridRange(sheetId, 1, 2, 0, row.length),
          shiftDimension: 'ROWS',
        },
      },
    ]);
    await writeValues(token, spreadsheetId, rangeOf(tabName, 'A2'), [row]);
  } catch (e) {
    // Structural insert refused — fall back to a plain append so the record is
    // still kept, just ordered oldest-first.
    await appendValues(token, spreadsheetId, tabName, [row]);
  }
}

// ════════════════════════════════════════════════════════════════════
// public: setup + refresh
// ════════════════════════════════════════════════════════════════════

async function loadDomainData(base44, token, spreadsheetId, sheetIds, runStartedAt, onlyKeys) {
  const recordsByDomain = {};
  const tabRefreshState = {};
  const columnsByDomain = {};

  for (const domain of DOMAINS) {
    if (onlyKeys && onlyKeys.indexOf(domain.key) === -1) continue;
    const sheetId = sheetIds[domain.tab];
    if (sheetId === undefined) continue;

    let records = [];
    try {
      records = await fetchDomainRecords(base44, domain.entity);
    } catch (e) {
      records = [];
    }
    recordsByDomain[domain.key] = records;

    const columns = unionColumns(records);
    const rows = [columns, notesRow(columns, records)].concat(buildDomainRows(records, columns, runStartedAt));

    await clearTab(token, spreadsheetId, domain.tab, 1);
    await writeValues(token, spreadsheetId, rangeOf(domain.tab, 'A1'), rows);

    columnsByDomain[domain.key] = columns;
    await batchUpdateSpreadsheet(token, spreadsheetId, [
      {
        updateSheetProperties: {
          properties: { sheetId: sheetId, gridProperties: { frozenRowCount: 2 } },
          fields: 'gridProperties.frozenRowCount',
        },
      },
      {
        repeatCell: {
          range: gridRange(sheetId, 0, 1, 0, columns.length),
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat.textFormat.bold',
        },
      },
      {
        repeatCell: {
          range: gridRange(sheetId, 1, 2, 0, columns.length),
          cell: { userEnteredFormat: { textFormat: { italic: true, fontSize: 8 } } },
          fields: 'userEnteredFormat.textFormat',
        },
      },
      { autoResizeDimensions: { dimensions: { sheetId: sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: columns.length } } },
    ]);

    tabRefreshState[domain.tab] = { refreshed_at: new Date().toISOString(), rows: records.length };
  }

  return { recordsByDomain: recordsByDomain, tabRefreshState: tabRefreshState, columnsByDomain: columnsByDomain };
}

/** Build or refresh the workbook skeleton. Idempotent — tabs are updated in place. */
export async function setupImportSheet(base44, input) {
  const token = await getSheetsToken(base44);
  const spreadsheetId = extractSpreadsheetId(input.spreadsheet_id || input.spreadsheet_url);
  if (!spreadsheetId) {
    throw new Error(
      'That link points at the published view of the sheet, which is read-only. ' +
      'Open the sheet for editing and paste the link from the address bar — it contains /spreadsheets/d/<id>.'
    );
  }
  const meta = await getSpreadsheet(token, spreadsheetId);
  const workbook = await ensureWorkbook(token, spreadsheetId);
  const runStartedAt = new Date().toISOString();

  const data = await loadDomainData(base44, token, spreadsheetId, workbook.sheetIds, runStartedAt, null);
  await ensureLogTabs(token, spreadsheetId, workbook.sheetIds);

  await writeValues(token, spreadsheetId, rangeOf(TAB_LOG, 'A1'), [LOG_HEADERS]);
  await writeValues(token, spreadsheetId, rangeOf(TAB_PROBLEMS, 'A1'), [PROBLEM_HEADERS]);

  await buildReferenceTabs(base44, token, spreadsheetId, workbook.sheetIds, data.recordsByDomain);

  // Dropdowns and colour rules live on the sheet, not on the values, so they
  // are applied once here and survive every later value rewrite.
  for (const domain of DOMAINS) {
    const columns = data.columnsByDomain[domain.key];
    const sheetId = workbook.sheetIds[domain.tab];
    if (!columns || sheetId === undefined) continue;
    await batchUpdateSpreadsheet(
      token,
      spreadsheetId,
      dropdownRules(sheetId, columns).concat(
        actionFormatting(sheetId, columns.length, columns.indexOf('last_action'), 2, 'domain')
      )
    );
  }

  const existing = await getImportSheetConfig(base44);
  const record = {
    is_active: true,
    spreadsheet_id: spreadsheetId,
    spreadsheet_url: input.spreadsheet_url || input.spreadsheet_id || '',
    spreadsheet_title: (meta.properties || {}).title || '',
    domain_tabs: DOMAINS.map(function (d) { return d.tab; }),
    last_setup_at: runStartedAt,
    last_refresh_at: runStartedAt,
    tab_refresh_state: data.tabRefreshState,
    last_write_error: '',
    last_write_error_at: '',
  };

  if (existing) await saveImportSheetConfig(base44, existing, record);
  else await base44.asServiceRole.entities.ImportSheetConfig.create(record);

  const config = Object.assign({}, record, { id: existing ? existing.id : '' });
  await writeReadMe(token, spreadsheetId, workbook.sheetIds, config, { title: record.spreadsheet_title });
  await writeSummary(token, spreadsheetId, workbook.sheetIds, {
    lastRefreshAt: runStartedAt,
    tabRefreshState: data.tabRefreshState,
    lastRun: null,
    lastWriteError: '',
  });

  return {
    ok: true,
    spreadsheet_id: spreadsheetId,
    spreadsheet_title: record.spreadsheet_title,
    tabs: allTabTitles(),
    refreshed: data.tabRefreshState,
  };
}

/** Bring tabs fully current on demand, independent of any import. */
export async function refreshImportSheet(base44, input) {
  const config = await getImportSheetConfig(base44);
  if (!config) throw new Error('No workbook is connected yet. Connect one first.');

  const token = await getSheetsToken(base44);
  const spreadsheetId = config.spreadsheet_id;
  const workbook = await ensureWorkbook(token, spreadsheetId);
  const runStartedAt = new Date().toISOString();

  const onlyKeys = input && input.tab && input.tab !== 'all'
    ? DOMAINS.filter(function (d) { return d.tab === input.tab || d.key === input.tab; }).map(function (d) { return d.key; })
    : null;

  const data = await loadDomainData(base44, token, spreadsheetId, workbook.sheetIds, runStartedAt, onlyKeys);

  const mergedState = Object.assign({}, config.tab_refresh_state || {}, data.tabRefreshState);
  await saveImportSheetConfig(base44, config, {
    last_refresh_at: runStartedAt,
    tab_refresh_state: mergedState,
    last_write_error: '',
    last_write_error_at: '',
  });
  await writeSummary(token, spreadsheetId, workbook.sheetIds, {
    lastRefreshAt: runStartedAt,
    tabRefreshState: mergedState,
    lastRun: null,
    lastWriteError: '',
  });

  return { ok: true, refreshed: data.tabRefreshState };
}

// ════════════════════════════════════════════════════════════════════
// public: report an import run
// ════════════════════════════════════════════════════════════════════

/**
 * Write one import's outcome into the workbook. Best-effort by design: it
 * never throws, so a failed write can never affect the import that called it.
 *
 * payload: {
 *   import_name, actor, source, status, message,
 *   counts: { read, created, updated, skipped, failed },
 *   domains: ['racers', 'teams', ...],       // tabs to rewrite; empty = none
 *   problems: [{ reference, action, reason }] // skips and failures, optional
 * }
 */
export async function reportImportRun(base44, payload) {
  const runAt = new Date().toISOString();
  const counts = payload.counts || {};
  const problems = Array.isArray(payload.problems) ? payload.problems : [];

  try {
    const config = await getImportSheetConfig(base44);
    if (!config) {
      return { ok: false, skipped: true, reason: 'No import workbook is connected' };
    }

    const token = await getSheetsToken(base44);
    const spreadsheetId = config.spreadsheet_id;
    const workbook = await ensureWorkbook(token, spreadsheetId);

    const logRow = [
      runAt,
      payload.import_name || 'unknown',
      payload.actor || 'unattributed',
      payload.source || '',
      String(counts.read || 0),
      String(counts.created || 0),
      String(counts.updated || 0),
      String(counts.skipped || 0),
      String(counts.failed || 0),
      payload.status || 'completed',
      payload.message || '',
    ];
    await insertTopRow(token, spreadsheetId, workbook.sheetIds[TAB_LOG], TAB_LOG, logRow);

    if (problems.length > 0) {
      const problemId = workbook.sheetIds[TAB_PROBLEMS];
      for (let i = problems.length - 1; i >= 0; i--) {
        const problem = problems[i];
        await insertTopRow(token, spreadsheetId, problemId, TAB_PROBLEMS, [
          runAt,
          payload.import_name || 'unknown',
          flattenValue(problem.reference),
          problem.action || 'skipped',
          problem.reason || '',
        ]);
      }
    }

    const keys = Array.isArray(payload.domains) ? payload.domains : [];
    let tabRefreshState = {};
    if (keys.length > 0) {
      const data = await loadDomainData(base44, token, spreadsheetId, workbook.sheetIds, runAt, keys);
      tabRefreshState = data.tabRefreshState;
    }

    const mergedState = Object.assign({}, config.tab_refresh_state || {}, tabRefreshState);
    await saveImportSheetConfig(base44, config, {
      last_refresh_at: runAt,
      tab_refresh_state: mergedState,
      last_write_error: '',
      last_write_error_at: '',
    });
    await writeSummary(token, spreadsheetId, workbook.sheetIds, {
      lastRefreshAt: runAt,
      tabRefreshState: mergedState,
      lastRun: {
        import_name: logRow[1], actor: logRow[2], status: logRow[9],
        rows_read: counts.read, created: counts.created, updated: counts.updated,
        skipped: counts.skipped, failed: counts.failed,
      },
      lastWriteError: '',
    });

    // In-app record of the run, so the workbook is not the only place it lives.
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'import_sheet_report',
      source_type: 'google_sheets',
      entity_name: 'ImportSheetConfig',
      function_name: payload.import_name || 'unknown',
      status: counts.failed > 0 ? 'failed' : 'completed',
      message: (payload.import_name || 'import') + ' — read ' + (counts.read || 0) +
        ', created ' + (counts.created || 0) + ', updated ' + (counts.updated || 0) +
        ', skipped ' + (counts.skipped || 0) + ', failed ' + (counts.failed || 0),
    }).catch(function () { /* logging is not critical */ });

    return { ok: true, tab_refresh_state: tabRefreshState };
  } catch (error) {
    await recordWriteFailure(base44, error.message);
    return { ok: false, error: error.message };
  }
}