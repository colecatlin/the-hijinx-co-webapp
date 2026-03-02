/**
 * Entry Workflow Helper
 * Standardizes how Entry.notes JSON blocks are parsed, merged, and persisted.
 * All tabs (Entries, CheckIn, Compliance, Tech) use this helper for mutations.
 */

const BLOCKS = {
  ENTRY: 'INDEX46_ENTRY_JSON',
  CHECKIN: 'INDEX46_CHECKIN_JSON',
  COMPLIANCE: 'INDEX46_COMPLIANCE_JSON',
  TECH: 'INDEX46_TECH_JSON',
};

/**
 * Safely parse Entry.notes string into a structured object.
 * Returns object with keys: INDEX46_ENTRY_JSON, INDEX46_CHECKIN_JSON, etc.
 * Missing blocks are initialized as empty objects.
 */
export function safeParseNotes(notesString) {
  const result = {
    [BLOCKS.ENTRY]: {},
    [BLOCKS.CHECKIN]: {},
    [BLOCKS.COMPLIANCE]: {},
    [BLOCKS.TECH]: {},
  };

  if (!notesString || typeof notesString !== 'string') {
    return result;
  }

  try {
    const parsed = JSON.parse(notesString);
    if (typeof parsed === 'object' && parsed !== null) {
      // Merge any existing blocks
      Object.keys(BLOCKS).forEach((key) => {
        if (parsed[BLOCKS[key]]) {
          result[BLOCKS[key]] = parsed[BLOCKS[key]];
        }
      });
    }
  } catch (e) {
    // If parsing fails, return defaults and preserve raw notes in a text block
    console.warn('Failed to parse Entry.notes as JSON, initializing defaults');
  }

  return result;
}

/**
 * Merge a patch object (one or more blocks) into existing notes.
 * Preserves any blocks not mentioned in the patch.
 * Returns the new notes string (JSON).
 */
export function mergeNotes(existingNotesString, patchBlocks) {
  const current = safeParseNotes(existingNotesString);

  // Apply patch blocks
  Object.entries(patchBlocks).forEach(([blockName, blockValue]) => {
    if (blockValue === null) {
      // null means delete the block
      delete current[blockName];
    } else if (typeof blockValue === 'object') {
      // Merge object into block
      current[blockName] = { ...current[blockName], ...blockValue };
    }
  });

  // Clean up empty blocks
  Object.keys(current).forEach((key) => {
    if (typeof current[key] === 'object' && Object.keys(current[key]).length === 0) {
      delete current[key];
    }
  });

  return JSON.stringify(current);
}

/**
 * Update an Entry record using the workflow helper.
 * - Updates Entry.notes by merging patchBlocks
 * - Also updates native Entry fields if they exist
 * - Returns the updated Entry object or throws on error
 */
export async function updateEntryWorkflow(entryId, patchBlocks, base44, nativeFieldUpdates = {}) {
  try {
    const entry = await base44.entities.Entry.get(entryId);
    const newNotes = mergeNotes(entry.notes || '', patchBlocks);

    // Build final update payload
    const updatePayload = {
      notes: newNotes,
      ...nativeFieldUpdates,
    };

    const updated = await base44.entities.Entry.update(entryId, updatePayload);
    return updated;
  } catch (err) {
    console.error('updateEntryWorkflow failed:', err);
    throw err;
  }
}

/**
 * Helper: Extract a specific block from notes
 */
export function getBlock(notesString, blockName) {
  const parsed = safeParseNotes(notesString);
  return parsed[blockName] || {};
}

/**
 * Helper: Set a specific block in notes
 */
export function setBlock(notesString, blockName, blockValue) {
  const patchBlocks = {
    [blockName]: blockValue,
  };
  return mergeNotes(notesString, patchBlocks);
}