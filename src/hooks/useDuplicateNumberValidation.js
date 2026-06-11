/**
 * R9CX Phase 3 — useDuplicateNumberValidation
 * Detects duplicate car numbers within an event before save.
 * Checks within same event and same class (excluding Withdrawn entries).
 */
import { useMemo } from 'react';

/**
 * @param {Array} entries - All entries for the event
 * @param {string|null} excludeEntryId - Entry ID to exclude from check (for update scenarios)
 * @returns {Object} - { getDuplicates, hasDuplicate }
 */
export function useDuplicateNumberValidation(entries = [], excludeEntryId = null) {
  // Build a map of car_number → entries (excluding Withdrawn and the entry being edited)
  const numberMap = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (e.entry_status === 'Withdrawn') return;
      if (excludeEntryId && e.id === excludeEntryId) return;
      if (!e.car_number) return;
      const key = String(e.car_number).trim().toLowerCase();
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [entries, excludeEntryId]);

  /**
   * Check if a car_number is a duplicate within the event.
   * @param {string} carNumber
   * @param {string|null} classId - Optional: check within same class only
   * @returns {Array} - Array of conflicting entry records (empty = no conflict)
   */
  const getDuplicates = (carNumber, classId = null) => {
    if (!carNumber) return [];
    const key = String(carNumber).trim().toLowerCase();
    const conflicts = numberMap[key] || [];
    if (!classId) return conflicts;
    // Class-scoped: only flag as duplicate if same class
    return conflicts.filter(e =>
      (e.event_class_id && e.event_class_id === classId) ||
      (e.series_class_id && e.series_class_id === classId)
    );
  };

  /**
   * Quick boolean check.
   */
  const hasDuplicate = (carNumber, classId = null) => {
    return getDuplicates(carNumber, classId).length > 0;
  };

  /**
   * Get all duplicate groups in the entire entry list.
   * Returns array of { car_number, entries[] } for any number with 2+ entries.
   */
  const allDuplicateGroups = useMemo(() => {
    return Object.entries(numberMap)
      .filter(([, entries]) => entries.length > 1)
      .map(([car_number, entries]) => ({ car_number, entries }));
  }, [numberMap]);

  return { getDuplicates, hasDuplicate, allDuplicateGroups };
}

export default useDuplicateNumberValidation;