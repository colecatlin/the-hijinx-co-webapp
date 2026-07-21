/**
 * HIJINX Role Registry — the single source of truth for all user roles.
 *
 * This config drives: role selection UI, dynamic onboarding flow, required
 * onboarding fields, navigation visibility, dashboard layout, module
 * availability, relationship requirements, permission templates, and future
 * role expansion. Adding a new role should require only an entry here.
 *
 * ─── Architecture ───
 * Identity         → User (profile fields, username, selected roles)
 * Primary Role     → User.primary_profile_type
 * Additional Roles → User.profile_types
 * Relationships    → EntityCollaborator (single source of truth for org access)
 * Permissions      → EntityCollaborator.permission_level + granted_permissions
 * Modules          → unlocked by roles here, gated by approved relationships
 *
 * Roles unlock capabilities only — they NEVER grant management permissions.
 * Management access comes solely from an approved EntityCollaborator record
 * scoped to a specific entity.
 *
 * ─── System Rules ───
 * • Every account automatically holds the Fan role (is_default: true).
 * • Fan is a system role and never appears in onboarding (visibility: 'hidden').
 * • Every user must select exactly one Primary Role during onboarding.
 * • Users may add additional roles after onboarding at any time.
 * • Adding a role post-onboarding launches only that role's onboarding
 *   requirements — never the full wizard again.
 */

import {
  User,
  Users,
  MapPin,
  Trophy,
  Gauge,
  Camera,
  Video,
  Flag,
  Briefcase,
  Building2,
  Store,
  Package,
  Heart,
  HandHeart,
  Wrench,
  Megaphone,
  Newspaper,
} from 'lucide-react';

// ─── Permission Level Templates ────────────────────────────────────────────
// Baseline defaults applied when an admin approves a relationship for a given
// role. Admins may escalate or restrict per-relationship afterward.
const PERMISSION_TEMPLATES = {
  owner: {
    permission_level: 'admin',
    granted_permissions: ['*'],
  },
  staff: {
    permission_level: 'staff',
    granted_permissions: [],
  },
  contributor: {
    permission_level: 'staff',
    granted_permissions: ['contribute_content'],
  },
  viewer: {
    permission_level: 'viewer',
    granted_permissions: [],
  },
};

// ─── Role Categories ───────────────────────────────────────────────────────
export const ROLE_CATEGORIES = {
  competition: { label: 'Competition', order: 1 },
  organization: { label: 'Organization', order: 2 },
  media: { label: 'Media', order: 3 },
  business: { label: 'Business', order: 4 },
  community: { label: 'Community', order: 5 },
};

