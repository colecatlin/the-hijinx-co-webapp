/**
 * Entries Data Service
 * CRUD helpers for Entry entity operations
 */
import { base44 } from '@/api/base44Client';

export async function listEntriesForEvent({ eventId }) {
  if (!eventId) return [];
  try {
    const entries = await base44.entities.Entry.filter({
      event_id: eventId,
    });
    // Sort by created_date descending if available
    return entries.sort((a, b) => {
      const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
      const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
      return dateB - dateA;
    });
  } catch (err) {
    console.error('Failed to load entries:', err);
    return [];
  }
}

export async function createEntry(payload) {
  try {
    const result = await base44.entities.Entry.create(payload);
    return result;
  } catch (err) {
    console.error('Failed to create entry:', err);
    throw err;
  }
}

export async function updateEntry(id, patch) {
  try {
    const result = await base44.entities.Entry.update(id, patch);
    return result;
  } catch (err) {
    console.error('Failed to update entry:', err);
    throw err;
  }
}

export async function deleteEntry(id) {
  try {
    const result = await base44.entities.Entry.delete(id);
    return result;
  } catch (err) {
    console.error('Failed to delete entry:', err);
    throw err;
  }
}