/**
 * workbookTemplates.ts — the single definition of the core-record import templates.
 *
 * The workbook's six record tabs ARE the import templates. A tab's header row is
 * this column list and its second row explains each column, so the sheet and the
 * importer cannot drift: both read this module.
 *
 * Column names are deliberately the field names the established import path
 * already expects (see smartCSVImport's row mappers and prepareSourcePayloadForSync),
 * so a row typed here means the same thing as a row uploaded through the existing
 * CSV import screens.
 *
 * Scope: the six core records only. Media profiles and outlets, crew, officials,
 * volunteers and the operational records are deliberately absent.
 */

export type TemplateColumn = {
  name: string;
  note: string;
  required?: boolean;
};

export type WorkbookDomain = {
  key: string;
  tab: string;
  label: string;
  /** The canonical record the tab holds. */
  entity: string;
  /** entity_type passed to the read-only resolution engine. */
  engineEntity: string;
  /** entity_type passed to prepareSourcePayloadForSync; null for organizations. */
  pipelineType: string | null;
  /** Key of this domain's own record inside the resolution engine's payload. */
  primaryResolutionKey: string;
  intro: string;
  columns: TemplateColumn[];
  toPayload: (row: Record<string, string>) => Record<string, unknown>;
};

// ════════════════════════════════════════════════════════════════════
// Columns the platform writes back — identical on every template
// ════════════════════════════════════════════════════════════════════

export const STAMP_COLUMNS: TemplateColumn[] = [
  { name: 'platform_name', note: 'Written by the platform — the record as it is stored.' },
  { name: 'platform_id', note: 'Written by the platform. Once filled, this row is already on the platform and is never created a second time. Clear it to make the row try again.' },
  { name: 'platform_racecore_id', note: 'Written by the platform — RaceCore ID, where the record has one.' },
  { name: 'platform_slug', note: 'Written by the platform — the slug used in the record’s public address.' },
  { name: 'last_action', note: 'Written by the platform: created, skipped or failed.' },
  { name: 'last_run_at', note: 'Written by the platform — when the run last looked at this row.' },
  { name: 'last_note', note: 'Written by the platform — why a row was skipped or failed.' },
];

export const STAMP_COLUMN_NAMES = STAMP_COLUMNS.map(function (c) { return c.name; });

