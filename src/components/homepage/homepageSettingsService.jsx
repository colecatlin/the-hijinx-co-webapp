/**
 * homepageSettingsService
 *
 * Frontend service for loading and saving homepage editorial settings.
 * Wraps base44 SDK calls with safe error handling.
 */

import { base44 } from '@/api/base44Client';

/**
 * Load the active editorial settings singleton.
 * Returns { ok: true, data } or { ok: false, error, data: null }
 */
export async function getActiveHomepageSettings() {
  try {
    const records = await base44.entities.HomepageSettings.filter(
      { active: true },
      '-created_date',
      1,
    );
    return { ok: true, data: records?.[0] || null };
  } catch (error) {
    return { ok: false, error: error.message, data: null };
  }
}

/**
 * Save (create or update) the editorial settings singleton.
 * Returns { ok: true, data } or { ok: false, error }
 */
export async function saveHomepageSettings(fields, existingId = null, userId = null) {
  try {
    const payload = {
      ...fields,
      active: true,
      updated_at: new Date().toISOString(),
      ...(userId ? { updated_by_user_id: userId } : {}),
    };

    let record;
    if (existingId) {
      record = await base44.entities.HomepageSettings.update(existingId, payload);
    } else {
      record = await base44.entities.HomepageSettings.create({
        ...payload,
        created_at: new Date().toISOString(),
      });
    }
    return { ok: true, data: record };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}