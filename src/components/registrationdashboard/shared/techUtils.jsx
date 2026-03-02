/**
 * Transponder and tech tracking utilities.
 * Tech data is stored in Entry.notes as:
 * INDEX46_TECH_JSON: { transponder: { id, status, assigned_at, assigned_by_user_id } }
 */

const TECH_PREFIX = 'INDEX46_TECH_JSON:';

/**
 * Parse tech data from Entry.notes string.
 * Returns the tech object if found, or a default empty state.
 */
export function parseTechFromNotes(notes) {
  if (!notes || typeof notes !== 'string') {
    return getDefaultTech();
  }

  if (!notes.includes(TECH_PREFIX)) {
    return getDefaultTech();
  }

  try {
    const jsonStr = notes.split(TECH_PREFIX)[1].trim();
    const match = jsonStr.match(/^\{[\s\S]*?\}/);
    if (!match) return getDefaultTech();
    const parsed = JSON.parse(match[0]);
    return {
      transponder: parsed.transponder || getDefaultTransponder(),
    };
  } catch (err) {
    console.warn('[techUtils] Failed to parse tech JSON:', err);
    return getDefaultTech();
  }
}

/**
 * Write tech data to Entry.notes, preserving other prefixed blocks.
 */
export function writeTechToNotes(currentNotes, nextTech) {
  if (!currentNotes || typeof currentNotes !== 'string') {
    return `${TECH_PREFIX} ${JSON.stringify(nextTech)}`;
  }

  // Remove old tech block if present
  let preserved = currentNotes;
  if (preserved.includes(TECH_PREFIX)) {
    const parts = preserved.split(TECH_PREFIX);
    const before = parts[0];
    const after = parts[1];
    const match = after.match(/^\{[\s\S]*?\}([\s\S]*)/);
    preserved = before + (match ? match[1] : '');
  }

  // Append new tech block
  const newBlock = `${TECH_PREFIX} ${JSON.stringify(nextTech)}`;
  return (preserved + ' ' + newBlock).trim();
}

/**
 * Get a display car number from Entry with fallbacks.
 */
export function getEntryCarNumber(entry) {
  if (!entry) return null;
  if (entry.car_number) return entry.car_number;
  if (entry.number) return entry.number;
  if (entry.vehicle_number) return entry.vehicle_number;
  return null;
}

/**
 * Build a conflict map for all entries in an event.
 * Returns:
 * {
 *   duplicateCarNumbers: Record<string, string[]>,
 *   duplicateTransponders: Record<string, string[]>,
 *   entryFlags: Record<string, { carNumberDuplicate, transponderDuplicate, transponderMissing }>
 * }
 */
export function buildEventConflictMap(entries) {
  const duplicateCarNumbers = {};
  const duplicateTransponders = {};
  const entryFlags = {};

  if (!entries || !Array.isArray(entries)) {
    return { duplicateCarNumbers, duplicateTransponders, entryFlags };
  }

  // Count car numbers
  const carNumberCounts = {};
  entries.forEach(e => {
    const carNum = getEntryCarNumber(e);
    if (carNum) {
      if (!carNumberCounts[carNum]) carNumberCounts[carNum] = [];
      carNumberCounts[carNum].push(e.id);
    }
  });

  // Count transponders
  const transpondercounts = {};
  entries.forEach(e => {
    const tech = parseTechFromNotes(e.notes);
    const transpId = tech?.transponder?.id;
    if (transpId) {
      if (!transpondercounts[transpId]) transpondercounts[transpId] = [];
      transpondercounts[transpId].push(e.id);
    }
  });

  // Identify duplicates
  Object.entries(carNumberCounts).forEach(([carNum, ids]) => {
    if (ids.length > 1) {
      duplicateCarNumbers[carNum] = ids;
    }
  });

  Object.entries(transpondercounts).forEach(([transpId, ids]) => {
    if (ids.length > 1) {
      duplicateTransponders[transpId] = ids;
    }
  });

  // Build per-entry flags
  entries.forEach(e => {
    const tech = parseTechFromNotes(e.notes);
    const carNum = getEntryCarNumber(e);
    const transpId = tech?.transponder?.id;

    const carNumberDuplicate = carNum && duplicateCarNumbers[carNum] ? true : false;
    const transponderDuplicate = transpId && duplicateTransponders[transpId] ? true : false;
    const transponderMissing = !transpId;

    entryFlags[e.id] = {
      carNumberDuplicate,
      transponderDuplicate,
      transponderMissing,
    };
  });

  return { duplicateCarNumbers, duplicateTransponders, entryFlags };
}

/**
 * Create a new transponder state.
 */
export function createTransponderState(
  id = null,
  status = 'missing',
  assignedByUserId = null
) {
  return {
    id,
    status: status || (id ? 'assigned' : 'missing'),
    assigned_at: id && status === 'assigned' ? new Date().toISOString() : null,
    assigned_by_user_id: id ? assignedByUserId : null,
  };
}

// Defaults
function getDefaultTech() {
  return {
    transponder: getDefaultTransponder(),
  };
}

function getDefaultTransponder() {
  return {
    id: null,
    status: 'missing',
    assigned_at: null,
    assigned_by_user_id: null,
  };
}