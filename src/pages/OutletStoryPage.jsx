import React, { useEffect } from 'react';
import SeoMeta, { SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getOutletStoryUrl } from '@/lib/storyUrl';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin, Tag, User, Calendar, ArrowRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import AdvertisementCard from '@/components/outlet/AdvertisementCard';

const OUTLET_CYAN = '#00F5D4';
const LOGO_URL = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/c948034eb_TheOutletO2x.png';

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
    if (storyById?.slug) navigate(`/story/${storyById.slug}`, { replace: true });
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

  const { data: relatedStories = [] } = useQuery({
    queryKey: ['relatedStories', story?.primary_category],
    queryFn: () => base44.entities.OutletStory.filter({ status: 'published', primary_category: story.primary_category }, '-published_date', 5),
    enabled: !!story?.primary_category,
  });

  const { data: ads = [] } = useQuery({
    queryKey: ['advertisements'],
    queryFn: () => base44.entities.Advertisement.filter({ status: 'published' }),
  });

  useEffect(() => {
    if (story) Analytics.outletStoryView(story.id, story.title, story.category);
  }, [story?.id]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ background: '#080808', minHeight: '100vh' }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <Skeleton className="h-4 w-24 mb-10" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <Skeleton className="h-3 w-20 mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <Skeleton className="h-12 w-full mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <Skeleton className="h-12 w-2/3 mb-8" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <Skeleton className="h-72 w-full mb-10" style={{ background: 'rgba(255,255,255,0.06)' }} />
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-4 w-full mb-3" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!story) {
    return (
      <div style={{ background: '#080808', minHeight: '100vh' }}>
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <img src={LOGO_URL} alt="The Outlet" className="w-12 h-12 mx-auto mb-6 opacity-30" />
          <p className="text-white/40 text-sm mb-4">Story not found.</p>
          <Link to={createPageUrl('OutletHome')} className="text-xs font-mono uppercase tracking-widest transition-colors" style={{ color: OUTLET_CYAN }}>
            ← Back to The Outlet
          </Link>
        </div>
      </div>
    );
  }

  const storyDesc = story.subtitle || (story.body || '').replace(/<[^>]*>/g, '').substring(0, 160);
  const storyImg  = story.cover_image || SITE_FALLBACK_IMAGE;
  const related   = relatedStories.filter(s => s.id !== story.id).slice(0, 3);

  return (
    <div style={{ background: '#080808', minHeight: '100vh' }}>
      <SeoMeta title={story.title} description={storyDesc} image={storyImg} type="article" />

      {/* ── MASTHEAD ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-4">
          <Link to={createPageUrl('OutletHome')} className="flex items-center gap-3 group">
            <img src={LOGO_URL} alt="The Outlet" className="w-8 h-8 group-hover:opacity-80 transition-opacity" />
            <div>
              <div className="font-black text-white text-lg tracking-tight uppercase leading-none">The Outlet</div>
              <div className="font-mono text-[8px] tracking-[0.4em] uppercase" style={{ color: OUTLET_CYAN }}>Short Course Off-Road Media</div>
            </div>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className={ads?.length > 0 ? "flex gap-8 py-10 md:py-14" : "py-10 md:py-14"}>
          {/* Left ad rail */}
          {ads?.length > 0 && (
            <aside className="hidden xl:block w-28 flex-shrink-0 space-y-6 pt-2">
              {ads.filter((_, i) => i % 2 === 0).map(ad => <AdvertisementCard key={ad.id} ad={ad} />)}
            </aside>
          )}

          {/* ── ARTICLE ── */}
          <article className="flex-1 max-w-3xl mx-auto">
            {/* Back link */}
            <Link
              to={createPageUrl('OutletHome')}
              className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.3em] mb-10 transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseEnter={e => e.currentTarget.style.color = OUTLET_CYAN}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              <ArrowLeft className="w-3 h-3" /> The Outlet
            </Link>

            {/* Category label */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-4 h-0.5" style={{ background: OUTLET_CYAN }} />
              <span className="font-mono text-[10px] tracking-[0.4em] uppercase" style={{ color: OUTLET_CYAN }}>
                {story.primary_category}
                {story.sub_category && ` · ${story.sub_category}`}
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.02] text-white mb-5">
              {story.title}
            </h1>

            {/* Subtitle */}
            {story.subtitle && (
              <p className="text-lg md:text-xl leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {story.subtitle}
              </p>
            )}

            {/* Meta bar */}
            <div className="flex flex-wrap items-center gap-4 py-5 mb-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {story.author && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
                  <User className="w-3 h-3" style={{ color: OUTLET_CYAN }} />
                  {story.author}
                </span>
              )}
              {story.published_date && (
                <span className="flex items-center gap-1.5 text-xs text-white/35 font-mono">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(story.published_date), 'MMMM d, yyyy')}
                </span>
              )}
              {story.photo_credit && (
                <span className="text-xs text-white/30">Photo: {story.photo_credit}</span>
              )}
              {(story.location_city || story.location_state) && (
                <span className="flex items-center gap-1 text-xs text-white/30">
                  <MapPin className="w-3 h-3" />
                  {[story.location_city, story.location_state].filter(Boolean).join(', ')}
                </span>
              )}
              <div className="ml-auto">
                <SocialShareButtons url={window.location.href} title={story.title} description={story.subtitle || ''} type="inline" />
              </div>
            </div>

            {/* Context links */}
            {(linkedDriver || linkedEvent) && (
              <div className="flex flex-wrap gap-2 mb-8">
                {linkedDriver && (
                  <Link
                    to={`/drivers/${linkedDriver.canonical_slug || linkedDriver.slug || linkedDriver.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                  >
                    <User className="w-3 h-3" style={{ color: OUTLET_CYAN }} />
                    Featuring {linkedDriver.first_name} {linkedDriver.last_name}
                  </Link>
                )}
                {linkedEvent && (
                  <Link
                    to={`${createPageUrl('EventProfile')}?id=${linkedEvent.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                  >
                    <Calendar className="w-3 h-3" style={{ color: OUTLET_CYAN }} />
                    From {linkedEvent.name}
                  </Link>
                )}
              </div>
            )}

            {/* Cover image */}
            {story.cover_image && (
              <div className="mb-10 -mx-0 overflow-hidden relative">
                <img src={story.cover_image} alt={story.title} className="w-full object-cover" style={{ maxHeight: '520px' }} />
                <div className="absolute top-0 left-0 w-0.5 h-full" style={{ background: OUTLET_CYAN }} />
              </div>
            )}

            {/* Body */}
            <div
              className="editorial-body mt-4"
              style={{ color: 'rgba(255,255,255,0.78)' }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story.body || '') }}
            />

            {/* Tags */}
            {story.tags?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-14 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Tag className="w-3 h-3 text-white/30" />
                {story.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 text-[9px] font-mono tracking-[0.3em] uppercase text-white/40" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Share footer */}
            <div className="mt-12 pt-8 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <Link
                to={createPageUrl('OutletHome')}
                className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider transition-colors"
                style={{ color: OUTLET_CYAN }}
              >
                <ArrowLeft className="w-3 h-3" /> All Stories
              </Link>
              <SocialShareButtons url={window.location.href} title={story.title} description={story.subtitle || ''} type="inline" />
            </div>
          </article>

          {/* Right ad rail */}
          {ads?.length > 0 && (
            <aside className="hidden xl:block w-28 flex-shrink-0 space-y-6 pt-2">
              {ads.filter((_, i) => i % 2 === 1).map(ad => <AdvertisementCard key={ad.id} ad={ad} />)}
            </aside>
          )}
        </div>

        {/* ── RELATED STORIES ── */}
        {related.length > 0 && (
          <div className="pb-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-4 py-8 mb-6">
              <div className="w-6 h-0.5" style={{ background: OUTLET_CYAN }} />
              <span className="font-mono text-[10px] tracking-[0.45em] uppercase" style={{ color: OUTLET_CYAN }}>More in {story.primary_category}</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <Link to={createPageUrl('OutletHome')} className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-white/30 hover:text-white transition-colors">
                All Stories <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5">
              {related.map(s => (
                <Link key={s.id} to={getOutletStoryUrl(s)} className="group block" style={{ background: '#0a0a0a' }}>
                  {s.cover_image && (
                    <div className="aspect-[3/2] overflow-hidden">
                      <img src={s.cover_image} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    </div>
                  )}
                  <div className="p-4">
                    <span className="font-mono text-[9px] tracking-[0.35em] uppercase block mb-2" style={{ color: OUTLET_CYAN }}>{s.primary_category}</span>
                    <h4 className="text-sm font-bold text-white/85 group-hover:text-white transition-colors leading-snug">{s.title}</h4>
                    {s.published_date && <span className="text-[10px] text-white/25 font-mono mt-2 block">{format(new Date(s.published_date), 'MMM d, yyyy')}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}