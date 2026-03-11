import { createPageUrl } from '@/components/utils';

/**
 * Returns an array of quick action configs based on user mode.
 * Each action: { label, to, isPrimary, isAdmin? }
 *
 * Consumers are responsible for rendering — this is pure config, no React.
 */
export function getUserQuickActions({
  mode,
  raceCoreTarget = null,
  primaryEntity = null,
  buildRaceCoreLaunchUrl = () => '#',
  buildEditorUrl = () => '#',
}) {
  switch (mode) {
    case 'admin':
      return [
        ...(raceCoreTarget ? [{ label: 'Open Race Core', to: buildRaceCoreLaunchUrl(raceCoreTarget), isPrimary: true }] : []),
        { label: 'Management', to: createPageUrl('Management'), isPrimary: false, isAdmin: true },
        { label: 'Diagnostics', to: createPageUrl('Diagnostics'), isPrimary: false },
        { label: 'Browse Drivers', to: createPageUrl('DriverDirectory'), isPrimary: false },
        { label: 'Browse Events', to: createPageUrl('EventDirectory'), isPrimary: false },
      ];

    case 'entity_owner':
      return [
        ...(raceCoreTarget ? [{ label: 'Open Race Core', to: buildRaceCoreLaunchUrl(raceCoreTarget), isPrimary: true }] : []),
        ...(primaryEntity ? [{ label: 'Open Editor', to: buildEditorUrl(primaryEntity), isPrimary: false }] : []),
        { label: 'Manage Access', to: createPageUrl('Profile') + '?tab=access_codes', isPrimary: false },
        { label: 'Browse Events', to: createPageUrl('EventDirectory'), isPrimary: false },
      ];

    case 'entity_editor':
      return [
        ...(raceCoreTarget ? [{ label: 'Open Race Core', to: buildRaceCoreLaunchUrl(raceCoreTarget), isPrimary: true }] : []),
        ...(primaryEntity ? [{ label: 'Open Editor', to: buildEditorUrl(primaryEntity), isPrimary: false }] : []),
        { label: 'Browse Drivers', to: createPageUrl('DriverDirectory'), isPrimary: false },
        { label: 'Browse Events', to: createPageUrl('EventDirectory'), isPrimary: false },
      ];

    case 'media_user':
      return [
        { label: 'Media Portal', to: createPageUrl('MediaPortal'), isPrimary: true },
        { label: 'Browse Drivers', to: createPageUrl('DriverDirectory'), isPrimary: false },
        { label: 'Browse Events', to: createPageUrl('EventDirectory'), isPrimary: false },
        { label: 'Stories', to: createPageUrl('OutletHome'), isPrimary: false },
      ];

    case 'fan':
    default:
      return [
        { label: 'Browse Drivers', to: createPageUrl('DriverDirectory'), isPrimary: false },
        { label: 'Browse Events', to: createPageUrl('EventDirectory'), isPrimary: false },
        { label: 'Stories', to: createPageUrl('OutletHome'), isPrimary: false },
        { label: 'Link an Entity', to: createPageUrl('Profile') + '?tab=access_codes', isPrimary: true },
      ];
  }
}