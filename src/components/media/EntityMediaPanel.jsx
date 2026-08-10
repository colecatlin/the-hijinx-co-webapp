import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Image as ImageIcon, Video, Music, Star, Clock, TrendingUp, Layers } from 'lucide-react';
import MediaGallery from '@/components/media/MediaGallery';
import RelatedMediaGrid from '@/components/media/RelatedMediaGrid';
import FeaturedMedia from '@/components/media/FeaturedMedia';
import MediaTimeline from '@/components/media/MediaTimeline';

/**
 * EntityMediaPanel — Phase 16
 * Unified media aggregation component for entity profile pages.
 * Fetches all public media (articles, photos, videos, podcasts) linked to
 * an entity and renders them in a tabbed interface.
 *
 * @param {string} entityType - driver, team, track, series, event, vehicle
 * @param {string} entityId - Entity ID
 * @param {string} entityName - Entity name (for tag-based matching)
 */
export default function EntityMediaPanel({ entityType, entityId, entityName }) {
  const [activeTab, setActiveTab] = useState('all');

  const { data: media, isLoading } = useQuery({
    queryKey: ['entityMedia', entityType, entityId],
    queryFn: async () => {
      // Fetch OutletStories linked to this entity
      let stories = [];
      try {
        if (entityType === 'driver' || entityType === 'racer') {
          stories = await base44.entities.OutletStory.filter({ driver_id: entityId, status: 'published' }, '-published_date', 50);
        } else if (entityType === 'event') {
          stories = await base44.entities.OutletStory.filter({ event_id: entityId, status: 'published' }, '-published_date', 50);
        }
      } catch {}

      // Tag-based story matching
      if (entityName && stories.length < 12) {
        try {
          const allPublished = await base44.entities.OutletStory.filter({ status: 'published' }, '-published_date', 200);
          const nameLower = entityName.toLowerCase();
          const tagMatches = allPublished.filter(s =>
            !stories.find(ex => ex.id === s.id) &&
            (s.tags?.some(t => t.toLowerCase().includes(nameLower)) ||
             s.title?.toLowerCase().includes(nameLower))
          ).slice(0, 10);
          stories = [...stories, ...tagMatches];
        } catch {}
      }

      // Fetch MediaAssets via AssetLink
      let linkedAssets = [];
      try {
        const links = await base44.entities.AssetLink.filter({
          subject_type: entityType === 'racer' ? 'driver' : entityType,
          subject_id: entityId,
        });
        const assetIds = [...new Set(links.map(l => l.asset_id).filter(Boolean))];
        if (assetIds.length > 0) {
          const allAssets = await base44.entities.MediaAsset.list();
          linkedAssets = allAssets.filter(a => assetIds.includes(a.id) && isAssetPublic(a));
        }
      } catch {}

      // Fetch MediaAssets via PublishTarget
      try {
        const targetTypes = entityType === 'driver' || entityType === 'racer' ? ['driver_gallery'] :
          entityType === 'team' ? ['team_gallery'] :
          entityType === 'track' ? ['track_gallery'] :
          entityType === 'event' ? ['event_recap'] :
          entityType === 'series' ? ['series_feed'] : [];

        for (const tt of targetTypes) {
          const pts = await base44.entities.PublishTarget.filter({ target_type: tt, target_entity_id: entityId, status: 'published' });
          const assetIds = [...new Set(pts.map(p => p.asset_id).filter(Boolean))];
          if (assetIds.length > 0) {
            const allAssets = await base44.entities.MediaAsset.list();
            const ptAssets = allAssets.filter(a => assetIds.includes(a.id) && isAssetPublic(a) && !linkedAssets.find(la => la.id === a.id));
            linkedAssets = [...linkedAssets, ...ptAssets];
          }
        }
      } catch {}

      // Event-captured assets
      if (entityType === 'event') {
        try {
          const eventAssets = await base44.entities.MediaAsset.filter({ captured_at_event_id: entityId });
          linkedAssets = [...linkedAssets, ...eventAssets.filter(a => isAssetPublic(a) && !linkedAssets.find(la => la.id === a.id))];
        } catch {}
      }

      const photos = linkedAssets.filter(a => a.asset_type === 'photo');
      const videos = linkedAssets.filter(a => a.asset_type === 'video');
      const audio = linkedAssets.filter(a => a.asset_type === 'audio');

      const articles = stories.map(s => ({
        id: s.id, slug: s.slug, title: s.title, subtitle: s.subtitle,
        cover_image: s.cover_image, author: s.author, published_date: s.published_date,
        primary_category: s.primary_category, tags: s.tags,
        profile_url: s.slug ? `/story/${s.slug}` : `/OutletStoryPage?id=${s.id}`,
        media_type: 'article',
      }));

      const allItems = [
        ...articles,
        ...linkedAssets.map(a => ({
          id: a.id, title: a.title || a.file_name, description: a.description,
          thumbnail_url: a.thumbnail_url || a.file_url, file_url: a.file_url,
          captured_date: a.captured_date, tags: a.tags,
          profile_url: `/media/${a.id}`, media_type: a.asset_type, asset_type: a.asset_type,
        })),
      ].sort((a, b) => new Date(b.published_date || b.captured_date || 0) - new Date(a.published_date || a.captured_date || 0));

      return {
        articles,
        photos: photos.map(a => ({ id: a.id, title: a.title || a.file_name, thumbnail_url: a.thumbnail_url || a.file_url, file_url: a.file_url, profile_url: `/media/${a.id}`, media_type: 'photo', asset_type: 'photo' })),
        videos: videos.map(a => ({ id: a.id, title: a.title || a.file_name, thumbnail_url: a.thumbnail_url, file_url: a.file_url, profile_url: `/media/${a.id}`, media_type: 'video', asset_type: 'video' })),
        podcasts: audio.map(a => ({ id: a.id, title: a.title || a.file_name, file_url: a.file_url, profile_url: `/media/${a.id}`, media_type: 'audio', asset_type: 'audio' })),
        featured: [
          ...articles.filter(s => s.featured).slice(0, 3),
          ...linkedAssets.filter(a => a.featured_on_media_home || a.featured_on_creator_profile).slice(0, 3).map(a => ({ id: a.id, title: a.title || a.file_name, cover_image: a.thumbnail_url || a.file_url, profile_url: `/media/${a.id}`, media_type: a.asset_type })),
        ],
        allItems,
        stats: {
          articles: articles.length,
          photos: photos.length,
          videos: videos.length,
          podcasts: audio.length,
          total: articles.length + linkedAssets.length,
        },
      };
    },
    enabled: !!entityId,
  });

  const isAssetPublic = (a) => {
    if (!a) return false;
    if (a.status === 'archived' || a.status === 'rejected') return false;
    if (!a.public_access) return false;
    if (a.visibility_scope !== 'public') return false;
    if (a.rights_status === 'revoked') return false;
    return true;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-32 bg-surface-interactive rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-surface-interactive rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!media || media.stats.total === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-divider rounded-lg">
        <Layers className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No media linked to this {entityType} yet.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'all', label: 'All', count: media.stats.total, icon: Layers },
    { id: 'articles', label: 'Articles', count: media.stats.articles, icon: FileText },
    { id: 'photos', label: 'Photos', count: media.stats.photos, icon: ImageIcon },
    { id: 'videos', label: 'Videos', count: media.stats.videos, icon: Video },
    { id: 'podcasts', label: 'Podcasts', count: media.stats.podcasts, icon: Music },
    { id: 'featured', label: 'Featured', count: media.featured.length, icon: Star },
    { id: 'timeline', label: 'Timeline', count: media.allItems.length, icon: Clock },
  ].filter(t => t.count > 0 || t.id === 'all');

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-2">
        {media.stats.articles > 0 && <StatChip icon={FileText} label="Articles" value={media.stats.articles} />}
        {media.stats.photos > 0 && <StatChip icon={ImageIcon} label="Photos" value={media.stats.photos} />}
        {media.stats.videos > 0 && <StatChip icon={Video} label="Videos" value={media.stats.videos} />}
        {media.stats.podcasts > 0 && <StatChip icon={Music} label="Podcasts" value={media.stats.podcasts} />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-divider scrollbar-hide">
        {tabs.map(({ id, label, count, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px"
            style={{
              color: activeTab === id ? 'hsl(var(--motion))' : 'hsl(var(--foreground-quiet))',
              borderColor: activeTab === id ? 'hsl(var(--motion))' : 'transparent',
            }}>
            <Icon className="w-3 h-3" /> {label}
            {count > 0 && <span className="text-[9px] opacity-60">{count}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'all' && (
        <div className="space-y-6">
          {media.featured.length > 0 && <FeaturedMedia items={media.featured} />}
          <RelatedMediaGrid items={media.allItems} title="All Media" />
        </div>
      )}
      {activeTab === 'articles' && <RelatedMediaGrid items={media.articles} title="Articles" />}
      {activeTab === 'photos' && <MediaGallery items={media.photos} title="Photo Gallery" />}
      {activeTab === 'videos' && <MediaGallery items={media.videos} title="Video Gallery" />}
      {activeTab === 'podcasts' && <RelatedMediaGrid items={media.podcasts} title="Podcasts" />}
      {activeTab === 'featured' && <FeaturedMedia items={media.featured} />}
      {activeTab === 'timeline' && <MediaTimeline items={media.allItems} />}
    </div>
  );
}

function StatChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
      <Icon className="w-3 h-3 text-motion" />
      <span className="text-xs font-semibold text-foreground">{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-foreground-quiet">{label}</span>
    </div>
  );
}