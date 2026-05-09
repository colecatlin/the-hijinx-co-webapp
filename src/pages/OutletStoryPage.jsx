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
import { ArrowLeft, MapPin, Tag, User, Calendar } from 'lucide-react';
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

  const { data: linkedDriver } = useQuery({
    queryKey: ['storyDriver', story?.driver_id],
    queryFn: () => base44.entities.Driver.filter({ id: story.driver_id }).then(r => r[0] || null),
    enabled: !!story?.driver_id,
  });

  const { data: linkedEvent } = useQuery({
    queryKey: ['storyEvent', story?.event_id],
    queryFn: () => base44.entities.Event.filter({ id: story.event_id }).then(r => r[0] || null),
    enabled: !!story?.event_id,
  });

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
    <PageShell style={{ backgroundImage: 'url(https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/44b72608e_TheOutletv1.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
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
            className="inline-flex items-center gap-1 text-xs font-mono text-white/50 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to The Outlet
          </Link>

          {story.cover_image && (
            <div className="mb-8">
              <img src={story.cover_image} alt={story.title} className="w-full" />
              {(story.location_city || story.location_state || story.location_country) && (
                <div className="mt-3">
                  <span className="flex items-center gap-1 text-xs font-bold text-white/60">
                    <MapPin className="w-3 h-3" />
                    {[story.location_city, story.location_state, story.location_country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          <span className="font-mono text-[10px] tracking-[0.2em] text-white/50 uppercase block">
            {story.category}
          </span>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2 leading-[1.05] text-white">
            {story.title}
          </h1>

          {story.subtitle && (
            <p className="text-lg text-white/65 mt-4">{story.subtitle}</p>
          )}

          {/* Context links — driver / event */}
          {(linkedDriver || linkedEvent) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {linkedDriver && (
                <Link
                  to={`/drivers/${linkedDriver.canonical_slug || linkedDriver.slug || linkedDriver.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs font-medium text-white/75 transition-colors"
                >
                  <User className="w-3 h-3" />
                  Featuring {linkedDriver.first_name} {linkedDriver.last_name}
                </Link>
              )}
              {linkedEvent && (
                <Link
                  to={`${createPageUrl('EventProfile')}?id=${linkedEvent.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs font-medium text-white/75 transition-colors"
                >
                  <Calendar className="w-3 h-3" />
                  From {linkedEvent.name}
                </Link>
              )}
            </div>
          )}

          <div className="mt-6 pb-8 border-b border-white/15">
            <div className="flex flex-col gap-2 mb-4">
              {story.published_date && (
                <span className="text-xs text-white/45">{format(new Date(story.published_date), 'MMMM d, yyyy · h:mm a')}</span>
              )}
              {story.author && (
                <span className="text-xs text-white/45">Published by {story.author}</span>
              )}
              {story.photo_credit && (
                <span className="text-xs text-white/45">Photo by {story.photo_credit}</span>
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
            <div className="flex items-center gap-2 mt-12 pt-8 border-t border-white/15">
              <Tag className="w-3 h-3 text-white/40" />
              {story.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 text-[10px] font-mono tracking-wider bg-white/10 text-white/55 uppercase">
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