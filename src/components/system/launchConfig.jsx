/**
 * HIJINX Platform — Launch Mode Configuration
 * Change CURRENT_LAUNCH_MODE to update the platform's operational posture.
 * This is informational only — no functional behavior changes.
 */

export const LAUNCH_MODES = {
  development: {
    label: 'Development',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    dotColor: 'bg-gray-400',
    description: 'Internal development and testing only.',
  },
  soft_launch: {
    label: 'Soft Launch',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-400',
    description: 'Limited release to early users and invited participants.',
  },
  public: {
    label: 'Public',
    color: 'bg-green-100 text-green-700 border-green-200',
    dotColor: 'bg-green-500',
    description: 'Full public availability.',
  },
};

// ← Change this to reflect current launch stage
export const CURRENT_LAUNCH_MODE = 'soft_launch';

export function getLaunchModeConfig() {
  return LAUNCH_MODES[CURRENT_LAUNCH_MODE] || LAUNCH_MODES.development;
}