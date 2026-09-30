/**
 * sheetsApi.ts — shared low-level Google Sheets REST helpers.
 *
 * Used by importSheetWriter.ts only. Keeping the raw API surface in one
 * module means every write path goes through the same auth, error and
 * encoding behaviour, rather than each caller re-deriving it.
 */

export const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Pull the spreadsheet ID out of a Google Sheets link.
 *
 * Only the EDITING identity works — the published 2PACX key from a /pubhtml
 * link is a separate, read-only handle and cannot be written through.
 * Returns null when the input is a published link or is not recognisable.
 */
export function extractSpreadsheetId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.indexOf('/spreadsheets/d/e/') !== -1) return null;
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

/** OAuth access token for the connected Google account. */
export async function getSheetsToken(base44) {
  const conn = await base44.asServiceRole.connectors.getConnection('googlesheets');
  if (!conn || !conn.accessToken) {
    throw new Error('Google Sheets is not connected. Connect it before writing to the workbook.');
  }
  return conn.accessToken;
}

export async function sheetsFetch(token, url, init) {
  const options = init || {};
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: Object.assign(
      { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      options.headers || {}
    ),
    body: options.body,
  });
  if (!res.ok) {
    const text = await res.text().catch(function () { return ''; });
    throw new Error('Sheets API ' + res.status + ': ' + text.slice(0, 300));
  }
  if (res.status === 204) return {};
  return res.json().catch(function () { return {}; });
}

export async function getSpreadsheet(token, spreadsheetId) {
  return sheetsFetch(
    token,
    SHEETS_API + '/' + spreadsheetId + '?fields=properties.title,sheets.properties'
  );
}

export function quoteTab(tabName) {
  return "'" + String(tabName).replace(/'/g, "''") + "'";
}

export function rangeOf(tabName, a1) {
  return quoteTab(tabName) + '!' + a1;
}

/** 0-based column index → A1 column letter (0 → A, 26 → AA). */
export function colLetter(index) {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Read one range as a grid of rows. */
export async function readValues(token, spreadsheetId, range) {
  return sheetsFetch(
    token,
    SHEETS_API + '/' + spreadsheetId + '/values/' + encodeURIComponent(range) + '?majorDimension=ROWS'
  );
}

/** Write one range. */
export async function writeValues(token, spreadsheetId, range, values) {
  return sheetsFetch(
    token,
    SHEETS_API + '/' + spreadsheetId + '/values/' + encodeURIComponent(range) + '?valueInputOption=RAW',
    { method: 'PUT', body: JSON.stringify({ values: values }) }
  );
}

/** Write several ranges in one call. */
export async function batchWriteValues(token, spreadsheetId, data) {
  return sheetsFetch(token, SHEETS_API + '/' + spreadsheetId + '/values:batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data: data }),
  });
}

/**
 * Write a whole tab as one grid, chunked so a large domain never builds a
 * single oversized request.
 */
export async function writeTabGrid(token, spreadsheetId, tabName, rows, columnsPerRow) {
  const CHUNK = 2000;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const slice = rows.slice(start, start + CHUNK);
    const range = rangeOf(tabName, 'A' + (start + 1) + ':' + colLetter(columnsPerRow - 1)) ;
    await writeValues(token, spreadsheetId, range, slice);
  }
}

export async function appendValues(token, spreadsheetId, tabName, rows) {
  return sheetsFetch(
    token,
    SHEETS_API + '/' + spreadsheetId + '/values/' + encodeURIComponent(rangeOf(tabName, 'A1')) +
      ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
    { method: 'POST', body: JSON.stringify({ values: rows }) }
  );
}

export async function batchUpdateSpreadsheet(token, spreadsheetId, requests) {
  if (!requests || requests.length === 0) return {};
  return sheetsFetch(token, SHEETS_API + '/' + spreadsheetId + ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests: requests }),
  });
}

export function gridRange(sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex) {
  return {
    sheetId: sheetId,
    startRowIndex: startRowIndex,
    endRowIndex: endRowIndex,
    startColumnIndex: startColumnIndex,
    endColumnIndex: endColumnIndex,
  };
}

/**
 * Flatten any stored value to a single readable cell. Lists become a
 * delimited cell rather than spilling across unknown columns, so a tab's
 * shape stays predictable between runs.
 */
export function flattenValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const parts = value
      .map(function (item) { return flattenValue(item); })
      .filter(function (part) { return part !== ''; });
    return parts.join(' | ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '';
    }
  }
  return String(value);
}