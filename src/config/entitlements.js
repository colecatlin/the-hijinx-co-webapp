/**
 * Controlled Entitlement Vocabulary
 * ═════════════════════════════════════════════════════════════
 * Every gateable feature in the platform has a key here.
 * SubscriptionTier.features arrays reference these keys.
 * Backend functions call requireEntitlement(user, key) to enforce.
 *
 * Keys are grouped for the admin UI. Labels/descriptions are shown
 * in the Entitlement Map tab of ManageMemberships.
 *
 * DO NOT rename existing keys — they are stored in tier.features arrays.
 * Add new keys additively only.
 */

export const ENTITLEMENT_GROUPS = [
  {
    group: 'RaceCore',
    description: 'Operational race weekend tools',
    entitlements: [
      { key: 'racecore:access',         label: 'RaceCore Access',          description: 'Basic access to the RaceCore operational shell' },
      { key: 'racecore:registration',   label: 'Registration & Entries',  description: 'Manage entries, check-in, and registration' },
      { key: 'racecore:manage_events',  label: 'Manage Events',           description: 'Create and edit events, sessions, and classes' },
      { key: 'racecore:publish_results',label: 'Publish Results',         description: 'Publish session results and standings' },
      { key: 'racecore:tech',           label: 'Tech Inspection',         description: 'Manage tech inspection queue and records' },
      { key: 'racecore:race_control',   label: 'Race Control',           description: 'Penalties, protests, grid approval, incidents' },
      { key: 'racecore:standings',      label: 'Standings',               description: 'Manage and recalculate standings' },
      { key: 'racecore:imports',        label: 'CSV Imports',             description: 'Bulk import drivers, results, standings' },
      { key: 'racecore:governance',     label: 'Governance',              description: 'Governance, archive, and data health tools' },
    ],
  },
  {
    group: 'Media',
    description: 'Media portal and creator tools',
    entitlements: [
      { key: 'media:portal',       label: 'Media Portal',    description: 'Access to the media contributor portal' },
      { key: 'media:credentials',  label: 'Credentials',     description: 'Apply for and manage media credentials' },
    ],
  },
  {
    group: 'Editorial',
    description: 'Editorial workflow and story tools',
    entitlements: [
      { key: 'editorial:workspace', label: 'Writer Workspace', description: 'Assignments, drafts, and research packets' },
      { key: 'editorial:radar',      label: 'Story Radar',      description: 'Editorial signal and recommendation dashboard' },
    ],
  },
  {
    group: 'Commercial',
    description: 'Sponsorship and commercial tools',
    entitlements: [
      { key: 'sponsorship:manage',    label: 'Manage Sponsorships', description: 'Create and manage sponsorship records and activations' },
      { key: 'sponsorship:analytics', label: 'Sponsor Analytics',   description: 'Sponsor ROI and exposure analytics' },
    ],
  },
];

/** Flat list of all entitlement keys (for validation). */
export const ALL_ENTITLEMENT_KEYS = ENTITLEMENT_GROUPS.flatMap(g => g.entitlements.map(e => e.key));

/** Lookup map: key → { label, description, group }. */
export const ENTITLEMENT_MAP = Object.fromEntries(
  ENTITLEMENT_GROUPS.flatMap(g => g.entitlements.map(e => [e.key, { ...e, group: g.group }]))
);

/**
 * Default tier definitions — used to seed the SubscriptionTier entity
 * on first run. Admins can edit these live afterward.
 * Prices are TBD (set to 0 for now; admin sets real prices + stripe_price_id).
 */
export const TIER_DEFAULTS = [
  {
    tier_key: 'free',
    display_name: 'Free',
    description: 'Public site access — browse the directory, stories, and profiles.',
    price_cents: 0,
    currency: 'usd',
    interval: 'month',
    features: [],
    is_active: true,
    display_order: 0,
    stripe_price_id: null,
    highlight: false,
  },
  {
    tier_key: 'core',
    display_name: 'Core',
    description: 'RaceCore operational access for racers and teams.',
    price_cents: 0,
    currency: 'usd',
    interval: 'month',
    features: ['racecore:access', 'racecore:registration', 'media:portal'],
    is_active: true,
    display_order: 1,
    stripe_price_id: null,
    highlight: true,
  },
  {
    tier_key: 'pro',
    display_name: 'Pro',
    description: 'Full event management, results, tech, and editorial tools.',
    price_cents: 0,
    currency: 'usd',
    interval: 'month',
    features: [
      'racecore:access', 'racecore:registration', 'racecore:manage_events',
      'racecore:publish_results', 'racecore:tech',
      'media:portal', 'editorial:workspace', 'editorial:radar',
    ],
    is_active: true,
    display_order: 2,
    stripe_price_id: null,
    highlight: false,
  },
  {
    tier_key: 'elite',
    display_name: 'Elite',
    description: 'Everything — race control, standings, governance, and sponsor analytics.',
    price_cents: 0,
    currency: 'usd',
    interval: 'month',
    features: [
      'racecore:access', 'racecore:registration', 'racecore:manage_events',
      'racecore:publish_results', 'racecore:tech', 'racecore:race_control',
      'racecore:standings', 'racecore:imports', 'racecore:governance',
      'media:portal', 'media:credentials',
      'editorial:workspace', 'editorial:radar',
      'sponsorship:manage', 'sponsorship:analytics',
    ],
    is_active: true,
    display_order: 3,
    stripe_price_id: null,
    highlight: false,
  },
];