import { createPageUrl } from '@/components/utils';

/**
 * Returns structured menu items for the logged-in user dropdown.
 * Used by UserMenu to render role-appropriate navigation.
 * Centralizes all logged-in navigation logic.
 *
 * Item types: 'link' | 'action' | 'divider'
 */
export function getUserMenuItems({
  user,
  userMode,
  raceCoreUrl = null,
  raceCoreEntityName = null,
  hasRaceCoreAccess = false,
  hasMediaAccess = false,
}) {
  if (!user) return [];
  const items = [];

  // Core — always present for any logged-in user
  items.push({ type: 'link', label: 'Dashboard', to: createPageUrl('MyDashboard'), icon: 'LayoutDashboard' });
  items.push({ type: 'link', label: 'Profile', to: createPageUrl('Profile'), icon: 'User' });

  // Race Core — only for users with valid Track or Series access
  if (hasRaceCoreAccess && raceCoreUrl) {
    items.push({ type: 'divider' });
    items.push({
      type: 'link',
      label: 'Open Race Core',
      sublabel: raceCoreEntityName || undefined,
      to: raceCoreUrl,
      icon: 'Gauge',
      highlight: true,
    });
  }

  // Media Portal — only for active/pending media users (not rejected)
  if (hasMediaAccess) {
    if (items[items.length - 1]?.type !== 'divider') items.push({ type: 'divider' });
    items.push({ type: 'link', label: 'Media Portal', to: createPageUrl('MediaPortal'), icon: 'Camera' });
  }

  // Admin tools — admin role only, never shown to others
  if (userMode === 'admin') {
    items.push({ type: 'divider' });
    items.push({ type: 'link', label: 'Management', to: createPageUrl('Management'), icon: 'Settings', adminOnly: true });
    items.push({ type: 'link', label: 'Diagnostics', to: createPageUrl('Diagnostics'), icon: 'Activity', adminOnly: true });
  }

  // Logout — always last
  items.push({ type: 'divider' });
  items.push({ type: 'action', label: 'Sign Out', action: 'logout', icon: 'LogOut', danger: true });

  return items;
}