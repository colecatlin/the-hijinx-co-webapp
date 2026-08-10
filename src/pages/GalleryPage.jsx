import React, { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import MobileBackHeader from '@/components/shared/MobileBackHeader';
import { Skeleton } from '@/components/ui/skeleton';
import SeoMeta, { SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import MediaGallery from '@/components/media/MediaGallery';
import { Layers, ArrowLeft } from 'lucide-react';

export default function GalleryPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const entityType = searchParams.get('entity_type') || slug?.split('-')[0] || 'event';
  const entityId = searchParams.get('entity_id');
  const entityName = searchParams.get('entity_name') || slug;

  // Determine gallery source
  const isEntityGallery = !!entityId;

  // For entity galleries, fetch all public assets for the entity
  const { data: galleryData, isLoading } = useQuery({
    queryKey: ['galleryPage', entityType, entityId, slug],
    queryFn: async () => {
      if (isEntityGallery) {
        // Fetch assets via AssetLink
        let assets = [];
        try {
          const links = await base44.entities.AssetLink.filter({
            subject_type: entityType === 'racer' ? 'driver' : entityType,
            subject_id: entityId,
          });
          const assetIds = [...new Set(links.map(l => l.asset_id).filter(Boolean))];
          if (assetIds.length > 0) {
            const allAssets = await base44.entities.MediaAsset.list();
            assets = allAssets.filter(a => assetIds.includes(a.id) && isAssetPublic(a));
          }
        } catch {}

        // Also via PublishTarget
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
              const ptAssets = allAssets.filter(a => assetIds.includes(a.id) && isAssetPublic(a) && !assets.find(la => la.id === a.id));
              assets = [...assets, ...ptAssets];
            }
          }
        } catch {}

        // Event-captured assets
        if (entityType === 'event') {
          try {
            const eventAssets = await base44.entities.MediaAsset.filter({ captured_at_event_id: entityId });
            assets = [...assets, ...eventAssets.filter(a => isAssetPublic(a) && !assets.find(la => la.id === a.id))];
          } catch {}
        }

        return {
          title: `${entityName || entityType} Gallery`,
          items: assets.map(a => ({
            id: a.id,
            title: a.title || a.file_name,
            description: a.description,
            thumbnail_url: a.thumbnail_url || a.file_url,
            file_url: a.file_url,
            asset_type: a.asset_type,
            captured_date: a.captured_date,
          })),
        };
      }

      // Fallback: featured gallery (all featured assets)
      try {
        const featured = await base44.entities.MediaAsset.filter({ featured_on_media_home: true });
        return {
          title: 'Featured Gallery',
          items: featured.filter(isAssetPublic).map(a => ({
            id: a.id,
            title: a.title || a.file_name,
            description: a.description,
            thumbnail_url: a.thumbnail_url || a.file_url,
            file_url: a.file_url,
            asset_type: a.asset_type,
          })),
        };
      } catch {
        return { title: 'Gallery', items: [] };
      }
    },
    enabled: !!slug || !!entityId,
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
      <PageShell>
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="aspect-square" />)}
          </div>
        </div>
      </PageShell>
    );
  }

  const title = galleryData?.title || 'Gallery';
  const items = galleryData?.items || [];

  return (
    <PageShell>
      <SeoMeta
        title={`${title} — HIJINX Galleries`}
        description={`Photo and video gallery: ${title}`}
        image={items[0]?.thumbnail_url || SITE_FALLBACK_IMAGE}
      />

      <MobileBackHeader title={title} />

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center gap-2 mb-4 text-xs text-foreground-quiet">
          <Link to="/MediaHome" className="hover:text-motion transition-colors">Media</Link>
          <span>/</span>
          <span>Galleries</span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Layers className="w-5 h-5 text-motion" />
          <h1 className="text-2xl font-black text-foreground">{title}</h1>
          <span className="text-sm text-foreground-quiet">({items.length} items)</span>
        </div>

        {items.length > 0 ? (
          <MediaGallery items={items} title="All Items" />
        ) : (
          <div className="text-center py-16 border border-dashed border-divider rounded-lg">
            <Layers className="w-10 h-10 mx-auto mb-3 text-foreground-quiet" />
            <p className="text-sm text-foreground-quiet">No public media in this gallery yet.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}