/**
 * managementSections.jsx — re-export shim.
 *
 * Phase 1 consolidated the duplicate navigation definitions into a single
 * source of truth: managementConfig.jsx. This file re-exports the canonical
 * config so existing consumers (CommandPalette, ManagementSearch) consume
 * the same registry as ManagementSidebar without modification.
 *
 * Do not add new navigation items here. Edit managementConfig.jsx instead.
 */
export {
  DASHBOARD_ITEM,
  RACECORE_LINK,
  MANAGEMENT_SECTIONS,
  MANAGEMENT_PAGES,
  getManagementItemsForRole,
} from './managementConfig';