function plain(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// ════════════════════════════════════════════════════════════════════
// The six templates
// ════════════════════════════════════════════════════════════════════

const RACERS: WorkbookDomain = {
  key: 'racers',
  tab: 'Racers',
  label: 'Racers',
  entity: 'RacerProfile',
  engineEntity: 'Driver',
  pipelineType: 'driver',
  primaryResolutionKey: 'driver',
  intro: 'One row per racer. The platform creates the racer’s profile, identity record and competitive record together.',
  columns: [
    { name: 'first_name', required: true, note: 'Given name. Required.' },
    { name: 'last_name', required: true, note: 'Family name. Required.' },
    { name: 'primary_number', note: 'Race number, digits only.' },
    { name: 'primary_discipline', note: 'Main discipline — choose from the Ref · Disciplines tab.' },
    { name: 'date_of_birth', note: 'YYYY-MM-DD. The strongest signal for telling two people with the same name apart.' },
    { name: 'hometown_city', note: 'Hometown city.' },
    { name: 'hometown_state', note: 'Hometown state or region.' },
    { name: 'hometown_country', note: 'Hometown country.' },
    { name: 'racing_base_city', note: 'Where the racer is based, if it differs from the hometown.' },
    { name: 'racing_base_state', note: 'State or region of the racing base.' },
    { name: 'career_status', note: 'Free text — Active, Retired, and so on.' },
    { name: 'contact_email', note: 'Contact email.' },
    { name: 'external_uid', note: 'An ID this racer already has elsewhere. Strongest possible match signal — fill it whenever you have one.' },
  ],
  toPayload: (row) => ({
    first_name: plain(row.first_name),
    last_name: plain(row.last_name),
    primary_number: plain(row.primary_number),
    primary_discipline: plain(row.primary_discipline),
    date_of_birth: plain(row.date_of_birth),
    hometown_city: plain(row.hometown_city),
    hometown_state: plain(row.hometown_state),
    hometown_country: plain(row.hometown_country),
    racing_base_city: plain(row.racing_base_city),
    racing_base_state: plain(row.racing_base_state),
    career_status: plain(row.career_status),
    contact_email: plain(row.contact_email),
    external_uid: plain(row.external_uid),
    data_source: 'import_workbook',
  }),
};

const TEAMS: WorkbookDomain = {
  key: 'teams',
  tab: 'Teams',
  label: 'Teams',
  entity: 'Team',
  engineEntity: 'Team',
  pipelineType: 'team',
  primaryResolutionKey: 'team',
  intro: 'One row per team.',
  columns: [
    { name: 'name', required: true, note: 'Team name. Required.' },
    { name: 'headquarters_city', note: 'Headquarters city.' },
    { name: 'headquarters_state', note: 'Headquarters state or region.' },
    { name: 'country', note: 'Country.' },
    { name: 'primary_discipline', note: 'Main discipline — choose from the Ref · Disciplines tab.' },
    { name: 'team_level', note: 'Free text — Pro, Sportsman, and so on.' },
    { name: 'founded_year', note: 'Four-digit year.' },
    { name: 'external_uid', note: 'An ID this team already has elsewhere. Strongest match signal.' },
  ],
  toPayload: (row) => ({
    name: plain(row.name),
    headquarters_city: plain(row.headquarters_city),
    headquarters_state: plain(row.headquarters_state),
    country: plain(row.country),
    primary_discipline: plain(row.primary_discipline),
    team_level: plain(row.team_level),
    founded_year: plain(row.founded_year) ? parseInt(plain(row.founded_year), 10) : null,
    external_uid: plain(row.external_uid),
    data_source: 'import_workbook',
  }),
};

const ORGANIZATIONS: WorkbookDomain = {
  key: 'organizations',
  tab: 'Organizations',
  label: 'Organizations',
  entity: 'Organization',
  engineEntity: 'Organization',
  pipelineType: null,
  primaryResolutionKey: 'organization',
  intro: 'One row per organization — sponsors, vendors, manufacturers and the other commercial partners.',
  columns: [
    { name: 'name', required: true, note: 'Organization name. Required. A name that already exists on the platform is skipped, never merged.' },
    { name: 'type', required: true, note: 'One of: Sponsor, Vendor, Manufacturer, OEM, BroadcastPartner, Venue, SanctioningBody, MarketingAgency, SafetyCrew, HospitalityPartner, RetailPartner, TechnologyProvider, League, Club, Association, Other.' },
    { name: 'website_url', note: 'Website. Also used to match an organization already on the platform.' },
    { name: 'industry', note: 'Industry — Energy Drink, Tires, Apparel, and so on.' },
    { name: 'tagline', note: 'Short identity line.' },
    { name: 'description', note: 'Public description.' },
    { name: 'location_city', note: 'City.' },
    { name: 'location_state', note: 'State or region.' },
    { name: 'location_country', note: 'Country.' },
    { name: 'contact_email', note: 'Contact email.' },
    { name: 'logo_url', note: 'Logo image address.' },
    { name: 'external_uid', note: 'An ID this organization already has elsewhere. Strongest match signal.' },
  ],
  toPayload: (row) => ({
    name: plain(row.name),
    type: plain(row.type),
    website_url: plain(row.website_url),
    industry: plain(row.industry),
    tagline: plain(row.tagline),
    description: plain(row.description),
    location_city: plain(row.location_city),
    location_state: plain(row.location_state),
    location_country: plain(row.location_country),
    contact_email: plain(row.contact_email),
    logo_url: plain(row.logo_url),
    external_uid: plain(row.external_uid),
  }),
};

const TRACKS: WorkbookDomain = {
  key: 'tracks',
  tab: 'Tracks',
  label: 'Tracks',
  entity: 'Track',
  engineEntity: 'Track',
  pipelineType: 'track',
  primaryResolutionKey: 'track',
  intro: 'One row per track.',
  columns: [
    { name: 'name', required: true, note: 'Track name. Required.' },
    { name: 'location_city', required: true, note: 'City. Required — the platform will not create a track without one.' },
    { name: 'location_state', note: 'State or region.' },
    { name: 'location_country', required: true, note: 'Country. Required — the platform will not create a track without one.' },
    { name: 'track_type', note: 'Free text — Short Course, Oval, Road Course, and so on.' },
    { name: 'surface_type', note: 'Free text — Dirt, Asphalt, and so on.' },
    { name: 'length', note: 'Track length as a number.' },
    { name: 'external_uid', note: 'An ID this track already has elsewhere. Strongest match signal.' },
  ],
  toPayload: (row) => ({
    name: plain(row.name),
    location_city: plain(row.location_city),
    location_state: plain(row.location_state),
    location_country: plain(row.location_country),
    track_type: plain(row.track_type),
    surface_type: plain(row.surface_type),
    length: plain(row.length) ? parseFloat(plain(row.length)) : null,
    external_uid: plain(row.external_uid),
    data_source: 'import_workbook',
  }),
};

const SERIES: WorkbookDomain = {
  key: 'series',
  tab: 'Series',
  label: 'Series',
  entity: 'Series',
  engineEntity: 'Series',
  pipelineType: 'series',
  primaryResolutionKey: 'series',
  intro: 'One row per series.',
  columns: [
    { name: 'name', required: true, note: 'Series name. Required.' },
    { name: 'full_name', note: 'Full or official name, where it differs from the short name above.' },
    { name: 'discipline', required: true, note: 'Discipline. Required — choose from the Ref · Disciplines tab.' },
    { name: 'sanctioning_body', note: 'Sanctioning body.' },
    { name: 'geographic_scope', note: 'Free text — National, Regional, Local.' },
    { name: 'season_year', note: 'Four-digit season year.' },
    { name: 'external_uid', note: 'An ID this series already has elsewhere. Strongest match signal.' },
  ],
  toPayload: (row) => ({
    name: plain(row.name),
    full_name: plain(row.full_name),
    discipline: plain(row.discipline),
    sanctioning_body: plain(row.sanctioning_body),
    geographic_scope: plain(row.geographic_scope),
    season_year: plain(row.season_year),
    external_uid: plain(row.external_uid),
    data_source: 'import_workbook',
  }),
};

const EVENTS: WorkbookDomain = {
  key: 'events',
  tab: 'Events',
  label: 'Events',
  entity: 'Event',
  engineEntity: 'Event',
  pipelineType: 'event',
  primaryResolutionKey: 'event',
  intro: 'One row per event. Fill the Series and Track columns with the platform_id of the records in those two tabs — import those tabs first.',
  columns: [
    { name: 'name', required: true, note: 'Event name. Required.' },
    { name: 'event_date', required: true, note: 'YYYY-MM-DD. Required.' },
    { name: 'end_date', note: 'YYYY-MM-DD, when the event runs over more than one day.' },
    { name: 'series_id', note: 'platform_id of the series, copied from the Series tab once it has been imported.' },
    { name: 'track_id', note: 'platform_id of the track, copied from the Tracks tab once it has been imported.' },
    { name: 'season', note: 'Season the event belongs to — a four-digit year.' },
    { name: 'round_number', note: 'Round within the season, as a number.' },
    { name: 'external_uid', note: 'An ID this event already has elsewhere. Strongest match signal.' },
  ],
  toPayload: (row) => ({
    name: plain(row.name),
    event_date: plain(row.event_date),
    end_date: plain(row.end_date),
    series_id: plain(row.series_id),
    track_id: plain(row.track_id),
    season: plain(row.season),
    round_number: plain(row.round_number) ? parseInt(plain(row.round_number), 10) : null,
    external_uid: plain(row.external_uid),
    data_source: 'import_workbook',
  }),
};

/** Tab order is stable — the workbook's own tab order, unchanged. */
export const WORKBOOK_DOMAINS: WorkbookDomain[] = [RACERS, TEAMS, ORGANIZATIONS, TRACKS, SERIES, EVENTS];

// ════════════════════════════════════════════════════════════════════
// Lookups
// ════════════════════════════════════════════════════════════════════

export function domainByKey(key: string): WorkbookDomain | null {
  return WORKBOOK_DOMAINS.find(function (d) { return d.key === key || d.tab === key; }) || null;
}

export function domainForTab(tab: string): WorkbookDomain | null {
  return WORKBOOK_DOMAINS.find(function (d) { return d.tab === tab; }) || null;
}

/** Header row: what you fill in first, then the columns the platform writes. */
export function templateColumns(domain: WorkbookDomain): string[] {
  return domain.columns.map(function (c) { return c.name; }).concat(STAMP_COLUMN_NAMES);
}

/** The columns an admin fills in — everything before the platform block. */
export function inputColumnNames(domain: WorkbookDomain): string[] {
  return domain.columns.map(function (c) { return c.name; });
}

export function requiredColumnNames(domain: WorkbookDomain): string[] {
  return domain.columns.filter(function (c) { return c.required === true; }).map(function (c) { return c.name; });
}

/**
 * An empty cell means "not provided", never "no" — so empty values are dropped
 * instead of being sent as blanks, which the platform rejects on a field it
 * requires. Combined with the required-column check, this is what keeps a
 * half-filled row from reaching the import pipeline at all.
 */
export function compactPayload(payload: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  Object.keys(payload || {}).forEach(function (key) {
    const value = payload[key];
    if (value === '' || value === null || value === undefined) return;
    out[key] = value;
  });
  return out;
}

/** Turn one row of cells into a field map keyed by column name. */
export function rowToObject(columns: string[], values: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  columns.forEach(function (column, index) {
    const cell = values[index];
    out[column] = (cell === undefined || cell === null) ? '' : String(cell).trim();
  });
  return out;
}

/**
 * The platform block for one row. Reads whatever record the pipeline settled on,
 * so a skipped row is stamped with the record it clashed with and stops being
 * retried on every later run.
 */
export function stampFromRecord(record: Record<string, any> | null, fallbackName: string) {
  const name = (record && (record.name || record.display_name || record.full_name)) ||
    (record && record.first_name ? String(record.first_name + ' ' + (record.last_name || '')).trim() : '') ||
    fallbackName || '';
  return {
    platform_name: name,
    platform_id: (record && record.id) || '',
    platform_racecore_id: (record && record.racecore_id) || '',
    platform_slug: (record && (record.slug || record.canonical_slug)) || '',
  };
}