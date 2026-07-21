/**
 * Organization Platform — Registry
 * ---------------------------------------------------------------------------
 * The single configuration source for every organization type. The entire
 * framework (layout, creation, dashboard, assets, people, settings) derives
 * behavior from entries here. Adding a future type (OEM, Venue, League, etc.)
 * requires only a new entry — no component changes, no business logic edits.
 *
 * Each entry declares:
 *   label        — human-facing display name
 *   base44Entity — the base44 entity that stores the canonical record
 *   icon         — lucide icon used in headers/cards/create flows
 *   generic      — true when the record lives on the generic Organization
 *                  entity (types without a dedicated racing entity)
 *   supportsLocation — surfaces location fields in create/settings
 *   createFields — which common fields the create form collects for this type
 *   accentColor  — default brand accent (overridable via settings)
 */

import {
  Users,
  MapPin,
  Trophy,
  Radio,
  Gift,
  Truck,
  Factory,
} from 'lucide-react';

export const ORGANIZATION_TYPES = {
  Team: {
    label: 'Team',
    base44Entity: 'Team',
    icon: Users,
    generic: false,
    supportsLocation: true,
    createFields: ['name', 'description', 'website_url', 'logo_url', 'location_city', 'location_country'],
    accentColor: '#1DA1A1',
  },
  Track: {
    label: 'Track',
    base44Entity: 'Track',
    icon: MapPin,
    generic: false,
    supportsLocation: true,
    createFields: ['name', 'description', 'website_url', 'logo_url', 'location_city', 'location_country'],
    accentColor: '#1DA1A1',
  },
  Series: {
    label: 'Series',
    base44Entity: 'Series',
    icon: Trophy,
    generic: false,
    supportsLocation: false,
    createFields: ['name', 'description', 'website_url', 'logo_url'],
    accentColor: '#1DA1A1',
  },
  MediaOutlet: {
    label: 'Media Outlet',
    base44Entity: 'MediaOutlet',
    icon: Radio,
    generic: false,
    supportsLocation: false,
    createFields: ['name', 'description', 'website_url', 'logo_url'],
    accentColor: '#1DA1A1',
  },
  Sponsor: {
    label: 'Sponsor',
    base44Entity: 'Organization',
    icon: Gift,
    generic: true,
    supportsLocation: true,
    createFields: ['name', 'description', 'website_url', 'logo_url', 'location_city', 'location_country'],
    accentColor: '#1DA1A1',
  },
  Vendor: {
    label: 'Vendor',
    base44Entity: 'Organization',
    icon: Truck,
    generic: true,
    supportsLocation: true,
    createFields: ['name', 'description', 'website_url', 'logo_url', 'location_city', 'location_country'],
    accentColor: '#1DA1A1',
  },
  Manufacturer: {
    label: 'Manufacturer',
    base44Entity: 'Organization',
    icon: Factory,
    generic: true,
    supportsLocation: true,
    createFields: ['name', 'description', 'website_url', 'logo_url', 'location_city', 'location_country'],
    accentColor: '#1DA1A1',
  },
};

// Core sections every organization exposes. Type-specific modules attach here.
export const CORE_SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'people', label: 'People' },
  { key: 'assets', label: 'Assets' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'activity', label: 'Activity' },
  { key: 'settings', label: 'Settings' },
];

// Extensible asset taxonomy. The framework never parses this beyond labels.
export const ASSET_TYPES = [
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'facility', label: 'Facility' },
  { key: 'building', label: 'Building' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'document', label: 'Document' },
  { key: 'media', label: 'Media' },
  { key: 'sponsor', label: 'Sponsor' },
  { key: 'license', label: 'License' },
  { key: 'other', label: 'Other' },
];

// Reusable verification states (independent of users).
export const VERIFICATION_STATES = {
  unverified: { label: 'Unverified', color: 'rgba(255,255,255,0.4)' },
  pending_review: { label: 'Pending Review', color: '#f59e0b' },
  verified: { label: 'Verified', color: '#1DA1A1' },
  official: { label: 'Official', color: '#1DA1A1' },
};

export function getOrganizationType(type) {
  return ORGANIZATION_TYPES[type] || null;
}

export function isSupportedType(type) {
  return Boolean(ORGANIZATION_TYPES[type]);
}

export function settingsKeyFor(type, id) {
  return `${type}:${id}`;
}