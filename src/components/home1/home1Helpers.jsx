/**
 * home1Helpers — shared helpers for Home1 section components.
 *
 * - resolveCta: resolves a CTA config object to a usable { href, isExternal, isLink, ... }
 * - isScheduleEligible: checks if a schedule config is currently eligible
 * - isSectionVisible: combines enabled + schedule
 * - mergeConfig: deep-merges published config over component defaults
 */

// Deep merge published config over component defaults (arrays replace, objects merge)
export function mergeConfig(defaults, overrides) {
  if (!overrides) return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    const ov = overrides[key];
    const dv = defaults[key];
    if (ov && typeof ov === 'object' && !Array.isArray(ov) && dv && typeof dv === 'object' && !Array.isArray(dv)) {
      result[key] = mergeConfig(dv, ov);
    } else if (ov !== undefined) {
      result[key] = ov;
    }
  }
  return result;
}

// CTA resolver — resolves structured destination to a usable href
// Returns null for invalid/hidden CTAs, { href: null, isLink: false, ... } for enabled-but-linkless CTAs
export function resolveCta(cta) {
  if (!cta || !cta.enabled) return null;
  if (!cta.label || !cta.label.trim()) return null;

  const d = cta.destination;
  if (!d || d.type === 'none') {
    return { href: null, label: cta.label, style: cta.style, isLink: false };
  }

  let href = null;
  let isExternal = false;

  if (d.type === 'internal_page' && d.internal_page) {
    href = d.internal_page;
  } else if (d.type === 'external' && d.external_url) {
    try { new URL(d.external_url); href = d.external_url; isExternal = true; } catch { return null; }
  } else if (d.type === 'entity' && d.entity_id) {
    const id = d.entity_slug || d.entity_id;
    if (d.entity_type === 'Event') href = `/events/${id}`;
    else if (d.entity_type === 'OutletStory') href = `/story/${id}`;
    else return null;
  }

  if (!href) return null;

  return { href, isExternal, openInNewTab: d.open_in_new_tab || false, label: cta.label, style: cta.style || 'solid', isLink: true };
}

// Schedule eligibility — a section with no schedule is always eligible
export function isScheduleEligible(schedule) {
  if (!schedule || !schedule.enabled) return true;
  const now = Date.now();
  if (schedule.start_at && new Date(schedule.start_at).getTime() > now) return false;
  if (schedule.end_at && new Date(schedule.end_at).getTime() < now) return false;
  return true;
}

// Section visibility — enabled AND schedule-eligible
export function isSectionVisible(sectionConfig) {
  if (!sectionConfig) return false;
  if (sectionConfig.enabled === false) return false;
  return isScheduleEligible(sectionConfig.schedule);
}

// Split a space-separated title into lines for ecosystem tile rendering
export function titleLines(title) {
  if (!title) return [];
  if (Array.isArray(title)) return title;
  return title.split(' ');
}