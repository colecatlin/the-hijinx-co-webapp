import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import MobileBackHeader from '@/components/shared/MobileBackHeader';
import { Skeleton } from '@/components/ui/skeleton';
import SeoMeta, { SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import MediaHero from '@/components/media/MediaHero';
import MediaSidebar from '@/components/media/MediaSidebar';
import MediaMetadata from '@/components/media/MediaMetadata';
import MediaAttachments from '@/components/media/MediaAttachments';
import MediaSharePanel from '@/components/media/MediaSharePanel';
import PublisherBadge from '@/components/media/PublisherBadge';
import MediaGallery from '@/components/media/MediaGallery';
import RelatedMediaGrid from '@/components/media/RelatedMediaGrid';
import { FileText, ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';

export default function MediaProfilePage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const mediaId = searchParams.get('id');
  const mediaType = searchParams.get('type') || 'article';
  const identifier = slug || mediaId;

  const { data: experience, isLoading } = useQuery({
    queryKey: ['mediaExperience', mediaType, identifier],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getMediaExperience', {
          media_type: mediaType,
          slug: slug,
          id: mediaId,
        });
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!identifier,
  });

  useEffect(() => {
    if (experience?.id) {
      base44.analytics.track({ eventName: 'media_view', properties: { mediaId: experience.id, mediaType: experience.media_type, title: experience.title } });
    }
  }, [experience?.id]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageShell>
    );
  }

  if (!experience || experience.not_found) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-foreground-quiet" />
          <h1 className="text-xl font-bold text-foreground mb-2">Media Not Found</h1>
          <p className="text-sm text-foreground-quiet mb-6">This media item may have been removed or is not publicly visible.</p>
          <Link to="/MediaHome" className="text-sm text-motion hover:underline">← Back to Media Home</Link>
        </div>
      </PageShell>
    );
  }

  const isArticle = experience.media_type === 'article' || experience.media_type === 'story';

  return (
    <PageShell>
      <SeoMeta
        title={experience.seo?.title || `${experience.title} — HIJINX Media`}
        description={experience.seo?.description || experience.description || ''}
        image={experience.seo?.image || experience.hero_image || SITE_FALLBACK_IMAGE}
      />

      <MobileBackHeader title={experience.title} />

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-xs text-foreground-quiet">
          <Link to="/MediaHome" className="hover:text-motion transition-colors">Media</Link>
          <span>/</span>
          <span className="capitalize">{experience.media_type}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <MediaHero media={experience} publisher={experience.publisher} />

            {/* Article body */}
            {isArticle && experience.body && (
              <div className="editorial-body prose max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(experience.body) }}
              />
            )}

            {/* Non-article: show file */}
            {!isArticle && experience.file_url && (
              <div className="rounded-lg overflow-hidden border border-divider">
                {experience.asset_type === 'video' || experience.media_type === 'video' ? (
                  <video src={experience.file_url} poster={experience.hero_image} controls className="w-full max-h-[60vh]" />
                ) : experience.asset_type === 'audio' || experience.media_type === 'audio' ? (
                  <audio src={experience.file_url} controls className="w-full" />
                ) : (
                  <img src={experience.file_url} alt={experience.title} className="w-full max-h-[60vh] object-contain" />
                )}
              </div>
            )}

            {/* Gallery items */}
            {experience.gallery_items?.length > 0 && (
              <MediaGallery items={experience.gallery_items} title="More from this Event" />
            )}

            {/* Related media */}
            {experience.related_entities?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary mb-3">Related Entities</h3>
                <div className="flex flex-wrap gap-2">
                  {experience.related_entities.map((ent, idx) => (
                    ent.profile_url ? (
                      <Link key={idx} to={ent.profile_url}
                        className="px-3 py-1.5 rounded-lg border border-divider hover:border-motion transition-colors text-sm text-foreground-secondary hover:text-motion">
                        <span className="text-[9px] uppercase tracking-widest text-foreground-quiet mr-1.5">{ent.entity_type}</span>
                        {ent.entity_name}
                      </Link>
                    ) : (
                      <span key={idx} className="px-3 py-1.5 rounded-lg border border-divider text-sm text-foreground-secondary">
                        <span className="text-[9px] uppercase tracking-widest text-foreground-quiet mr-1.5">{ent.entity_type}</span>
                        {ent.entity_name}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <PublisherBadge publisher={experience.publisher} size="lg" />
            <MediaSidebar
              media={experience}
              publisher={experience.publisher}
              author={experience.author}
              relatedEntities={experience.related_entities}
            />
            <MediaMetadata media={experience} />
            <MediaAttachments media={experience} />
            <MediaSharePanel media={experience} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}