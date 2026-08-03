/**
 * QuickAddRegistry — field configurations for the unified QuickAddEntityDialog.
 * Each config defines the entity SDK name, react-query invalidation key,
 * dialog copy, and the row fields (text / date / select / entity-select).
 *
 * Field types:
 *  - text          → <Input type="text">
 *  - date          → <Input type="date">
 *  - select        → <Select> with static `options` string[]
 *  - entity-select → <Select> populated from a live entity list
 *                     (entityName + queryKey + labelField)
 *
 * `aliases` drives flexible CSV column header matching.
 */
export const QUICK_ADD_CONFIGS = {
  Team: {
    entityName: 'Team',
    plural: 'Teams',
    queryKey: ['teams'],
    title: 'Add Teams (Bulk)',
    description:
      'Add as many teams as you want — Name is required. Location and discipline are optional.',
    fields: [
      { key: 'name', label: 'Name *', type: 'text', required: true, placeholder: 'Team name', aliases: ['name', 'team', 'teamname'] },
      { key: 'headquarters_city', label: 'City', type: 'text', placeholder: 'City', aliases: ['city', 'headquarterscity', 'hqcity'] },
      { key: 'headquarters_state', label: 'State', type: 'text', placeholder: 'State', aliases: ['state', 'headquartersstate', 'hqstate'] },
      { key: 'country', label: 'Country', type: 'text', placeholder: 'Country', aliases: ['country'] },
      { key: 'primary_discipline', label: 'Discipline', type: 'select', options: ['Off Road', 'Snowmobile', 'Asphalt Oval', 'Road Racing', 'Rallycross', 'Drag Racing', 'Mixed'], aliases: ['discipline', 'primarydiscipline'] },
      { key: 'team_level', label: 'Level', type: 'select', options: ['Local', 'Regional', 'National', 'International'], aliases: ['level', 'teamlevel'] },
    ],
  },

  Track: {
    entityName: 'Track',
    plural: 'Tracks',
    queryKey: ['tracks'],
    title: 'Add Tracks (Bulk)',
    description:
      'Add as many tracks as you want — Name, City, and Country are required.',
    fields: [
      { key: 'name', label: 'Name *', type: 'text', required: true, placeholder: 'Track name', aliases: ['name', 'track', 'trackname'] },
      { key: 'location_city', label: 'City *', type: 'text', required: true, placeholder: 'City', aliases: ['city', 'locationcity'] },
      { key: 'location_state', label: 'State', type: 'text', placeholder: 'State', aliases: ['state', 'locationstate'] },
      { key: 'location_country', label: 'Country *', type: 'text', required: true, placeholder: 'Country', aliases: ['country', 'locationcountry'] },
      { key: 'track_type', label: 'Type', type: 'select', options: ['Oval', 'Road Course', 'Street Circuit', 'Short Track', 'Speedway', 'Off-Road', 'Dirt Track', 'Other'], aliases: ['type', 'tracktype'] },
      { key: 'surface_type', label: 'Surface', type: 'select', options: ['Asphalt', 'Concrete', 'Dirt', 'Clay', 'Mixed'], aliases: ['surface', 'surfacetype'] },
    ],
  },

  Series: {
    entityName: 'Series',
    plural: 'Series',
    queryKey: ['series'],
    title: 'Add Series (Bulk)',
    description:
      'Add as many series as you want — Name and Discipline are required.',
    fields: [
      { key: 'name', label: 'Name *', type: 'text', required: true, placeholder: 'Series name', aliases: ['name', 'series', 'seriesname'] },
      { key: 'discipline', label: 'Discipline *', type: 'select', required: true, options: ['Stock Car', 'Off Road', 'Dirt Oval', 'Snowmobile', 'Dirt Bike', 'Open Wheel', 'Sports Car', 'Touring Car', 'Rally', 'Drag', 'Motorcycle', 'Karting', 'Water', 'Alternative'], aliases: ['discipline'] },
      { key: 'geographic_scope', label: 'Scope', type: 'select', options: ['Local', 'Regional', 'National', 'International', 'Global'], aliases: ['scope', 'geographicscope'] },
      { key: 'sanctioning_body', label: 'Sanctioning', type: 'text', placeholder: 'Sanctioning body', aliases: ['sanctioningbody', 'sanctioning'] },
      { key: 'season_year', label: 'Season', type: 'text', placeholder: '2026', aliases: ['season', 'seasonyear', 'year'] },
    ],
  },

  Event: {
    entityName: 'Event',
    plural: 'Events',
    queryKey: ['events'],
    title: 'Add Events (Bulk)',
    description:
      'Add as many events as you want — Name and Date are required. Track and Series are optional.',
    fields: [
      { key: 'name', label: 'Name *', type: 'text', required: true, placeholder: 'Event name', aliases: ['name', 'event', 'eventname'] },
      { key: 'event_date', label: 'Date *', type: 'date', required: true, aliases: ['date', 'eventdate'] },
      { key: 'track_id', label: 'Track', type: 'entity-select', entityName: 'Track', queryKey: ['tracks'], labelField: 'name', aliases: ['track', 'trackname'] },
      { key: 'series_id', label: 'Series', type: 'entity-select', entityName: 'Series', queryKey: ['series'], labelField: 'name', aliases: ['series', 'seriesname'] },
      { key: 'season', label: 'Season', type: 'text', placeholder: '2026', aliases: ['season', 'seasonyear', 'year'] },
    ],
  },
};