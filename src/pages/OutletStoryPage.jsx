import React, { useEffect } from 'react';
import SeoMeta, { SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin, Tag } from 'lucide-react';
import DOMPurify from 'dompurify';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import AdvertisementCard from '@/components/outlet/AdvertisementCard';

/**
 * OutletStoryPage
 *
 * Canonical route: /story/:slug
 * Legacy fallback:  /OutletStoryPage?id=...  (transitional — redirects to slug route)
 *
 * Resolution order:
 *  1. useParams().slug  → fetch by slug (canonical)
 *  2. ?id= query param  → fetch by id, then redirect to /story/:slug if slug exists
 */
export default function OutletStoryPage() {
  const { slug: slugParam } = useParams();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const idParam = urlParams.get('id');

  // ── Primary: slug-based lookup ──────────────────────────────────────────
  const { data: storyBySlug, isLoading: loadingBySlug } = useQuery({
    queryKey: ['storyBySlug', slugParam],
    queryFn: () => base44.entities.OutletStory.filter({ slug: slugParam }).then(r => r[0] || null),
    enabled: !!slugParam,
  });

  // ── Legacy: id-based lookup (transitional fallback) ─────────────────────
  const { data: storyById, isLoading: loadingById } = useQuery({
    queryKey: ['storyById', idParam],
    queryFn: () => base44.entities.OutletStory.filter({ id: idParam }).then(r => r[0] || null),
    enabled: !slugParam && !!idParam,
  });

  // ── If we loaded by id and the story has a slug, redirect to canonical URL ─
  useEffect(() => {
    if (storyById?.slug) {
      navigate(`/story/${storyById.slug}`, { replace: true });
    }
  }, [storyById?.slug, navigate]);

  const story = storyBySlug || storyById || null;
  const isLoading = slugParam ? loadingBySlug : loadingById;

  const { data: ads = [] } = useQuery({
    queryKey: ['advertisements'],
    queryFn: () => base44.entities.Advertisement.filter({ status: 'published' }),
  });

  useEffect(() => {
    if (story) Analytics.outletStoryView(story.id, story.title, story.category);
  }, [story?.id]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-3xl mx-auto px-6 py-20">
          <Skeleton className="h-6 w-20 mb-6" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-8" />
          <Skeleton className="h-80 w-full mb-8" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </PageShell>
    );
  }

  if (!story) {
    return (
      <PageShell>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <p className="text-gray-400">Story not found.</p>
          <Link to={createPageUrl('OutletHome')} className="text-sm underline mt-4 inline-block">
            Back to The Outlet
          </Link>
        </div>
      </PageShell>
    );
  }

  const storyDesc = story.subtitle || (story.body || '').replace(/<[^>]*>/g, '').substring(0, 160);
  const storyImg  = story.cover_image || SITE_FALLBACK_IMAGE;

  return (
    <PageShell>
      <SeoMeta
        title={story.title}
        description={storyDesc}
        image={storyImg}
        type="article"
      />
      <div className={ads?.length > 0 ? "max-w-7xl mx-auto px-6 py-12 md:py-20 flex gap-8" : ""}>
        {ads?.length > 0 && (
          <aside className="hidden lg:block space-y-8 flex-shrink-0 w-[12%]">
            {ads.filter((_, i) => i % 2 === 0).map((ad) => (
              <AdvertisementCard key={ad.id} ad={ad} />
            ))}
          </aside>
        )}
        <article className={ads?.length > 0 ? "flex-1 max-w-3xl" : "max-w-3xl mx-auto px-6 py-12 md:py-20"}>
          <Link
            to={createPageUrl('OutletHome')}
            className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-8 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to The Outlet
          </Link>

          {story.cover_image && (
            <div className="mb-8">
              <img src={story.cover_image} alt={story.title} className="w-full" />
              {(story.location_city || story.location_state || story.location_country) && (
                <div className="mt-3">
                  <span className="flex items-center gap-1 text-xs font-bold text-black">
                    <MapPin className="w-3 h-3" />
                    {[story.location_city, story.location_state, story.location_country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          <span className="font-mono text-[10px] tracking-[0.2em] text-gray-400 uppercase block">
            {story.category}
          </span>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2 leading-[1.05]">
            {story.title}
          </h1>

          {story.subtitle && (
            <p className="text-lg text-gray-500 mt-4">{story.subtitle}</p>
          )}

          <div className="mt-6 pb-8 border-b border-gray-200">
            <div className="flex flex-col gap-2 mb-4">
              {story.published_date && (
                <span className="text-xs text-gray-400">{format(new Date(story.published_date), 'MMMM d, yyyy · h:mm a')}</span>
              )}
              {story.author && (
                <span className="text-xs text-gray-400">Published by {story.author}</span>
              )}
              {story.photo_credit && (
                <span className="text-xs text-gray-400">Photo by {story.photo_credit}</span>
              )}
            </div>
            <SocialShareButtons
              url={window.location.href}
              title={story.title}
              description={story.subtitle || story.body?.substring(0, 150)}
              type="inline"
            />
          </div>

          <div className="editorial-body mt-10" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story.body || '') }} />

          {story.tags?.length > 0 && (
            <div className="flex items-center gap-2 mt-12 pt-8 border-t border-gray-200">
              <Tag className="w-3 h-3 text-gray-400" />
              {story.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 text-[10px] font-mono tracking-wider bg-gray-100 text-gray-500 uppercase">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {ads?.length > 0 && (
          <aside className="hidden lg:block space-y-8 flex-shrink-0 w-[12%]">
            {ads.filter((_, i) => i % 2 === 1).map((ad) => (
              <AdvertisementCard key={ad.id} ad={ad} />
            ))}
          </aside>
        )}
      </div>
    </PageShell>
  );
}