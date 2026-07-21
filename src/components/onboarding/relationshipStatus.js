/**
 * Shared EntityCollaborator status label/color resolver.
 * Used by the Connections and Review stages so denied/revoked records are
 * never rendered as "Pending approval".
 */
export const RELATIONSHIP_STATUS_META = {
  pending: {
    label: 'Pending approval',
    color: 'rgba(255,255,255,0.55)',
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.15)',
    icon: 'clock',
  },
  approved: {
    label: 'Approved',
    color: '#1DA1A1',
    bg: 'rgba(29,161,161,0.10)',
    border: 'rgba(29,161,161,0.3)',
    icon: 'check',
  },
  denied: {
    label: 'Denied',
    color: '#f87171',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    icon: 'x',
  },
  revoked: {
    label: 'Revoked',
    color: '#f87171',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.2)',
    icon: 'ban',
  },
};

export const ACTIVE_RELATIONSHIP_STATUSES = ['pending', 'approved'];

/** Returns true when a relationship record represents real access (pending OR approved). */
export function isActiveRelationship(status) {
  return ACTIVE_RELATIONSHIP_STATUSES.includes(status);
}

export function getRelationshipStatusMeta(status) {
  return (
    RELATIONSHIP_STATUS_META[status] || {
      label: status ? status : 'Unknown',
      color: 'rgba(255,255,255,0.4)',
      bg: 'rgba(255,255,255,0.04)',
      border: 'rgba(255,255,255,0.1)',
    }
  );
}

export function getRelationshipStatusLabel(status) {
  return getRelationshipStatusMeta(status).label;
}