// ─── The Registry ─────────────────────────────────────────────────────────
export const ROLES = {
  fan: {
    id: 'fan',
    capability: 'fan',
    display_name: 'Fan',
    description: 'Follow drivers, teams, series, and events.',
    icon: Heart,
    category: 'community',
    is_default: true,
    can_be_primary: false,
    requires_relationship: false,
    relationship_entity_type: null,
    relationship_required_on_onboarding: false,
    requires_approval: false,
    onboarding_fields: [],
    modules_enabled: [
      'follow',
      'favorites',
      'community_feed',
      'newsletter',
      'store',
    ],
    default_permission_template: PERMISSION_TEMPLATES.viewer,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace'],
    dashboard_widgets: ['following', 'upcoming_events', 'recent_stories'],
    onboarding_order: 999,
    visibility: 'hidden', // system role — never shown during onboarding
  },

  driver: {
    id: 'driver',
    capability: 'driver',
    display_name: 'Driver',
    description: 'Compete. Build your driver profile, stats, and race history.',
    icon: Gauge,
    category: 'competition',
    is_default: false,
    can_be_primary: true,
    requires_relationship: false,
    relationship_entity_type: null,
    relationship_required_on_onboarding: false,
    requires_approval: false,
    onboarding_fields: [
      'primary_discipline',
      'primary_number',
      'manufacturer',
      'hometown',
      'license_number',
    ],
    modules_enabled: [
      'driver_dashboard',
      'driver_stats',
      'driver_licensing',
      'competition_history',
      'driver_media',
      'driver_sponsors',
      'driver_programs',
    ],
    default_permission_template: PERMISSION_TEMPLATES.owner,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace', 'driver_profile'],
    dashboard_widgets: ['my_races', 'career_stats', 'my_teams', 'my_entries'],
    onboarding_order: 1,
    visibility: 'onboarding',
  },

  team_owner: {
    id: 'team_owner',
    capability: 'team',
    display_name: 'Team Owner',
    description: 'Create a new team or join an existing one as an owner.',
    icon: Trophy,
    category: 'competition',
    is_default: false,
    can_be_primary: true,
    requires_relationship: true,
    // Either create a new Team (auto-owner, no approval) or join an existing
    // Team (pending EntityCollaborator requiring approval).
    relationship_entity_type: 'Team',
    relationship_required_on_onboarding: true,
    requires_approval: 'conditional', // false if creating, true if joining
    onboarding_fields: [
      'team_name',
      'team_discipline',
      'team_hq_location',
    ],
    modules_enabled: [
      'team_management',
      'team_roster',
      'team_vehicles',
      'team_programs',
      'team_media',
      'team_partners',
      'team_performance',
    ],
    default_permission_template: PERMISSION_TEMPLATES.owner,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace', 'team_profile'],
    dashboard_widgets: ['my_team', 'team_roster', 'team_schedule', 'team_results'],
    onboarding_order: 2,
    visibility: 'onboarding',
  },

  team_member: {
    id: 'team_member',
    capability: 'team',
    display_name: 'Team Member',
    description: 'Join a team as a driver or crew member.',
    icon: Users,
    category: 'competition',
    is_default: false,
    can_be_primary: true,
    requires_relationship: true,
    relationship_entity_type: 'Team',
    relationship_required_on_onboarding: true,
    requires_approval: true,
    onboarding_fields: [],
    modules_enabled: [
      'team_view',
      'team_roster_view',
    ],
    default_permission_template: PERMISSION_TEMPLATES.staff,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace'],
    dashboard_widgets: ['my_team', 'team_schedule'],
    onboarding_order: 3,
    visibility: 'onboarding',
  },

  crew_member: {
    id: 'crew_member',
    capability: 'crew',
    display_name: 'Crew Member',
    description: 'Support a team as a mechanic or crew professional.',
    icon: Wrench,
    category: 'competition',
    is_default: false,
    can_be_primary: true,
    requires_relationship: true,
    relationship_entity_type: 'Team',
    relationship_required_on_onboarding: true,
    requires_approval: true,
    onboarding_fields: ['crew_role'],
    modules_enabled: [
      'team_view',
      'team_roster_view',
    ],
    default_permission_template: PERMISSION_TEMPLATES.staff,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace'],
    dashboard_widgets: ['my_team'],
    onboarding_order: 4,
    visibility: 'onboarding',
  },

  track_staff: {
    id: 'track_staff',
    capability: 'track',
    display_name: 'Track Staff',
    description: 'Operate a track — manage events, entries, and tech at your venue.',
    icon: MapPin,
    category: 'organization',
    is_default: false,
    can_be_primary: true,
    requires_relationship: true,
    relationship_entity_type: 'Track',
    relationship_required_on_onboarding: true,
    requires_approval: true,
    onboarding_fields: [],
    modules_enabled: [
      'race_core',
      'event_management',
      'entries_management',
      'tech_inspection',
      'track_schedule',
      'track_profile',
    ],
    default_permission_template: PERMISSION_TEMPLATES.staff,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace', 'race_core'],
    dashboard_widgets: ['my_track', 'upcoming_events', 'entry_roster'],
    onboarding_order: 5,
    visibility: 'onboarding',
  },

  series_staff: {
    id: 'series_staff',
    capability: 'series',
    display_name: 'Series Staff',
    description: 'Run a series — oversee classes, points, and standings.',
    icon: Trophy,
    category: 'organization',
    is_default: false,
    can_be_primary: true,
    requires_relationship: true,
    relationship_entity_type: 'Series',
    relationship_required_on_onboarding: true,
    requires_approval: true,
    onboarding_fields: [],
    modules_enabled: [
      'race_core',
      'series_management',
      'series_classes',
      'points_config',
      'standings_management',
      'series_schedule',
      'series_profile',
    ],
    default_permission_template: PERMISSION_TEMPLATES.staff,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace', 'race_core'],
    dashboard_widgets: ['my_series', 'series_standings', 'series_schedule'],
    onboarding_order: 6,
    visibility: 'onboarding',
  },

  official: {
    id: 'official',
    capability: 'series',
    display_name: 'Official',
    description: 'Officiate series events — steward rulings, penalties, and compliance.',
    icon: Flag,
    category: 'organization',
    is_default: false,
    can_be_primary: true,
    requires_relationship: true,
    relationship_entity_type: 'Series',
    relationship_required_on_onboarding: true,
    requires_approval: true,
    onboarding_fields: ['official_role'],
    modules_enabled: [
      'race_core',
      'officials_assignment',
      'steward_rulings',
      'penalty_management',
      'protest_management',
      'incident_management',
    ],
    default_permission_template: PERMISSION_TEMPLATES.staff,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace', 'race_core'],
    dashboard_widgets: ['my_series', 'assigned_events', 'pending_protests'],
    onboarding_order: 7,
    visibility: 'onboarding',
  },

  media: {
    id: 'media',
    capability: 'media',
    display_name: 'Media',
    description: 'Cover the sport — request credentials, publish stories, and sell content.',
    icon: Megaphone,
    category: 'media',
    is_default: false,
    can_be_primary: true,
    requires_relationship: false, // Relationship optional — request credentials post-onboarding
    relationship_entity_type: null, // May be Series, Track, or Event at request time
    relationship_required_on_onboarding: false,
    requires_approval: 'on_request', // Approval required only when requesting org access
    onboarding_fields: [
      'media_outlet_name',
      'media_specialties',
      'portfolio_link',
    ],
    modules_enabled: [
      'media_portal',
      'media_requests',
      'media_assignments',
      'media_credentials',
      'media_deliverables',
      'media_revenue',
      'subscriber_dashboard',
    ],
    default_permission_template: PERMISSION_TEMPLATES.contributor,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace', 'media_portal'],
    dashboard_widgets: ['my_assignments', 'my_credentials', 'my_revenue'],
    onboarding_order: 8,
    visibility: 'onboarding',
  },

  photographer: {
    id: 'photographer',
    capability: 'photographer',
    display_name: 'Photographer',
    description: 'Shoot and sell motorsports photography.',
    icon: Camera,
    category: 'media',
    is_default: false,
    can_be_primary: true,
    requires_relationship: false,
    relationship_entity_type: null,
    relationship_required_on_onboarding: false,
    requires_approval: 'on_request',
    onboarding_fields: [
      'portfolio_link',
      'media_specialties',
    ],
    modules_enabled: [
      'media_portal',
      'media_requests',
      'media_assignments',
      'media_credentials',
      'media_deliverables',
      'media_revenue',
    ],
    default_permission_template: PERMISSION_TEMPLATES.contributor,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace', 'media_portal'],
    dashboard_widgets: ['my_assignments', 'my_credentials', 'my_revenue'],
    onboarding_order: 9,
    visibility: 'onboarding',
  },

  videographer: {
    id: 'videographer',
    capability: 'creator',
    display_name: 'Videographer',
    description: 'Produce motorsports video content.',
    icon: Video,
    category: 'media',
    is_default: false,
    can_be_primary: true,
    requires_relationship: false,
    relationship_entity_type: null,
    relationship_required_on_onboarding: false,
    requires_approval: 'on_request',
    onboarding_fields: [
      'portfolio_link',
      'media_specialties',
    ],
    modules_enabled: [
      'media_portal',
      'media_requests',
      'media_assignments',
      'media_credentials',
      'media_deliverables',
      'media_revenue',
    ],
    default_permission_template: PERMISSION_TEMPLATES.contributor,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace', 'media_portal'],
    dashboard_widgets: ['my_assignments', 'my_credentials', 'my_revenue'],
    onboarding_order: 10,
    visibility: 'onboarding',
  },

  sponsor: {
    id: 'sponsor',
    capability: 'sponsor',
    display_name: 'Sponsor',
    description: 'Connect with teams, series, tracks, or events to sponsor.',
    icon: Briefcase,
    category: 'business',
    is_default: false,
    can_be_primary: true,
    requires_relationship: false, // Optional — connect to orgs post-onboarding
    relationship_entity_type: null, // Team, Series, Track, or Event
    relationship_required_on_onboarding: false,
    requires_approval: 'on_request', // Determined by the receiving organization
    onboarding_fields: [
      'brand_name',
      'sponsor_industry',
    ],
    modules_enabled: [
      'sponsor_dashboard',
      'sponsorship_opportunities',
    ],
    default_permission_template: PERMISSION_TEMPLATES.viewer,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace'],
    dashboard_widgets: ['my_sponsorships'],
    onboarding_order: 11,
    visibility: 'onboarding',
  },

  vendor: {
    id: 'vendor',
    capability: 'brand',
    display_name: 'Vendor',
    description: 'Offer services to the motorsports community.',
    icon: Store,
    category: 'business',
    is_default: false,
    can_be_primary: true,
    requires_relationship: false,
    relationship_entity_type: null,
    relationship_required_on_onboarding: false,
    requires_approval: 'on_request',
    onboarding_fields: [
      'business_name',
      'services_offered',
    ],
    modules_enabled: [
      'vendor_dashboard',
      'vendor_listings',
    ],
    default_permission_template: PERMISSION_TEMPLATES.viewer,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace'],
    dashboard_widgets: ['my_listings'],
    onboarding_order: 12,
    visibility: 'onboarding',
  },

  manufacturer: {
    id: 'manufacturer',
    capability: 'brand',
    display_name: 'Manufacturer',
    description: 'Represent an OEM or parts manufacturer.',
    icon: Package,
    category: 'business',
    is_default: false,
    can_be_primary: true,
    requires_relationship: false,
    relationship_entity_type: null,
    relationship_required_on_onboarding: false,
    requires_approval: 'on_request',
    onboarding_fields: [
      'manufacturer_name',
      'manufacturer_industry',
    ],
    modules_enabled: [
      'manufacturer_dashboard',
      'manufacturer_presence',
    ],
    default_permission_template: PERMISSION_TEMPLATES.viewer,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace'],
    dashboard_widgets: ['my_manufacturer'],
    onboarding_order: 13,
    visibility: 'onboarding',
  },

  partner: {
    id: 'partner',
    capability: 'brand',
    display_name: 'Partner',
    description: 'Formal partnership with the platform or organizations.',
    icon: Building2,
    category: 'business',
    is_default: false,
    can_be_primary: true,
    requires_relationship: false,
    relationship_entity_type: null,
    relationship_required_on_onboarding: false,
    requires_approval: 'on_request',
    onboarding_fields: [
      'organization_name',
    ],
    modules_enabled: [
      'partner_dashboard',
    ],
    default_permission_template: PERMISSION_TEMPLATES.viewer,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace'],
    dashboard_widgets: ['my_partnerships'],
    onboarding_order: 14,
    visibility: 'onboarding',
  },

  creator: {
    id: 'creator',
    capability: 'creator',
    display_name: 'Creator',
    description: 'Publish content to The Outlet.',
    icon: Newspaper,
    category: 'media',
    is_default: false,
    can_be_primary: true,
    requires_relationship: false,
    relationship_entity_type: null,
    relationship_required_on_onboarding: false,
    requires_approval: false,
    onboarding_fields: [
      'creator_handle',
      'content_focus',
    ],
    modules_enabled: [
      'outlet_submit',
      'creator_dashboard',
    ],
    default_permission_template: PERMISSION_TEMPLATES.contributor,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace'],
    dashboard_widgets: ['my_stories', 'story_performance'],
    onboarding_order: 15,
    visibility: 'onboarding',
  },

  volunteer: {
    id: 'volunteer',
    capability: 'fan',
    display_name: 'Volunteer',
    description: 'Help run events and support the community.',
    icon: HandHeart,
    category: 'community',
    is_default: false,
    can_be_primary: true,
    requires_relationship: false,
    relationship_entity_type: null,
    relationship_required_on_onboarding: false,
    requires_approval: 'on_request',
    onboarding_fields: ['volunteer_interests'],
    modules_enabled: [
      'volunteer_dashboard',
    ],
    default_permission_template: PERMISSION_TEMPLATES.contributor,
    navigation_sections: ['home', 'outlet', 'index46', 'store', 'marketplace'],
    dashboard_widgets: ['volunteer_opportunities'],
    onboarding_order: 16,
    visibility: 'onboarding',
  },
};

