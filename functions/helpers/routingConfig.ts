/**
 * Backend Function Routing & Naming Convention Guide
 * 
 * This document defines the routing and naming standards for all backend functions.
 * 
 * NAMING CONVENTIONS:
 * - Use camelCase only (no spaces, hyphens, or underscores in function names)
 * - Prefix with verb that describes action:
 *   * verify* — Check/validate something (e.g., verifyAccessCode)
 *   * check* — Assess conditions (e.g., checkEntityAccess)
 *   * create* — Create new records (e.g., createAndSendEntityInvitation)
 *   * update* — Modify existing records (e.g., updateDriverStatuses)
 *   * sync* — Sync data from external sources (e.g., syncNascarSchedule)
 *   * import* — Import bulk data (e.g., importNascarDrivers)
 *   * enrich* — Enhance records with additional data (e.g., enrichDriverFromNascar)
 *   * fetch* — Retrieve data (e.g., fetchNascarData)
 *   * calculate* — Compute values (e.g., recalculateStandings)
 *   * generate* — Create content (e.g., generateDriverInsights)
 * 
 * AUTHENTICATION & AUTHORIZATION:
 * - All functions that modify data MUST verify user authentication
 * - Use requireAuth() for standard user verification
 * - Use requireAdminAuth() for admin-only operations
 * - Always check user.role === 'admin' for sensitive operations
 * - Return 401 Unauthorized if user is not authenticated
 * - Return 403 Forbidden if user lacks required permissions
 * 
 * PAYLOAD VALIDATION:
 * - Validate all incoming payloads for required fields
 * - Use validateRequired() for checking presence of fields
 * - Use validateEnum() for enum fields
 * - Use validateEmail() for email fields
 * - Return 400 Bad Request for validation failures
 * 
 * RESPONSE FORMAT:
 * - Success responses: { success: true, data: {...}, message?: "..." }
 * - Error responses: { error: "message" } with appropriate HTTP status
 * - Status codes:
 *   * 200 — Success
 *   * 400 — Bad request / validation error
 *   * 401 — Unauthorized (not authenticated)
 *   * 403 — Forbidden (authenticated but insufficient permissions)
 *   * 404 — Not found
 *   * 500 — Server error
 * 
 * FUNCTION GROUPING BY PURPOSE:
 * 
 * Authentication & Access Control:
 *   - verifyAccessCode
 *   - checkEntityAccess
 *   - acceptEntityInvitation
 *   - createAndSendEntityInvitation
 * 
 * Data Import/Sync (NASCAR, External):
 *   - importNascarDrivers
 *   - syncNascarSchedule
 *   - syncNascarResults (scheduled automation)
 *   - enrichDriverFromNascar
 *   - enrichTeamData
 * 
 * Data Processing & Deduplication:
 *   - deduplicateDrivers
 *   - autoMatchResultsToDrivers
 *   - fixNascarConnections
 * 
 * Analytics & Insights:
 *   - recalculateStandings
 *   - generateDriverInsights
 *   - recalculateSeriesLevel
 * 
 * Utilities:
 *   - testGoogleMapsKey
 *   - setupHijinxAPI
 */

export const ENTITY_TYPES = ['Driver', 'Team', 'Track', 'Series', 'Event'];

export const FUNCTION_CATEGORIES = {
  AUTH: 'Authentication & Access Control',
  DATA_IMPORT: 'Data Import/Sync',
  DATA_PROCESS: 'Data Processing & Deduplication',
  ANALYTICS: 'Analytics & Insights',
  UTILITY: 'Utilities'
};

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};