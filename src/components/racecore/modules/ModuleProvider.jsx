/**
 * R9BX — RaceCore ModuleProvider
 *
 * Provides module state to the EventWorkspace tree.
 * Consumes a `series` prop and exposes module helpers via context.
 *
 * Usage:
 *   <ModuleProvider series={selectedSeries}>
 *     {children}
 *   </ModuleProvider>
 *
 * Hook:
 *   const { governanceEnabled, hasModule } = useModules();
 *   const enabled = useModule('governance');
 */

import React, { createContext, useContext, useMemo } from 'react';
import {
  getEnabledModules,
  hasModule as hasModuleUtil,
  isGovernanceEnabled,
  isMediaEnabled,
  isRegistrationEnabled,
  DEFAULT_ENABLED_MODULES,
} from './moduleUtils';

const ModuleContext = createContext(null);

/**
 * Safe defaults returned when ModuleProvider is absent.
 * All modules default to ENABLED for backward compatibility.
 */
const DEFAULT_MODULE_STATE = {
  enabledModules: DEFAULT_ENABLED_MODULES,
  hasModule: (key) => DEFAULT_ENABLED_MODULES.includes(key.toLowerCase()),
  governanceEnabled: true,
  mediaEnabled: true,
  registrationEnabled: true,
};

export function ModuleProvider({ series, children }) {
  const value = useMemo(() => {
    const enabledModules = getEnabledModules(series);
    return {
      enabledModules,
      hasModule: (key) => hasModuleUtil(series, key),
      governanceEnabled: isGovernanceEnabled(series),
      mediaEnabled: isMediaEnabled(series),
      registrationEnabled: isRegistrationEnabled(series),
    };
  }, [series]);

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
}

/**
 * Returns module state for the current series.
 * Safe to call outside ModuleProvider — returns DEFAULT_MODULE_STATE.
 */
export function useModules() {
  const ctx = useContext(ModuleContext);
  return ctx || DEFAULT_MODULE_STATE;
}

/**
 * Returns true/false for a single module key.
 * Safe to call outside ModuleProvider — defaults to true (backward compat).
 */
export function useModule(moduleKey) {
  const { hasModule } = useModules();
  return hasModule(moduleKey);
}

export default ModuleProvider;