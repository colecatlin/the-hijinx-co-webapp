import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

/**
 * useHome1Config — loads Home configuration once for the public Home1 page.
 *
 * - Public users: receive published config only (backend enforces this)
 * - Admin preview (?preview=home-draft): receive draft config (backend only
 *   returns draft to admins — non-admins get published, so preview is secure)
 * - Returns { config, isLoading, error, isPreview }
 * - config is null while loading; section components fall back to their own
 *   hardcoded defaults (which match the current visible page) so there is
 *   no flash/reflow
 */
export function useHome1Config() {
  const location = useLocation();
  const isPreview = new URLSearchParams(location.search).get('preview') === 'home-draft';

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['home1Settings', isPreview ? 'draft' : 'published'],
    queryFn: () => base44.functions.invoke('getHome1Settings'),
    staleTime: 5 * 60 * 1000,
  });

  const body = response?.data || response;

  // Preview: use draft if available (admin only — backend controls access)
  // Public: use published
  const config = isPreview && body?.draft
    ? body.draft
    : (body?.published || null);

  return { config, isLoading, error, isPreview };
}