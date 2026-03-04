import { base44 } from '@/api/base44Client';

/**
 * Recompute compliance flags for entries in an event.
 * 
 * - duplicate_number_flag: true if car_number appears more than once in same class
 * - missing_transponder_flag: true if transponder_id is empty
 * 
 * Returns array of updates to apply.
 */
export async function recomputeComplianceFlags(entries) {
  const updates = [];

  // Group by series_class_id
  const byClass = {};
  entries.forEach((e) => {
    const classId = e.series_class_id || 'unknown';
    if (!byClass[classId]) byClass[classId] = [];
    byClass[classId].push(e);
  });

  // Check for duplicates within each class
  Object.values(byClass).forEach((classEntries) => {
    const numberCounts = {};
    classEntries.forEach((e) => {
      if (!numberCounts[e.car_number]) numberCounts[e.car_number] = [];
      numberCounts[e.car_number].push(e.id);
    });

    // Mark duplicates
    Object.entries(numberCounts).forEach(([carNum, ids]) => {
      if (ids.length > 1) {
        ids.forEach((id) => {
          updates.push({
            id,
            data: { duplicate_number_flag: true }
          });
        });
      }
    });
  });

  // Check for missing transponders
  entries.forEach((e) => {
    const hasMissing = !e.transponder_id;
    const currentFlag = e.missing_transponder_flag || false;
    if (hasMissing !== currentFlag) {
      const existing = updates.find(u => u.id === e.id);
      if (existing) {
        existing.data.missing_transponder_flag = hasMissing;
      } else {
        updates.push({
          id: e.id,
          data: { missing_transponder_flag: hasMissing }
        });
      }
    }
  });

  return updates;
}

/**
 * Apply bulk compliance flag recompute
 */
export async function applyComplianceRecompute(entries) {
  const updates = await recomputeComplianceFlags(entries);
  if (updates.length === 0) return [];

  return Promise.all(updates.map(u => base44.entities.Entry.update(u.id, u.data)));
}