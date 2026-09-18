import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

/**
 * useSeoConfig — loads SEO configuration for the public SeoMeta component.
 *
 * - Public users: receive published config only (backend enforces this)
 * - Admin preview (?preview=seo-draft): receive draft config (backend only
 *   returns draft to admins — non-admins get published, so preview is secure)
 * - Returns { config, isLoading, error, isPreview }
 * - config is null while loading or if no record exists; SeoMeta falls back
 *   to hardcoded constants so there is never blank metadata.
 *
 * Cached with 5min staleTime — one query shared across all SeoMeta instances
 * via React Query's cache (no N+1 queries).
 */
export function useSeoConfig() {
  const location = useLocation();
  const isPreview = new URLSearchParams(location.search).get('preview') === 'seo-draft';

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['seoSettings', isPreview ? 'draft' : 'published'],
    queryFn: () => base44.functions.invoke('getSeoSettings'),
    staleTime: 5 * 60 * 1000,
  });

  const body = response?.data || response;

  // Preview: use draft if available (admin only — backend controls access)
  // Public: use published (may be null if no record exists)
  const config = isPreview && body?.draft
    ? body.draft
    : (body?.published || null);

  return { config, isLoading, error, isPreview };
}