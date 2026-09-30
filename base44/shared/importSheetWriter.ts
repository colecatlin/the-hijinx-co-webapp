/**
 * importSheetWriter.ts — everything the platform does to the master workbook.
 *
 * Contract with the rest of the platform
 * ─────────────────────────────────────
 * The workbook is TWO-WAY. The six record tabs are the import templates: an
 * admin types rows into them and the platform reads them back. Everything else
 * — Read Me, Summary, Import Log, Problems, the reference tabs — is written BY
 * the platform and never read.
 *
 * The one rule that must never be broken: a domain tab is cleared only by
 * setup (the one-time conversion from the old mirror to the template), and
 * never by an import. An import may only stamp the columns it owns beside a
 * row, in place. Clearing a tab during an import is what would destroy a row
 * the admin typed.
 *
 * Two kinds of platform tab, deliberately different:
 *   - Import Log / Problems — append-only history. Never rewritten.
 *   - Domain tabs — the admin's input surface, stamped in place.
 */

import {
  extractSpreadsheetId, getSheetsToken, getSpreadsheet,
  quoteTab, rangeOf, colLetter, readValues, writeValues, batchWriteValues,
  appendValues, batchUpdateSpreadsheet, gridRange, flattenValue, sheetsFetch, SHEETS_API,
} from './sheetsApi.ts';

import {
  WORKBOOK_DOMAINS, STAMP_COLUMNS, STAMP_COLUMN_NAMES, templateColumns, inputColumnNames,
} from './workbookTemplates.ts';

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
export const DOMAINS = WORKBOOK_DOMAINS;
export const DOMAIN_KEYS = WORKBOOK_DOMAINS.map(function (d) { return d.key; });
export const DOMAIN_TABS = WORKBOOK_DOMAINS.map(function (d) { return d.tab; });

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

/** Merge new per-tab state without dropping what a previous run recorded. */
export async function mergeTabState(base44, config, perTab) {
  const merged = Object.assign({}, config.tab_refresh_state || {});
  Object.keys(perTab).forEach(function (tab) {
    merged[tab] = Object.assign({}, merged[tab] || {}, perTab[tab]);
  });
  await saveImportSheetConfig(base44, config, {
    last_refresh_at: new Date().toISOString(),
    tab_refresh_state: merged,
    last_write_error: '',
    last_write_error_at: '',
  });
  return merged;
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
// template tabs
// ════════════════════════════════════════════════════════════════════

export function headerRowOf(domain) {
  return templateColumns(domain);
}

export function notesRowOf(domain) {
  const names = templateColumns(domain);
  return names.map(function (name) {
    const own = domain.columns.find(function (c) { return c.name === name; });
    if (own) return (own.required ? 'REQUIRED — ' : '') + own.note;
    const stamp = STAMP_COLUMNS_BY_NAME[name];
    return stamp ? stamp.note : '';
  });
}

const STAMP_COLUMNS_BY_NAME = {};
STAMP_COLUMNS.forEach(function (column) {
  STAMP_COLUMNS_BY_NAME[column.name] = column;
});

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
    rule('skipped', { red: 1, green: 0.96, blue: 0.85 }),
    rule('failed', { red: 0.98, green: 0.9, blue: 0.9 }),
  ];
}

/**
 * Write a template tab's header and notes. Data rows below are only cleared
 * when clearData is set, which only setup does — the one-time conversion from
 * the old full-record mirror into a template.
 */
