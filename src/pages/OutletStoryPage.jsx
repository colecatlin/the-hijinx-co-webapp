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

const OUTLET_BG = 'url(https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/506952c44_THEOUTLETBACKGROUND.png)';
const TEAL = '#1DA1A1';

// Light frosted glass panel
const lightGlass = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.95)',
  boxShadow: '0 8px 48px rgba(0,0,0,0.2)',
  borderRadius: '1rem',
};

const bgStyle = {
  backgroundImage: OUTLET_BG,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
};

/**
 * OutletStoryPage
 * Canonical route: /story/:slug
 * Legacy fallback:  /OutletStoryPage?id=...
 */
export default function OutletStoryPage() {
  const { slug: slugParam } = useParams();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const idParam = urlParams.get('id');

  const { data: storyBySlug, isLoading: loadingBySlug } = useQuery({
    queryKey: ['storyBySlug', slugParam],
    queryFn: () => base44.entities.OutletStory.filter({ slug: slugParam }).then(r => r[0] || null),
    enabled: !!slugParam,
  });

  const { data: storyById, isLoading: loadingById } = useQuery({
    queryKey: ['storyById', idParam],
    queryFn: () => base44.entities.OutletStory.filter({ id: idParam }).then(r => r[0] || null),
    enabled: !slugParam && !!idParam,
  });

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
      <PageShell style={bgStyle}>
        <div style={{ background: 'rgba(4,8,8,0.45)', minHeight: '100vh' }}>
          <div className="max-w-3xl mx-auto px-6 py-20">
            <div style={lightGlass} className="p-8 space-y-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!story) {
    return (
      <PageShell style={bgStyle}>
        <div style={{ background: 'rgba(4,8,8,0.45)', minHeight: '100vh' }}>
          <div className="max-w-3xl mx-auto px-6 py-20 text-center">
            <div style={lightGlass} className="p-12">
              <p className="font-bold text-gray-800 mb-3">Story not found.</p>
              <Link to={createPageUrl('OutletHome')} className="text-sm transition-colors font-medium" style={{ color: TEAL }}>
                ← Back to The Outlet
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  const storyDesc = story.subtitle || (story.body || '').replace(/<[^>]*>/g, '').substring(0, 160);
  const storyImg = story.cover_image || SITE_FALLBACK_IMAGE;

  return (
    <PageShell style={bgStyle}>
      <SeoMeta title={story.title} description={storyDesc} image={storyImg} type="article" />

      <div style={{ background: 'rgba(4,8,8,0.45)', minHeight: '100vh' }}>
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 ${ads?.length > 0 ? 'flex gap-8' : ''}`}>

          {/* Left ad sidebar */}
          {ads?.length > 0 && (
            <aside className="hidden lg:block space-y-8 flex-shrink-0 w-[12%]">
              {ads.filter((_, i) => i % 2 === 0).map((ad) => (
                <AdvertisementCard key={ad.id} ad={ad} />
              ))}
            </aside>
          )}

          {/* Main article — light glass panel */}
          <article className={ads?.length > 0 ? 'flex-1 max-w-3xl' : 'max-w-3xl mx-auto w-full'}>
            <div style={lightGlass} className="overflow-hidden">
              {/* Top teal accent line */}
              <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${TEAL}, transparent)` }} />

              <div className="p-6 md:p-10">
                {/* Back link */}
                <Link to={createPageUrl('OutletHome')}
                  className="inline-flex items-center gap-1.5 text-xs font-mono mb-8 transition-colors text-gray-400 hover:text-gray-800"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to The Outlet
                </Link>

                {/* Cover image */}
                {story.cover_image && (
                  <div className="mb-8 rounded-xl overflow-hidden">
                    <img src={story.cover_image} alt={story.title} className="w-full" />
                    {(story.location_city || story.location_state || story.location_country) && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" style={{ color: TEAL }} />
                        {[story.location_city, story.location_state, story.location_country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Category */}
                <span className="font-mono text-[10px] tracking-[0.3em] uppercase block mb-2 font-bold" style={{ color: TEAL }}>
                  {story.primary_category}{story.sub_category ? ` · ${story.sub_category}` : ''}
                </span>

                {/* Title */}
                <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.05] text-gray-900">
                  {story.title}
                </h1>

                {/* Subtitle */}
                {story.subtitle && (
                  <p className="text-lg mt-4 leading-relaxed text-gray-500">{story.subtitle}</p>
                )}

                {/* Context links */}
                {(linkedDriver || linkedEvent) && (
                  <div className="flex flex-wrap gap-2 mt-5">
                    {linkedDriver && (
                      <Link
                        to={`/drivers/${linkedDriver.canonical_slug || linkedDriver.slug || linkedDriver.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <User className="w-3 h-3" style={{ color: TEAL }} />
                        Featuring {linkedDriver.first_name} {linkedDriver.last_name}
                      </Link>
                    )}
                    {linkedEvent && (
                      <Link
                        to={`${createPageUrl('EventProfile')}?id=${linkedEvent.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <Calendar className="w-3 h-3" style={{ color: TEAL }} />
                        From {linkedEvent.name}
                      </Link>
                    )}
                  </div>
                )}

                {/* Meta / share */}
                <div className="mt-6 pb-6 border-b border-gray-200">
                  <div className="flex flex-col gap-1 mb-4">
                    {story.published_date && (
                      <span className="text-xs font-mono text-gray-400">
                        {format(new Date(story.published_date), 'MMMM d, yyyy · h:mm a')}
                      </span>
                    )}
                    {story.author && (
                      <span className="text-xs text-gray-500">By {story.author}</span>
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

                {/* Body — dark text on light glass, uses editorial-body styles from globals.css */}
                <div className="editorial-body mt-8"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story.body || '') }}
                />

                {/* Tags */}
                {story.tags?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-12 pt-6 border-t border-gray-200">
                    <Tag className="w-3 h-3 text-gray-400" />
                    {story.tags.map((tag) => (
                      <span key={tag}
                        className="px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase bg-gray-100 text-gray-600 border border-gray-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* Right ad sidebar */}
          {ads?.length > 0 && (
            <aside className="hidden lg:block space-y-8 flex-shrink-0 w-[12%]">
              {ads.filter((_, i) => i % 2 === 1).map((ad) => (
                <AdvertisementCard key={ad.id} ad={ad} />
              ))}
            </aside>
          )}
        </div>
      </div>
    </PageShell>
  );
}