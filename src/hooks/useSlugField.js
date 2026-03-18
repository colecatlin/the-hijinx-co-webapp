/**
 * useSlugField.js
 *
 * Shared hook for slug auto-population in create forms.
 * Uses the exact same normalization logic as the backend (normalizeEntityIdentity).
 *
 * Usage:
 *   const { slug, setSlugManually, syncSlugFromSource } = useSlugField(initialSlug);
 *
 *   - Call syncSlugFromSource(sourceValue) when the source field changes
 *   - Call setSlugManually(value) when the user edits the slug field directly
 *   - After setSlugManually, auto-sync stops for this session (manual wins)
 */
import { useState, useCallback } from 'react';

/**
 * generateEntitySlug — identical to backend normalizeEntityIdentity.generateEntitySlug
 * DO NOT change this without also updating the backend helper.
 */
export function generateEntitySlug(text) {
  if (!text) return '';
  const slug = text.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || '';
}

/**
 * useSlugField(initialSlug)
 *
 * @param {string} initialSlug - Pre-existing slug (edit mode) or '' (create mode)
 * @returns {{ slug, isManual, syncSlugFromSource, setSlugManually }}
 */
export function useSlugField(initialSlug = '') {
  const [slug, setSlug] = useState(initialSlug);
  const [isManual, setIsManual] = useState(!!initialSlug); // lock auto-sync if editing existing

  // Called when source field (name/title/etc) changes — only updates if user hasn't manually overridden
  const syncSlugFromSource = useCallback((sourceValue) => {
    if (isManual) return;
    setSlug(generateEntitySlug(sourceValue));
  }, [isManual]);

  // Called when user directly edits the slug input
  const setSlugManually = useCallback((value) => {
    // Normalize on type but allow partial input (don't strip mid-type)
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(normalized);
    setIsManual(true);
  }, []);

  return { slug, isManual, syncSlugFromSource, setSlugManually };
}