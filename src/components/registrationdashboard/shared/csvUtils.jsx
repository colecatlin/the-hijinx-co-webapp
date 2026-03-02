/**
 * CSV parsing utilities for RegistrationDashboard import flows.
 * No external libraries—pure string parsing.
 */

/**
 * Parse CSV text into headers and rows.
 * Handles quoted fields with embedded commas and quotes.
 */
export function parseCSV(text) {
  if (!text || typeof text !== 'string') {
    return { headers: [], rows: [] };
  }

  const lines = text.split('\n');
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  if (headers.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty rows

    const values = parseCSVLine(line);
    const row = {};

    // Map values to headers
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line respecting quoted fields.
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Final field
  fields.push(current.trim());

  return fields;
}

/**
 * Normalize a header for matching purposes.
 */
export function normalizeHeader(header) {
  if (!header || typeof header !== 'string') return '';
  return header
    .toLowerCase()
    .trim()
    .replace(/[\s_-]/g, '');
}

/**
 * Guess column mapping based on CSV headers.
 * Returns object mapping target fields to source column indices.
 */
export function guessColumnMap(headers) {
  const normalized = headers.map(normalizeHeader);
  const mapping = {};

  // Define target fields and their possible aliases
  const targets = {
    driver_id: ['driverid', 'driver_id'],
    driver_first_name: ['driverfirstname', 'driver_first_name', 'firstname', 'first_name', 'fname'],
    driver_last_name: ['driverlastname', 'driver_last_name', 'lastname', 'last_name', 'lname'],
    car_number: ['carnumber', 'car_number', 'number', 'bib', 'bibnumber', 'carnum'],
    transponder_id: ['transponderid', 'transponder_id', 'transponder', 'transpondernumber'],
    team_id: ['teamid', 'team_id'],
    team_name: ['teamname', 'team_name', 'team'],
    class_name: ['classname', 'class_name', 'class'],
    series_class_id: ['seriesclassid', 'series_class_id', 'classid'],
    entry_status: ['entrystatus', 'entry_status', 'status'],
    payment_status: ['paymentstatus', 'payment_status', 'payment'],
    notes: ['notes', 'comments', 'notes_admin'],
  };

  // Match each target to first matching column
  Object.entries(targets).forEach(([target, aliases]) => {
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias);
      if (idx !== -1) {
        mapping[target] = idx;
        break; // Use first match
      }
    }
  });

  return mapping;
}

/**
 * Validate an imported row.
 * Returns array of error strings (empty if valid).
 */
export function validateEntryRow(row, mapping, seriesClasses, drivers, teams, eventId) {
  const errors = [];

  // Resolve driver
  const driverId = row[Object.keys(row)[mapping.driver_id || -1]];
  const driverFirstName = row[Object.keys(row)[mapping.driver_first_name || -1]];
  const driverLastName = row[Object.keys(row)[mapping.driver_last_name || -1]];

  if (!driverId && (!driverFirstName || !driverLastName)) {
    errors.push('Driver ID or first+last name required');
  }

  // Require car number
  const carNumber = row[Object.keys(row)[mapping.car_number || -1]];
  if (!carNumber || !carNumber.trim()) {
    errors.push('Car number required');
  }

  return errors;
}