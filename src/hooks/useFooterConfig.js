import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

/**
 * useFooterConfig — loads Footer configuration once for the public Footer.
 *
 * - Public users: receive published config only (backend enforces this)
 * - Admin preview (?preview=footer-draft): receive draft config
 * - Returns { config, isLoading, error, isPreview }
 * - config is null while loading; Footer falls back to hardcoded defaults
 */
export function useFooterConfig() {
  const location = useLocation();
  const isPreview = new URLSearchParams(location.search).get('preview') === 'footer-draft';

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['footerSettings', isPreview ? 'draft' : 'published'],
    queryFn: () => base44.functions.invoke('getFooterSettings'),
    staleTime: 5 * 60 * 1000,
  });

  const body = response?.data || response;
  const config = isPreview && body?.draft ? body.draft : (body?.published || null);

  return { config, isLoading, error, isPreview };
}