/**
 * Shared EntityCollaborator status label/color resolver.
 * Used by the Connections and Review stages so denied/revoked records are
 * never rendered as "Pending approval".
 *
 * All colors use semantic design tokens so the wizard adapts to both light
 * and dark themes. The approved (TEAL) accent uses the motion token.
 */
export const RELATIONSHIP_STATUS_META = {
  pending: {
    label: 'Pending approval',
    color: 'hsl(var(--foreground-quiet))',
    bg: 'hsl(var(--surface-interactive) / 0.5)',
    border: 'hsl(var(--divider))',
    icon: 'clock',
  },
  approved: {
    label: 'Approved',
    color: 'hsl(var(--motion))',
    bg: 'hsl(var(--motion) / 0.10)',
    border: 'hsl(var(--motion) / 0.3)',
    icon: 'check',
  },
  denied: {
    label: 'Denied',
    color: 'hsl(var(--danger))',
    bg: 'hsl(var(--danger) / 0.08)',
    border: 'hsl(var(--danger) / 0.25)',
    icon: 'x',
  },
  revoked: {
    label: 'Revoked',
    color: 'hsl(var(--danger))',
    bg: 'hsl(var(--danger) / 0.06)',
    border: 'hsl(var(--danger) / 0.2)',
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
      color: 'hsl(var(--foreground-quiet))',
      bg: 'hsl(var(--surface-interactive) / 0.4)',
      border: 'hsl(var(--divider))',
    }
  );
}

export function getRelationshipStatusLabel(status) {
  return getRelationshipStatusMeta(status).label;
}