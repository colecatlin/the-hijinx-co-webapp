/**
 * Canonical Event Classification Resolver — Step 5
 *
 * Resolution chain:
 *   Event → series_id → Series → discipline_id / format_id
 *                              → Discipline entity (color, name)
 *                              → Format entity (name)
 *
 * Fallback chain (for backwards compatibility):
 *   discipline_id miss → Series.discipline string → FALLBACK_COLORS map → DEFAULT_COLOR
 *   format_id miss → null (graceful, no format shown)
 */

export const FALLBACK_COLORS = {
  'Stock Car':    '#EF4444',
  'Off Road':     '#1E3A5F',
  'Dirt Oval':    '#A16207',
  'Snowmobile':   '#6366F1',
  'Dirt Bike':    '#8B5CF6',
  'Open Wheel':   '#9333EA',
  'Sports Car':   '#16A34A',
  'Touring Car':  '#0D9488',
  'Rally':        '#CA8A04',
  'Drag':         '#EC4899',
  'Motorcycle':   '#3B82F6',
  'Karting':      '#06B6D4',
  'Water':        '#0EA5E9',
  'Alternative':  '#84CC16',
};

export const DEFAULT_COLOR = '#6B7280';

/**
 * Resolve full classification for a single event.
 *
 * @param {object} event
 * @param {object} seriesMap   — { [series.id]: series }
 * @param {object} disciplineById — { [discipline.id]: discipline }
 * @param {object} disciplineByName — { [discipline.name]: discipline }
 * @param {object} formatById  — { [format.id]: format }
 * @returns {{ disciplineId, disciplineName, disciplineColor, formatId, formatName }}
 */
export function resolveEventClassification(
  event,
  seriesMap,
  disciplineById,
  disciplineByName,
  formatById
) {
  const series = event?.series_id ? seriesMap[event.series_id] : null;

  // ── Discipline resolution ──────────────────────────────────────────────────
  let disciplineId = null;
  let disciplineName = null;
  let disciplineColor = DEFAULT_COLOR;

  if (series?.discipline_id && disciplineById[series.discipline_id]) {
    const d = disciplineById[series.discipline_id];
    disciplineId = d.id;
    disciplineName = d.name;
    disciplineColor = d.color_code || DEFAULT_COLOR;
  } else if (series?.discipline && disciplineByName[series.discipline]) {
    const d = disciplineByName[series.discipline];
    disciplineId = d.id;
    disciplineName = d.name;
    disciplineColor = d.color_code || DEFAULT_COLOR;
  } else if (series?.discipline && FALLBACK_COLORS[series.discipline]) {
    disciplineName = series.discipline;
    disciplineColor = FALLBACK_COLORS[series.discipline];
  }

  // ── Format resolution ──────────────────────────────────────────────────────
  let formatId = null;
  let formatName = null;

  if (series?.format_id && formatById[series.format_id]) {
    const f = formatById[series.format_id];
    formatId = f.id;
    formatName = f.name;
  }

  return { disciplineId, disciplineName, disciplineColor, formatId, formatName };
}

/**
 * Build lookup maps from arrays for efficient resolution.
 */
export function buildClassificationMaps(disciplines, formats) {
  const disciplineById = {};
  const disciplineByName = {};
  const formatById = {};

  disciplines.forEach(d => {
    disciplineById[d.id] = d;
    disciplineByName[d.name] = d;
  });

  formats.forEach(f => {
    formatById[f.id] = f;
  });

  return { disciplineById, disciplineByName, formatById };
}