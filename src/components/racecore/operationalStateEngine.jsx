/**
 * Operational State Engine for Race Core
 * 
 * Centralizes state transition rules and cascade effects for Event, Session, Results, and Standings.
 * Does not modify entity schemas or database directly.
 * Returns instructions for cascading effects to be applied by the caller.
 */

/**
 * Valid operational states for each entity type
 */
export const OPERATIONAL_STATES = {
  Event: ['Draft', 'Published', 'Live', 'Completed', 'Archived'],
  Session: ['Draft', 'Scheduled', 'InProgress', 'Provisional', 'Official', 'Locked'],
  Results: ['Draft', 'Provisional', 'Official'],
  Standings: ['Draft', 'Provisional', 'Official', 'Locked'],
};

/**
 * Valid state transitions for each entity type
 * Keys are current states, values are arrays of allowed next states
 */
export const VALID_TRANSITIONS = {
  Event: {
    Draft: ['Published'],
    Published: ['Live', 'Draft'],
    Live: ['Completed'],
    Completed: ['Archived'],
    Archived: [],
  },
  Session: {
    Draft: ['Scheduled'],
    Scheduled: ['InProgress'],
    InProgress: ['Provisional'],
    Provisional: ['Official'],
    Official: ['Locked'],
    Locked: [],
  },
  Results: {
    Draft: ['Provisional'],
    Provisional: ['Official'],
    Official: [],
  },
  Standings: {
    Draft: ['Provisional'],
    Provisional: ['Official'],
    Official: ['Locked'],
    Locked: [],
  },
};

/**
 * Check if a state transition is allowed
 * @param {string} entityType - Entity type (Event, Session, Results, Standings)
 * @param {string} currentState - Current state
 * @param {string} nextState - Desired next state
 * @returns {boolean} True if transition is valid
 */
export function canTransition(entityType, currentState, nextState) {
  if (!VALID_TRANSITIONS[entityType]) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  const validNextStates = VALID_TRANSITIONS[entityType][currentState] || [];
  return validNextStates.includes(nextState);
}

/**
 * Apply a state transition with validation
 * @param {string} entityType - Entity type
 * @param {object} record - Entity record to update
 * @param {string} nextState - Desired next state
 * @returns {object} Updated record object with new state
 * @throws {Error} If transition is invalid
 */
export function applyTransition(entityType, record, nextState) {
  const currentState = getEntityState(entityType, record);

  if (!canTransition(entityType, currentState, nextState)) {
    throw new Error(
      `Invalid transition for ${entityType}: ${currentState} → ${nextState}`
    );
  }

  return setEntityState(entityType, { ...record }, nextState);
}

/**
 * Get current state from entity record based on entity type
 * Maps entity status fields to operational states
 * @param {string} entityType
 * @param {object} record
 * @returns {string} Current state
 */
function getEntityState(entityType, record) {
  switch (entityType) {
    case 'Event':
      return record.status || 'Draft';
    case 'Session':
      return record.status || 'Draft';
    case 'Results':
      return record.status || 'Draft';
    case 'Standings':
      return record.status || 'Draft';
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Set state on entity record based on entity type
 * @param {string} entityType
 * @param {object} record
 * @param {string} state
 * @returns {object} Updated record
 */
function setEntityState(entityType, record, state) {
  record.status = state;
  return record;
}

/**
 * Generate cascade instructions for state transitions
 * Does NOT modify the database; returns instructions for the caller to apply
 * @param {string} entityType - Entity type
 * @param {object} record - The entity record being transitioned
 * @param {string} nextState - The target state
 * @returns {object} Instructions object with cascading updates needed
 */
export function cascadeEffects(entityType, record, nextState) {
  const instructions = {
    entityType,
    primaryUpdate: { id: record.id, updates: { status: nextState } },
    cascadingUpdates: [],
    warnings: [],
  };

  if (entityType === 'Session') {
    if (nextState === 'Official') {
      // When Session becomes Official, Results in this session become publicly visible
      // (publishModel handles public visibility; this just notes it)
      instructions.cascadingUpdates.push({
        type: 'Results',
        action: 'markPublicVisible',
        filter: { session_id: record.id },
        reason: 'Session is now Official',
      });
    }

    if (nextState === 'Locked') {
      // When Session is Locked, prevent further edits to Results
      instructions.cascadingUpdates.push({
        type: 'Results',
        action: 'preventEdits',
        filter: { session_id: record.id },
        reason: 'Session is now Locked',
      });
    }
  }

  if (entityType === 'Event') {
    if (nextState === 'Live') {
      // Event goes Live: Sessions stay in their current state
      // (Do NOT auto-promote sessions)
      instructions.notes = 'Sessions remain in their current state when Event goes Live';
    }

    if (nextState === 'Completed') {
      // Event is Completed: Lock any Sessions that are not already Locked
      instructions.cascadingUpdates.push({
        type: 'Session',
        action: 'lockIfNotLocked',
        filter: { event_id: record.id },
        reason: 'Event is now Completed; sessions must be locked',
      });

      // Also complete any Standings that are not already Locked
      instructions.cascadingUpdates.push({
        type: 'Standings',
        action: 'finalizeIfNotLocked',
        filter: { event_id: record.id },
        reason: 'Event is now Completed',
      });
    }
  }

  if (entityType === 'Standings') {
    if (nextState === 'Locked') {
      // When Standings are Locked, they are final
      instructions.notes = 'Standings are now final and locked for editing';
    }
  }

  return instructions;
}

/**
 * Validate a sequence of transitions (for complex workflows)
 * @param {string} entityType
 * @param {string} startState
 * @param {array} transitionSequence - Array of states to transition through
 * @returns {boolean} True if all transitions are valid
 */
export function canTransitionSequence(entityType, startState, transitionSequence) {
  let current = startState;
  for (const next of transitionSequence) {
    if (!canTransition(entityType, current, next)) {
      return false;
    }
    current = next;
  }
  return true;
}

/**
 * Get allowed next states for a given entity
 * @param {string} entityType
 * @param {string} currentState
 * @returns {array} Array of valid next states
 */
export function getValidNextStates(entityType, currentState) {
  return VALID_TRANSITIONS[entityType]?.[currentState] || [];
}