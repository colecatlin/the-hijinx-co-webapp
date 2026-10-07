import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { rateLimitRetry } from '@/lib/rateLimitRetry';

/**
 * useNavigationConfig — loads Navigation configuration once for the public
 * Header, MobileMenuDrawer, and MobileBottomNav.
 *
 * - Public users: receive published config only (backend enforces this)
 * - Admin preview (?preview=navigation-draft): receive draft config
 * - Returns { config, isLoading, error, isPreview }
 * - config is null while loading; Layout falls back to hardcoded navigation
 *
 * One React Query key — Header, MobileMenuDrawer, and MobileBottomNav all
 * consume the same cached response. No duplicate requests.
 */
export function useNavigationConfig() {
  const location = useLocation();
  const isPreview = new URLSearchParams(location.search).get('preview') === 'navigation-draft';

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['navigationSettings'],
    queryFn: () => base44.functions.invoke('getNavigationSettings'),
    staleTime: 5 * 60 * 1000,
    ...rateLimitRetry,
  });

  const body = response?.data || response;
  const config = isPreview && body?.draft ? body.draft : (body?.published || null);

  return { config, isLoading, error, isPreview };
}