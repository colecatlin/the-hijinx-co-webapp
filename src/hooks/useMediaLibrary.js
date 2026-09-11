import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useMediaLibrary — shared React Query hook for the Media Library.
 *
 * Fetches LibraryAsset records with server-side filtering (is_archived,
 * asset_type) and client-side search + sort. Used by both the Media
 * Library management page and the MediaLibraryPicker so cached results
 * are shared.
 *
 * @param {Object} opts
 * @param {string} opts.search — search across title, filename, alt_text, tags
 * @param {string} opts.asset_type — 'all' | 'image' | 'video' | 'document' | 'other'
 * @param {string} opts.sort — 'newest' | 'oldest' | 'name'
 * @param {boolean} opts.is_archived — show archived assets (default false)
 * @param {number} opts.limit — max items to return (default 48)
 */
export function useMediaLibrary({
  search = '',
  asset_type = 'all',
  sort = 'newest',
  is_archived = false,
  limit = 48,
} = {}) {
  return useQuery({
    queryKey: ['libraryAssets', { search, asset_type, sort, is_archived, limit }],
    queryFn: async () => {
      const query = { is_archived };
      if (asset_type !== 'all') query.asset_type = asset_type;
      const items = await base44.entities.LibraryAsset.filter(query, '-created_date', 200);

      let filtered = items || [];

      // Client-side search across title, filename, alt_text, tags
      if (search && search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.title?.toLowerCase().includes(q) ||
            a.filename?.toLowerCase().includes(q) ||
            a.alt_text?.toLowerCase().includes(q) ||
            a.tags?.some((t) => t.toLowerCase().includes(q))
        );
      }

      // Client-side sort (server already sorts by -created_date for 'newest')
      if (sort === 'oldest') {
        filtered = [...filtered].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      } else if (sort === 'name') {
        filtered = [...filtered].sort((a, b) =>
          (a.title || a.filename || '').localeCompare(b.title || b.filename || '')
        );
      }

      return filtered.slice(0, limit);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * useInvalidateMediaLibrary — returns a function to invalidate all
 * media library queries. Call after upload, metadata update, or archive.
 */
export function useInvalidateMediaLibrary() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['libraryAssets'] });
}