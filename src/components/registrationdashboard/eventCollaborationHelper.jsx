/**
 * Event Collaboration Helper
 * 
 * Handles accept, reject, and publish operations with audit logging
 */

import { base44 } from '@/api/base44Client';
import { computePublishReady } from './collaborationRules';

/**
 * Accept event collaboration from one side
 */
export async function acceptEventCollaboration(event, orgType, userId) {
  const field = orgType === 'track' ? 'track_accept_status' : 'series_accept_status';
  
  const updates = { [field]: 'accepted' };
  
  // Recompute publish ready
  const updatedEvent = { ...event, ...updates };
  const { isReady, reason } = computePublishReady(updatedEvent);
  updates.publish_ready = isReady;
  updates.publish_ready_reason = reason;
  
  await base44.entities.Event.update(event.id, updates);
  
  // Log operation
  await base44.functions.invoke('logOperation', {
    entityName: 'Event',
    recordId: event.id,
    operation: 'collaboration_accepted',
    status: 'success',
    message: `${orgType} side accepted collaboration`,
    metadata: {
      event_id: event.id,
      org_type: orgType,
      user_id: userId,
      field_changed: field,
    },
  });
}

/**
 * Reject event collaboration from one side
 */
export async function rejectEventCollaboration(event, orgType, userId) {
  const field = orgType === 'track' ? 'track_accept_status' : 'series_accept_status';
  
  const updates = { [field]: 'rejected' };
  updates.publish_ready = false;
  updates.publish_ready_reason = `${orgType} side rejected collaboration`;
  
  await base44.entities.Event.update(event.id, updates);
  
  // Log operation
  await base44.functions.invoke('logOperation', {
    entityName: 'Event',
    recordId: event.id,
    operation: 'collaboration_rejected',
    status: 'success',
    message: `${orgType} side rejected collaboration`,
    metadata: {
      event_id: event.id,
      org_type: orgType,
      user_id: userId,
      field_changed: field,
    },
  });
}

/**
 * Publish event from one side
 */
export async function publishEventFromOrg(event, orgType, userId) {
  const field = orgType === 'track' ? 'track_publish_status' : 'series_publish_status';
  
  const updates = { [field]: 'published' };
  
  // Recompute publish ready
  const updatedEvent = { ...event, ...updates };
  const { isReady, reason } = computePublishReady(updatedEvent);
  updates.publish_ready = isReady;
  updates.publish_ready_reason = reason;
  
  // If publish_ready becomes true and status is Draft, set to Published
  if (isReady && event.status === 'Draft') {
    updates.status = 'Published';
  }
  
  await base44.entities.Event.update(event.id, updates);
  
  // Log operation
  await base44.functions.invoke('logOperation', {
    entityName: 'Event',
    recordId: event.id,
    operation: 'event_published',
    status: 'success',
    message: `${orgType} side published event`,
    metadata: {
      event_id: event.id,
      org_type: orgType,
      user_id: userId,
      field_changed: field,
      publish_ready: isReady,
    },
  });
}

/**
 * Unpublish event from one side
 */
export async function unpublishEventFromOrg(event, orgType, userId) {
  const field = orgType === 'track' ? 'track_publish_status' : 'series_publish_status';
  
  const updates = { [field]: 'draft' };
  
  // Recompute publish ready
  const updatedEvent = { ...event, ...updates };
  const { isReady, reason } = computePublishReady(updatedEvent);
  updates.publish_ready = isReady;
  updates.publish_ready_reason = reason;
  
  // If publish_ready becomes false, set status to Draft
  if (!isReady && event.status === 'Published') {
    updates.status = 'Draft';
  }
  
  await base44.entities.Event.update(event.id, updates);
  
  // Log operation
  await base44.functions.invoke('logOperation', {
    entityName: 'Event',
    recordId: event.id,
    operation: 'event_unpublished',
    status: 'success',
    message: `${orgType} side unpublished event`,
    metadata: {
      event_id: event.id,
      org_type: orgType,
      user_id: userId,
      field_changed: field,
      publish_ready: isReady,
    },
  });
}

/**
 * Update planning rights for event
 */
export async function updatePlanningRights(event, newRights, userId) {
  const updates = { planning_rights: newRights };
  
  // Recompute publish ready
  const updatedEvent = { ...event, ...updates };
  const { isReady, reason } = computePublishReady(updatedEvent);
  updates.publish_ready = isReady;
  updates.publish_ready_reason = reason;
  
  await base44.entities.Event.update(event.id, updates);
  
  // Log operation
  await base44.functions.invoke('logOperation', {
    entityName: 'Event',
    recordId: event.id,
    operation: 'planning_rights_changed',
    status: 'success',
    message: `Planning rights changed to ${newRights}`,
    metadata: {
      event_id: event.id,
      user_id: userId,
      new_planning_rights: newRights,
      publish_ready: isReady,
    },
  });
}