// ─── Derived Helpers ───────────────────────────────────────────────────────

/** The system default role applied to every account. */
export const DEFAULT_ROLE = 'fan';

/** Roles eligible to be selected as a Primary Role during onboarding. */
export const PRIMARY_ELIGIBLE_ROLES = Object.values(ROLES)
  .filter((r) => r.can_be_primary && r.visibility === 'onboarding')
  .sort((a, b) => a.onboarding_order - b.onboarding_order);

/** Roles shown in the Role Selection stage of onboarding (excludes system roles). */
export const ONBOARDING_SELECTABLE_ROLES = Object.values(ROLES)
  .filter((r) => r.visibility === 'onboarding')
  .sort((a, b) => a.onboarding_order - b.onboarding_order);

/** Roles grouped by category, for UI display. */
export const ROLES_BY_CATEGORY = Object.entries(ROLES)
  .filter(([id]) => ROLES[id].visibility === 'onboarding')
  .reduce((acc, [id, role]) => {
    if (!acc[role.category]) acc[role.category] = [];
    acc[role.category].push(role);
    return acc;
  }, {});

/** Get a single role config by id. */
export function getRole(roleId) {
  return ROLES[roleId] || null;
}

/** Roles that require a relationship during onboarding. */
export function getRolesRequiringOnboardingRelationship() {
  return Object.values(ROLES).filter((r) => r.requires_relationship && r.relationship_required_on_onboarding);
}

