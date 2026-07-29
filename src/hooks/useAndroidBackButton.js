import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Graceful Android hardware back-button handling for WebView app wrappers.
 *
 * - Seeds an in-app history entry on mount so a single back press from a
 *   deep-link entry stays inside the app instead of immediately closing it.
 * - Listens for `popstate` (the OS back button in a WebView triggers it).
 *   At a top-level route (`/` or `/Home`), the WebView is allowed to exit
 *   gracefully — no interception. Deeper in-app navigation is handled by
 *   React Router's own history integration, so we intentionally do not
 *   fight the browser history here.
 */
export function useAndroidBackButton() {
  const location = useLocation();

  // Seed a sentinel history entry once on mount.
  useEffect(() => {
    if (!window.history.state || !window.history.state.__hijinx) {
      window.history.pushState({ __hijinx: true }, '', window.location.href);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Observe popstate to detect the hardware back button.
  useEffect(() => {
    const onPopState = () => {
      const isRoot =
        window.location.pathname === '/' || window.location.pathname === '/Home';
      // At root: allow graceful WebView exit.
      // Elsewhere: React Router handles in-app back navigation.
      if (isRoot) {
        // No-op — let the OS close the WebView on the next back press.
      }
    };
    window.addEventListener('popstate', onPopState, { passive: true });
    return () => window.removeEventListener('popstate', onPopState);
  }, [location.pathname]);
}

export default useAndroidBackButton;