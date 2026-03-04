/**
 * Auto-assigns EntityCollaborator ownership links when a new Event is created in Race Core.
 *
 * Creates:
 * A) creator → Event owner
 * B) Track owner(s) → Event editor
 * C) Series owner(s) → Event editor
 *
 * Never throws — any failure shows a warning toast but does not rollback the event.
 */
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

async function safeCreate(data, label) {
  try {
    // Check for existing record first to avoid duplicates
    const existing = await base44.entities.EntityCollaborator.filter({
      user_id: data.user_id,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
    });
    if (existing.length > 0) return; // already exists
    await base44.entities.EntityCollaborator.create(data);
  } catch (err) {
    console.warn(`[eventCollaboratorSetup] Failed to create ${label}:`, err);
    toast.warning(`Could not assign event access for ${label}`);
  }
}

/**
 * @param {object} newEvent   - The newly created Event record
 * @param {string} creatorId  - currentUser.id
 */
export async function setupEventCollaborators(newEvent, creatorId) {
  if (!newEvent?.id || !creatorId) return;

  const tasks = [];

  // A) Creator gets Event owner
  tasks.push(
    safeCreate(
      { user_id: creatorId, entity_type: 'Event', entity_id: newEvent.id, role: 'owner' },
      'creator'
    )
  );

  // B) Track owners get Event editor
  if (newEvent.track_id) {
    tasks.push(
      base44.entities.EntityCollaborator.filter({
        entity_type: 'Track',
        entity_id: newEvent.track_id,
        role: 'owner',
      }).then(owners =>
        Promise.all(
          owners.map(c =>
            safeCreate(
              { user_id: c.user_id, entity_type: 'Event', entity_id: newEvent.id, role: 'editor' },
              `track-owner:${c.user_id}`
            )
          )
        )
      ).catch(err => {
        console.warn('[eventCollaboratorSetup] Could not fetch track owners:', err);
        toast.warning('Could not link track owners to this event');
      })
    );
  }

  // C) Series owners get Event editor
  if (newEvent.series_id) {
    tasks.push(
      base44.entities.EntityCollaborator.filter({
        entity_type: 'Series',
        entity_id: newEvent.series_id,
        role: 'owner',
      }).then(owners =>
        Promise.all(
          owners.map(c =>
            safeCreate(
              { user_id: c.user_id, entity_type: 'Event', entity_id: newEvent.id, role: 'editor' },
              `series-owner:${c.user_id}`
            )
          )
        )
      ).catch(err => {
        console.warn('[eventCollaboratorSetup] Could not fetch series owners:', err);
        toast.warning('Could not link series owners to this event');
      })
    );
  }

  await Promise.all(tasks);
}