/**
 * Determine if a role's relationship request requires admin approval.
 * Returns true / false / 'conditional' / 'on_request'.
 *   - false        = no approval ever (e.g. creating a new entity)
 *   - true         = always requires approval (joining existing org)
 *   - 'conditional' = depends on create-vs-join (handled by the connections stage)
 *   - 'on_request'  = optional; approval triggered only when the user actively
 *                     requests org access post-onboarding
 */
export function requiresApproval(roleId) {
  const role = getRole(roleId);
  return role ? role.requires_approval : false;
}

/** Validate that a roleId is known to the registry. */
export function isValidRole(roleId) {
  return Object.prototype.hasOwnProperty.call(ROLES, roleId);
}

/**
 * Compute the full set of modules a user has access to based on their selected
 * roles. Actual management capability within a module still requires an
 * approved EntityCollaborator relationship.
 */
export function getModulesForRoles(roleIds = []) {
  const modules = new Set();
  // Fan modules are always present.
  (ROLES.fan.modules_enabled || []).forEach((m) => modules.add(m));
  roleIds.forEach((id) => {
    const role = getRole(id);
    if (role) role.modules_enabled.forEach((m) => modules.add(m));
  });
  return Array.from(modules);
}

/**
 * Compute navigation sections enabled by a set of roles.
 */
