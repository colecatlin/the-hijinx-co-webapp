import { useState, useEffect, useRef } from 'react';

/**
 * Per-tab keep-alive for the four bottom-nav tab routes.
 *
 * - Lazily mounts each visited tab route and keeps it mounted (hidden) when
 *   the user switches tabs, so in-page state + scroll position survive a
 *   round-trip between tabs.
 * - Restores the cached scroll position when returning to a tab.
 *
 * The scroll cache is module-level so `clearTabScrollCache(route)` can reset a
 * tab from the outside — used by the bottom nav's double-tap-to-root gesture
 * so the cached (possibly deep) scroll offset is discarded on reset.
 */

const scrollCache = {};

export function clearTabScrollCache(route) {
  if (route) delete scrollCache[route];
}

export function useTabKeepAlive(routes, location) {
  const isTab = (p) => routes.includes(p);

  const [mountedTabs, setMountedTabs] = useState(() =>
    isTab(location.pathname) ? [location.pathname] : []
  );
  const prevPath = useRef(location.pathname);

  // Lazy-mount visited tab routes.
  useEffect(() => {
    if (isTab(location.pathname)) {
      setMountedTabs((prev) =>
        prev.includes(location.pathname) ? prev : [...prev, location.pathname]
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, routes]);

  // Persist scroll on leave, restore on return.
  useEffect(() => {
    const prev = prevPath.current;
    const next = location.pathname;
    if (prev === next) return;

    if (routes.includes(prev)) scrollCache[prev] = window.scrollY;
    prevPath.current = next;

    if (routes.includes(next) && scrollCache[next] != null) {
      requestAnimationFrame(() => window.scrollTo(0, scrollCache[next]));
    } else {
      window.scrollTo(0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, routes]);

  return { mountedTabs };
}