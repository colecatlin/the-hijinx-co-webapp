import React, { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * UnsavedChangesGuard — warns before discarding unsaved changes.
 *
 * Uses react-router's useBlocker for in-app navigation and the beforeunload
 * event for tab close / hard refresh. Only activates when isDirty is true.
 *
 * Returns null — render once near the top of the page.
 */
export default function UnsavedChangesGuard({ isDirty }) {
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = window.confirm('You have unsaved changes. Leave without saving?');
      if (proceed) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);

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