export function getNavigationForRoles(roleIds = []) {
  const sections = new Set();
  (ROLES.fan.navigation_sections || []).forEach((s) => sections.add(s));
  roleIds.forEach((id) => {
    const role = getRole(id);
    if (role) role.navigation_sections.forEach((s) => sections.add(s));
  });
  return Array.from(sections);
}

/**
 * Compute dashboard widgets enabled by a set of roles.
 */
export function getDashboardWidgetsForRoles(roleIds = []) {
  const widgets = new Set();
  (ROLES.fan.dashboard_widgets || []).forEach((w) => widgets.add(w));
  roleIds.forEach((id) => {
    const role = getRole(id);
    if (role) role.dashboard_widgets.forEach((w) => widgets.add(w));
  });
  return Array.from(widgets);
}

// ─── Capability mapping (User profile_type) ───────────────────────────────
// The onboarding registry is granular (team_owner, track_staff, official…)
// but the User.primary_profile_type / User.profile_types enums must hold the
// BROAD capability the role belongs to (fan, team, series, brand…). Granular
// role identity lives only in EntityCollaborator.role_key.
//
// These helpers turn a granular role selection into schema-valid User fields
// and reconstruct granular roles from broad capabilities when the wizard
// session state is gone (e.g. after a mid-onboarding refresh).

