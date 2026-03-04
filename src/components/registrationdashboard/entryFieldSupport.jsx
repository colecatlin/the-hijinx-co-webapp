/**
 * Entry Field Support Helper
 * Maps supported Entry fields and provides graceful fallbacks for missing fields.
 * If a field doesn't exist on Entry entity, values are stored in Entry.notes using structured metadata.
 */

export const ENTRY_SUPPORTED_FIELDS = {
  car_number: true,
  transponder_id: true,
  entry_status: true,
  payment_status: true,
  checkin_status: true,
  tech_status: true,
  notes: true,
};

export const ENTRY_META_BLOCK_KEY = 'INDEX46_ENTRY_META';

/**
 * Parse Entry.notes for metadata block
 * Returns object with parsed key=value pairs
 */
export function parseEntryMeta(notes) {
  if (!notes || typeof notes !== 'string') return {};
  const lines = notes.split('\n');
  const blockIdx = lines.findIndex(l => l.includes(ENTRY_META_BLOCK_KEY));
  if (blockIdx === -1) return {};
  
  const meta = {};
  for (let i = blockIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.includes('=')) {
      const [key, val] = line.split('=').map(s => s.trim());
      if (key) meta[key] = val || '';
    }
  }
  return meta;
}

/**
 * Write metadata block into Entry.notes
 * Preserves existing notes, updates or appends metadata block
 */
export function writeEntryMeta(notes, metaObj) {
  if (!notes || typeof notes !== 'string') notes = '';
  
  // Find and remove existing metadata block
  let lines = notes.split('\n');
  const blockIdx = lines.findIndex(l => l.includes(ENTRY_META_BLOCK_KEY));
  if (blockIdx !== -1) {
    // Remove from blockIdx until next blank line or end
    let endIdx = blockIdx + 1;
    while (endIdx < lines.length && lines[endIdx].trim() !== '') {
      endIdx++;
    }
    lines = [...lines.slice(0, blockIdx), ...lines.slice(endIdx)];
  }
  
  // Rebuild notes without trailing blank lines
  const baseNotes = lines.map(l => l.trim()).filter(Boolean).join('\n');
  
  // Build metadata block
  const metaLines = [ENTRY_META_BLOCK_KEY];
  Object.entries(metaObj).forEach(([k, v]) => {
    metaLines.push(`${k}=${v || ''}`);
  });
  
  // Combine
  return baseNotes ? `${baseNotes}\n${metaLines.join('\n')}` : metaLines.join('\n');
}

/**
 * Get field value with fallback to metadata
 */
export function getEntryFieldValue(entry, fieldName) {
  // Try direct field first
  if (ENTRY_SUPPORTED_FIELDS[fieldName] && entry[fieldName] !== undefined && entry[fieldName] !== null) {
    return entry[fieldName];
  }
  
  // Fall back to metadata in notes
  const meta = parseEntryMeta(entry.notes);
  return meta[fieldName] || '';
}

/**
 * Build payload for Entry.update, intelligently placing values
 */
export function buildEntryPayload(entry, updates) {
  const payload = {};
  let metaUpdates = {};
  
  Object.entries(updates).forEach(([key, value]) => {
    if (ENTRY_SUPPORTED_FIELDS[key]) {
      // Direct field
      payload[key] = value;
    } else {
      // Store in metadata
      metaUpdates[key] = value;
    }
  });
  
  // If there are metadata updates, write to notes
  if (Object.keys(metaUpdates).length > 0) {
    const meta = parseEntryMeta(entry.notes);
    const updated = { ...meta, ...metaUpdates };
    payload.notes = writeEntryMeta(entry.notes, updated);
  }
  
  return payload;
}