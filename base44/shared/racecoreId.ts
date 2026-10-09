/**
 * racecoreId.ts — thin re-export module for backward compatibility.
 *
 * The authoritative RaceCore ID infrastructure now lives in racecoreRegistry.ts.
 * All existing callers import from this module; this file delegates to the
 * registry-backed implementation so they automatically get:
 *   - Family health checking (fail-closed on BLOCKED families)
 *   - Registry-backed issuance (durable ledger reservation)
 *   - Exact-one resolution
 *   - Expanded integrity audit support
 *
 * All new code should import directly from racecoreRegistry.ts.
 */

export {
  ensureRaceCoreId,
  generateRaceCoreId,
  resolveRaceCoreId,
  initializeFamily,
  preflightFamily,
  getFamilyState,
  isFamilyHealthy,
  getAllFamilyStates,
  upsertFamilyState,
  findIssuance,
  findIssuancesForSource,
  loadIssuancesByPrefix,
  parseRaceCoreId,
  formatId,
  isRaceCoreAttempt,
  isSupportedPrefix,
  isSupportedEntityType,
  getEntityTypeForPrefix,
  getPrefixForEntityType,
  RACECORE_FAMILIES,
  ALL_PREFIXES,
  MAX_SEQUENCE,
  MAX_RETRIES,
} from './racecoreRegistry.ts';