export function getRoleCapability(roleId) {
  const r = getRole(roleId);
  return r?.capability || null;
}

export function buildProfileTypesFromRoles(primaryRoleId, additionalRoleIds = []) {
  const primary = getRole(primaryRoleId);
  const caps = new Set(['fan']);
  if (primary?.capability) caps.add(primary.capability);
  (additionalRoleIds || [])
    .filter((id) => id !== primaryRoleId)
    .forEach((id) => {
      const r = getRole(id);
      if (r?.capability) caps.add(r.capability);
    });
  return Array.from(caps);
}

/**
 * Best-effort reconstruction of the granular onboarding roles that likely
 * require a relationship, from a user's stored (broad) capabilities. Used
 * only when wizard session state is gone (mid-onboarding refresh): the exact
 * granular role the user selected is NOT persisted by design, so we pick the
 * lowest-order primary-eligible role for each capability. This never
 * fabricates a relationship — it only renders a connection request builder.
 */
export function reconstructOnboardingRolesFromCapabilities(capabilities = []) {
  if (!Array.isArray(capabilities) || capabilities.length === 0) return [];
  const result = [];
  for (const cap of capabilities) {
    const candidates = Object.values(ROLES)
      .filter(
        (r) =>
          r.visibility === 'onboarding' &&
          r.can_be_primary &&
          r.capability === cap &&
          r.requires_relationship &&
          r.relationship_required_on_onboarding,
      )
      .sort((a, b) => a.onboarding_order - b.onboarding_order);
    if (candidates[0]) result.push(candidates[0].id);
  }
  return Array.from(new Set(result));
}

export const CAPABILITY_LABELS = {
  fan: 'Fan',
  driver: 'Driver',
  team: 'Team',
  media: 'Media',
  brand: 'Brand',
  track: 'Track',
  series: 'Series',
  crew: 'Crew',
  builder: 'Builder',
  sponsor: 'Sponsor',
  photographer: 'Photographer',
  creator: 'Creator',
};

/**
 * Reconstruct a single granular primary role id from a stored broad
 * capability. Used by the Roles stage when re-opening for a returning user
 * whose granular selection is not persisted. Returns the lowest-order
 * primary-eligible role with that capability, or '' when ambiguous/none.
 * Never crashes — capability values outside the enum map to ''.
 */
export function reconstructPrimaryRoleFromCapability(cap) {
  if (!cap || typeof cap !== 'string') return '';
  const candidates = Object.values(ROLES)
    .filter((r) => r.visibility === 'onboarding' && r.can_be_primary && r.capability === cap)
    .sort((a, b) => a.onboarding_order - b.onboarding_order);
  return candidates[0]?.id || '';
}

export function getCapabilityLabel(cap) {
  if (CAPABILITY_LABELS[cap]) return CAPABILITY_LABELS[cap];
  if (typeof cap === 'string' && cap.length) {
    return cap.charAt(0).toUpperCase() + cap.slice(1);
  }
  return 'Fan';
}