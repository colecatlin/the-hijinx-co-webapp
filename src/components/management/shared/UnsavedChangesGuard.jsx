import React, { useEffect } from 'react';

/**
 * UnsavedChangesGuard — warns before discarding unsaved changes on
 * tab close / hard refresh via the beforeunload event.
 *
 * The app uses BrowserRouter (not a data router), so react-router's
 * useBlocker is unavailable. Only activates when isDirty is true.
 *
 * Returns null — render once near the top of the page.
 */
export default function UnsavedChangesGuard({ isDirty }) {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return null;
}