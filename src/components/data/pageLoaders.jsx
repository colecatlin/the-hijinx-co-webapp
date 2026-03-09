/**
 * components/data/pageLoaders.js
 *
 * Page-level data loader contract.
 *
 * Re-exports the five public profile page loaders from the canonical
 * publicPageDataApi module so callers only need one import path.
 *
 * Usage:
 *   import { loadDriverProfilePage } from '@/components/data/pageLoaders';
 *
 * Each loader returns a stable payload object for its page.
 * They tolerate missing linked records and never throw to UI callers.
 */

export {
  getDriverProfileData as loadDriverProfilePage,
  getTeamProfileData   as loadTeamProfilePage,
  getTrackProfileData  as loadTrackProfilePage,
  getSeriesDetailData  as loadSeriesDetailPage,
  getEventProfileData  as loadEventProfilePage,
} from '@/components/entities/publicPageDataApi';