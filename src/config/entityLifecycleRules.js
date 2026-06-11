/**
 * R9CS — Entity Lifecycle Rules
 * Defines valid states and allowed transitions for every major RaceCore entity.
 * All lifecycle changes must be validated against this config before applying.
 */

export const LIFECYCLE_RULES = {
  Driver: {
    states: ['Draft', 'Active', 'Archived'],
    transitions: {
      Draft:    ['Active', 'Archived'],
      Active:   ['Archived'],
      Archived: ['Active'],
    },
    archiveState: 'Archived',
  },

  Team: {
    states: ['Draft', 'Active', 'Archived'],
    transitions: {
      Draft:    ['Active', 'Archived'],
      Active:   ['Archived'],
      Archived: ['Active'],
    },
    archiveState: 'Archived',
  },

  Track: {
    states: ['Draft', 'Active', 'Archived'],
    transitions: {
      Draft:    ['Active', 'Archived'],
      Active:   ['Archived'],
      Archived: ['Active'],
    },
    archiveState: 'Archived',
  },

  Series: {
    states: ['Draft', 'Published', 'Active', 'Archived'],
    transitions: {
      Draft:     ['Published', 'Archived'],
      Published: ['Active', 'Archived'],
      Active:    ['Archived'],
      Archived:  ['Draft'],
    },
    archiveState: 'Archived',
  },

  Event: {
    states: ['Draft', 'Published', 'Live', 'Completed', 'Archived'],
    transitions: {
      Draft:     ['Published', 'Archived'],
      Published: ['Live', 'Archived'],
      Live:      ['Completed'],
      Completed: ['Archived'],
      Archived:  ['Draft'],
    },
    archiveState: 'Archived',
  },

  Session: {
    states: ['Draft', 'Scheduled', 'Live', 'Completed', 'Official', 'Locked', 'Archived'],
    transitions: {
      Draft:     ['Scheduled', 'Archived'],
      Scheduled: ['Live', 'Archived'],
      Live:      ['Completed'],
      Completed: ['Official'],
      Official:  ['Locked', 'Completed'],
      Locked:    ['Archived'],
      Archived:  ['Draft'],
    },
    archiveState: 'Archived',
  },

  Results: {
    states: ['Draft', 'Provisional', 'Official', 'Locked', 'Archived'],
    transitions: {
      Draft:       ['Provisional'],
      Provisional: ['Official', 'Draft'],
      Official:    ['Locked', 'Provisional'],
      Locked:      ['Archived'],
      Archived:    ['Draft'],
    },
    archiveState: 'Archived',
    note: 'Results CANNOT skip steps. Draft → Provisional → Official → Locked.',
  },

  Incident: {
    states: ['Open', 'Under Review', 'Resolved', 'Archived'],
    transitions: {
      Open:         ['Under Review', 'Resolved'],
      'Under Review': ['Resolved', 'Open'],
      Resolved:     ['Archived', 'Under Review'],
      Archived:     ['Open'],
    },
    archiveState: 'Archived',
  },

  Penalty: {
    states: ['Proposed', 'Approved', 'Applied', 'Archived'],
    transitions: {
      Proposed: ['Approved', 'Archived'],
      Approved: ['Applied'],
      Applied:  ['Archived'],
      Archived: ['Proposed'],
    },
    archiveState: 'Archived',
  },

  Protest: {
    states: ['Filed', 'Under Review', 'Resolved', 'Archived'],
    transitions: {
      Filed:          ['Under Review', 'Archived'],
      'Under Review': ['Resolved'],
      Resolved:       ['Archived'],
      Archived:       ['Filed'],
    },
    archiveState: 'Archived',
  },

  TechInspectionRecord: {
    states: ['Pending', 'Passed', 'Failed', 'Recheck Required', 'Archived'],
    transitions: {
      Pending:           ['Passed', 'Failed'],
      Failed:            ['Recheck Required', 'Passed'],
      'Recheck Required': ['Passed', 'Failed'],
      Passed:            ['Archived'],
      Archived:          ['Pending'],
    },
    archiveState: 'Archived',
  },
};

/**
 * Validate whether a lifecycle transition is allowed.
 * @param {string} entityType
 * @param {string} fromState
 * @param {string} toState
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function validateTransition(entityType, fromState, toState) {
  const rule = LIFECYCLE_RULES[entityType];
  if (!rule) return { allowed: true }; // unknown entity — don't block
  const allowed = rule.transitions[fromState]?.includes(toState) ?? false;
  if (!allowed) {
    return {
      allowed: false,
      reason: `${entityType}: transition from "${fromState}" → "${toState}" is not permitted. Allowed from "${fromState}": ${(rule.transitions[fromState] || []).join(', ') || 'none'}.`,
    };
  }
  return { allowed: true };
}

/**
 * Get all valid next states from a given state.
 */
export function getNextStates(entityType, currentState) {
  return LIFECYCLE_RULES[entityType]?.transitions[currentState] || [];
}

export default LIFECYCLE_RULES;