async function writeTemplateTab(token, spreadsheetId, sheetIds, domain, clearData) {
  const sheetId = sheetIds[domain.tab];
  if (sheetId === undefined) return;

  const header = headerRowOf(domain);
  const notes = notesRowOf(domain);

  if (clearData) await clearTab(token, spreadsheetId, domain.tab, 1);
  await writeValues(token, spreadsheetId, rangeOf(domain.tab, 'A1'), [header, notes]);

  const actionIndex = header.indexOf('last_action');
  await batchUpdateSpreadsheet(token, spreadsheetId, [
    {
      updateSheetProperties: {
        properties: { sheetId: sheetId, gridProperties: { frozenRowCount: 2 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    {
      repeatCell: {
        range: gridRange(sheetId, 0, 1, 0, header.length),
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat.bold',
      },
    },
    {
      repeatCell: {
        range: gridRange(sheetId, 1, 2, 0, header.length),
        cell: { userEnteredFormat: { textFormat: { italic: true, fontSize: 8 } } },
        fields: 'userEnteredFormat.textFormat',
      },
    },
    { autoResizeDimensions: { dimensions: { sheetId: sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: header.length } } },
  ].concat(
    dropdownRules(sheetId, header),
    actionIndex >= 0 ? actionFormatting(sheetId, header.length, actionIndex, 2, 'domain') : []
  ));
}

/**
 * Read every template tab. A tab still carrying the old mirror layout is
 * reported as stale rather than guessed at — importing rows from a layout we
 * do not recognise would be worse than refusing.
 */
export async function readWorkbookTabs(base44, config, onlyKeys) {
  const token = await getSheetsToken(base44);
  const spreadsheetId = config.spreadsheet_id;
  const workbook = await ensureWorkbook(token, spreadsheetId);
  const out = {};
  const stale = [];

  for (const domain of DOMAINS) {
    if (onlyKeys && onlyKeys.indexOf(domain.key) === -1) continue;

    const columns = templateColumns(domain);
    const lastCol = colLetter(columns.length - 1);

    const headerBody = await readValues(token, spreadsheetId, rangeOf(domain.tab, 'A1:' + lastCol + '1'));
    const actual = ((headerBody.values || [])[0] || []).map(function (v) { return String(v).trim(); });
    const expected = headerRowOf(domain);
    const matches = expected.every(function (name, index) { return actual[index] === name; });

    if (!matches) {
      stale.push(domain.tab);
      out[domain.key] = { domain, columns, rows: [], stale: true };
      continue;
    }

    const body = await readValues(token, spreadsheetId, rangeOf(domain.tab, 'A3:' + lastCol));
    const rows = (body.values || []).map(function (values, index) {
      return { sheet_row: index + 3, values: values || [] };
    });
    out[domain.key] = { domain, columns, rows, stale: false };
  }

  return { tabs: out, stale };
}

/**
 * Stamp the platform block beside each row we looked at, in one batched write.
 * The block is contiguous and sits after the admin's own columns, so nothing
 * they typed is ever overwritten.
 */
export async function writeRowStamps(base44, config, domain, updates) {
  if (!updates || updates.length === 0) return;
  const token = await getSheetsToken(base44);
  const spreadsheetId = config.spreadsheet_id;

  const columns = templateColumns(domain);
  const start = inputColumnNames(domain).length;
  const firstCol = colLetter(start);
  const lastCol = colLetter(columns.length - 1);

  const data = updates.map(function (u) {
    return {
      range: rangeOf(domain.tab, firstCol + u.sheet_row + ':' + lastCol + u.sheet_row),
      values: [STAMP_COLUMN_NAMES.map(function (name) {
        const value = u.stamp[name];
        return value === undefined || value === null ? '' : String(value);
      })],
    };
  });

  const CHUNK = 400;
  for (let i = 0; i < data.length; i += CHUNK) {
    await batchWriteValues(token, spreadsheetId, data.slice(i, i + CHUNK));
  }
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

async function buildReferenceTabs(base44, token, spreadsheetId, sheetIds) {
  const allRecords = [];
  for (const domain of DOMAINS) {
    const rows = await base44.asServiceRole.entities[domain.entity]
      .list('-updated_date', 2000)
      .catch(function () { return []; });
    (rows || []).forEach(function (r) { allRecords.push(r); });
  }

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
      { autoResizeDimensions: { dimensions: { sheetId: sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 } } },
    ]);
  }
}

// ════════════════════════════════════════════════════════════════════
// Read Me + Summary
// ════════════════════════════════════════════════════════════════════

async function writeReadMe(token, spreadsheetId, sheetIds, config) {
  const sheetId = sheetIds[TAB_READ_ME];
  const lines = [
    ['HIJINX — Import Workbook'],
    [''],
    ['Type rows into the six record tabs. They ARE the import templates.'],
    ['One action pulls all six tabs into the platform at once, so adding racers, teams, tracks, series, events and organizations no longer means running several separate imports.'],
    [''],
    ['How to use it'],
    ['1. Open the tab for the record you want — Racers, Teams, Tracks, Series, Events or Organizations.'],
    ['2. Type one row per record. The notes row under the header explains every column; the ones marked REQUIRED must be filled.'],
    ['3. Run Import from the Import Workbook page in the app. Use Check first if you want to see what would happen without changing anything.'],
    ['4. Each row is stamped at the end of its own row with the record it produced — or with why it was flagged.'],
    [''],
    ['What the platform writes — never type in these columns'],
    ['platform_name, platform_id, platform_racecore_id, platform_slug, last_action, last_run_at, last_note.'],
    ['Once platform_id is filled the row is already on the platform and will never be created a second time. Clear the platform columns to make a row try again.'],
    [''],
    ['Clashes are never merged'],
    ['A row that matches a record the platform already holds is skipped, left exactly as you typed it, and flagged in Problems with the record it matched. Nothing already on the platform is overwritten by this workbook.'],
    [''],
    ['New records arrive as drafts'],
    ['Imported records are created in a draft state, so nothing reaches the public site until it is published from the app.'],
    [''],
    ['Events need their series and track first'],
    ['The Series and Track columns on the Events tab take the platform_id of those records. Import the Series and Tracks tabs first, then copy the IDs across.'],
    [''],
    ['Not covered yet'],
    ['Media profiles and outlets, crew, officials and volunteers, and the operational records — entries, sessions, results and standings. Those keep their existing import screens.'],
    [''],
    ['What each tab is'],
    ['Summary — the current picture: what the last import produced, and how many rows each tab is holding.'],
    ['Import Log — append-only history of every run, newest first. Never rewritten, so the audit trail survives.'],
    ['Problems — append-only: rows that were skipped or failed, with the reason.'],
    ['The six record tabs — the templates, described above.'],
    ['Reference tabs — lookup only. They feed the dropdowns and sit at the end so nothing gets typed into the middle of a record row.'],
    [''],
    ['Workbook'],
    ['Title: ' + (config.spreadsheet_title || '')],
    ['Sheet ID: ' + config.spreadsheet_id],
    ['Templates last built: ' + (config.last_setup_at || 'not yet')],
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
    ['Last import', lastRun ? lastRun.import_name : 'none recorded'],
    ['Last import actor', lastRun ? lastRun.actor : ''],
    ['Last import status', lastRun ? lastRun.status : ''],
    ['Rows read', lastRun ? String(lastRun.rows_read || 0) : '0'],
    ['Created', lastRun ? String(lastRun.created || 0) : '0'],
    ['Updated', lastRun ? String(lastRun.updated || 0) : '0'],
    ['Skipped', lastRun ? String(lastRun.skipped || 0) : '0'],
    ['Failed', lastRun ? String(lastRun.failed || 0) : '0'],
    ['Last sheet write error', state.lastWriteError || 'none'],
    [''],
    ['Tab', 'Rows waiting', 'Last checked', 'Last import'],
  ];
  Object.keys(tabRefresh).sort().forEach(function (tab) {
    const entry = tabRefresh[tab] || {};
    lines.push([
      tab,
      entry.waiting === undefined || entry.waiting === null ? '' : String(entry.waiting),
      entry.checked_at || '',
      entry.last_run_name || '',
    ]);
  });
  if (Object.keys(tabRefresh).length === 0) lines.push(['nothing recorded yet', '', '', '']);

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
    { autoResizeDimensions: { dimensions: { sheetId: sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 4 } } },
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
// public: setup + rebuild
// ════════════════════════════════════════════════════════════════════

/**
 * Build or rebuild the workbook. The six record tabs are rewritten as
 * templates — header, notes, and nothing else — which is the one-time
 * conversion from the old full-record mirror and the only thing that ever
 * clears a domain tab.
 */
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

  await ensureLogTabs(token, spreadsheetId, workbook.sheetIds);
  await writeValues(token, spreadsheetId, rangeOf(TAB_LOG, 'A1'), [LOG_HEADERS]);
  await writeValues(token, spreadsheetId, rangeOf(TAB_PROBLEMS, 'A1'), [PROBLEM_HEADERS]);

  for (const domain of DOMAINS) {
    await writeTemplateTab(token, spreadsheetId, workbook.sheetIds, domain, true);
  }
  await buildReferenceTabs(base44, token, spreadsheetId, workbook.sheetIds);

  const existing = await getImportSheetConfig(base44);
  const record = {
    is_active: true,
    spreadsheet_id: spreadsheetId,
    spreadsheet_url: input.spreadsheet_url || input.spreadsheet_id || '',
    spreadsheet_title: (meta.properties || {}).title || '',
    domain_tabs: DOMAIN_TABS,
    last_setup_at: runStartedAt,
    last_refresh_at: runStartedAt,
    last_write_error: '',
    last_write_error_at: '',
  };

  if (existing) await saveImportSheetConfig(base44, existing, record);
  else await base44.asServiceRole.entities.ImportSheetConfig.create(record);

  const config = Object.assign({}, record, {
    id: existing ? existing.id : '',
    tab_refresh_state: existing ? existing.tab_refresh_state || {} : {},
  });
  await writeReadMe(token, spreadsheetId, workbook.sheetIds, config);
  await writeSummary(token, spreadsheetId, workbook.sheetIds, {
    lastRefreshAt: runStartedAt,
    tabRefreshState: config.tab_refresh_state,
    lastRun: null,
    lastWriteError: '',
  });

  return {
    ok: true,
    spreadsheet_id: spreadsheetId,
    spreadsheet_title: config.spreadsheet_title,
    tabs: allTabTitles(),
  };
}

/**
 * Rewrite a template tab's header and notes, and refresh the reference tabs.
 * Typed rows below the notes row are never touched — this is how a header or a
 * dropdown heals without costing the admin a single row.
 */
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

  for (const domain of DOMAINS) {
    if (onlyKeys && onlyKeys.indexOf(domain.key) === -1) continue;
    await writeTemplateTab(token, spreadsheetId, workbook.sheetIds, domain, false);
  }
  if (!onlyKeys) await buildReferenceTabs(base44, token, spreadsheetId, workbook.sheetIds);

  await saveImportSheetConfig(base44, config, {
    last_refresh_at: runStartedAt,
    last_write_error: '',
    last_write_error_at: '',
  });
  await writeSummary(token, spreadsheetId, workbook.sheetIds, {
    lastRefreshAt: runStartedAt,
    tabRefreshState: config.tab_refresh_state || {},
    lastRun: null,
    lastWriteError: '',
  });

  return { ok: true, rebuilt: onlyKeys || DOMAIN_KEYS };
}

// ════════════════════════════════════════════════════════════════════
// public: report an import run
// ════════════════════════════════════════════════════════════════════

/**
 * Write one import's outcome into the workbook. Best-effort by design: it
 * never throws, so a failed write can never affect the import that called it.
 *
 * Domain tabs are never rewritten here. They are the admin's input surface now,
 * so an import may only stamp the rows it dealt with — which it does itself.
 *
 * payload: {
 *   import_name, actor, source, status, message,
 *   counts: { read, created, updated, skipped, failed },
 *   domains: ['racers', 'teams', ...],       // tabs whose state to update
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
    keys.forEach(function (key) {
      const domain = DOMAINS.find(function (d) { return d.key === key || d.tab === key; });
      if (!domain) return;
      tabRefreshState[domain.tab] = {
        last_run_at: runAt,
        last_run_name: payload.import_name || 'import',
        last_run_created: counts.created || 0,
      };
    });

    const mergedState = Object.assign({}, config.tab_refresh_state || {});
    Object.keys(tabRefreshState).forEach(function (tab) {
      mergedState[tab] = Object.assign({}, mergedState[tab] || {}, tabRefreshState[tab]);
    });

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