/**
 * entityDiagnosticsApi.js
 * Lightweight frontend helpers for developer / admin diagnostics surfaces.
 * Does not render any UI — call from diagnostic pages or admin panels.
 */
import { base44 } from '@/api/base44Client';

/**
 * Run a full source integrity audit across all entity types.
 * Returns { ok, data } or { ok: false, error }
 */
export async function runSourceIntegrityAudit() {
  try {
    const response = await base44.functions.invoke('runSourceIntegrityAudit', {});
    return { ok: true, data: response.data };
  } catch (err) {
    return { ok: false, error: err?.message || 'runSourceIntegrityAudit failed' };
  }
}

/**
 * Find duplicate source entities for Series.
 * Returns { ok, data } or { ok: false, error }
 */
export async function findSeriesDuplicates() {
  try {
    const response = await base44.functions.invoke('findDuplicateSourceEntities', { entity_type: 'series' });
    return { ok: true, data: response.data };
  } catch (err) {
    return { ok: false, error: err?.message || 'findSeriesDuplicates failed' };
  }
}

/**
 * Trigger the known NASCAR series duplicate repair.
 * Returns { ok, data } or { ok: false, error }
 */
export async function fixKnownSeriesDuplicates() {
  try {
    const response = await base44.functions.invoke('fixKnownSeriesDuplicates', {});
    return { ok: true, data: response.data };
  } catch (err) {
    return { ok: false, error: err?.message || 'fixKnownSeriesDuplicates failed' };
  }
}