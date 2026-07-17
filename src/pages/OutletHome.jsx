import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getOutletStoryUrl } from '@/lib/storyUrl';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, PenLine } from 'lucide-react';

const OUTLET_CYAN = '#00F5D4';
const LOGO_URL = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/cb38872af_Asset42x.png';

const CATEGORY_MAP = {
  Racing:      ['Race Reports', 'Results', 'Standings', 'Championship Watch', 'Track Profiles'],
  Business:    ['Sponsorship', 'Industry', 'Deals', 'Ownership', 'Expansion'],
  Culture:     ['Grassroots', 'Legacy', 'Fan Experience', 'Opinion', 'Letters'],
  Tech:        ['Engineering', 'Data', 'Setup', 'Safety', 'Rules'],
  Media:       ['Photo Essays', 'Film Room', 'Behind The Lens', 'Broadcast', 'Creator Spotlight'],
  Marketplace: ['Classifieds', 'Rent A Ride', 'Auctions', 'Gear', 'Builds'],
};

const PRIMARY_CATEGORIES = Object.keys(CATEGORY_MAP);

function StoryCard({ story, hero = false }) {
  if (hero) {
    return (
      <Link to={getOutletStoryUrl(story)} className="group block relative overflow-hidden" style={{ background: '#0a0a0a' }}>
        <div className="aspect-[16/9] overflow-hidden">
          {story.cover_image ? (
            <img src={story.cover_image} alt={story.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: '#111' }}>
              <img src={LOGO_URL} alt="The Outlet" className="w-16 h-16 opacity-20" />
            </div>
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 50%, transparent 100%)' }} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[10px] tracking-[0.35em] uppercase" style={{ color: OUTLET_CYAN }}>{story.primary_category}</span>
            {story.sub_category && <>
              <span className="text-white/20">·</span>
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/40">{story.sub_category}</span>
            </>}
          </div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-[1.05] text-white mb-3 max-w-3xl group-hover:text-white transition-colors">
            {story.title}
          </h2>
          {story.subtitle && (
            <p className="text-sm md:text-base text-white/60 max-w-2xl line-clamp-2 mb-4">{story.subtitle}</p>
          )}
          <div className="flex items-center gap-4">
            {story.author && <span className="text-xs text-white/40 font-mono">{story.author}</span>}
            {story.published_date && <span className="text-xs text-white/30 font-mono">{format(new Date(story.published_date), 'MMM d, yyyy')}</span>}
            <span className="ml-auto flex items-center gap-1 text-xs font-bold" style={{ color: OUTLET_CYAN }}>
              Read <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
        {/* Cyan top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: OUTLET_CYAN }} />
      </Link>
    );
  }

  return (
    <Link to={getOutletStoryUrl(story)} className="group block" style={{ background: '#0a0a0a' }}>
      <div className="overflow-hidden aspect-[3/2] relative">
        {story.cover_image ? (
          <img src={story.cover_image} alt={story.title} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#111' }}>
            <img src={LOGO_URL} alt="The Outlet" className="w-10 h-10 opacity-15" />
          </div>
        )}
      </div>
      <div className="pt-4 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[9px] tracking-[0.35em] uppercase" style={{ color: OUTLET_CYAN }}>{story.primary_category}</span>
          {story.sub_category && <>
            <span className="text-white/20 text-[9px]">·</span>
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/35">{story.sub_category}</span>
          </>}
        </div>
        <h3 className="text-base font-bold tracking-tight leading-snug text-white group-hover:text-white/80 transition-colors mb-2">
          {story.title}
        </h3>
        {story.subtitle && (
          <p className="text-xs text-white/45 line-clamp-2 mb-3">{story.subtitle}</p>
        )}
        <div className="flex items-center gap-3">
          {story.author && <span className="text-[10px] text-white/30 font-mono">{story.author}</span>}
          {story.published_date && <span className="text-[10px] text-white/25 font-mono">{format(new Date(story.published_date), 'MMM d')}</span>}
        </div>
      </div>
    </Link>
  );
}

function SmallStoryRow({ story }) {
  return (
    <Link to={getOutletStoryUrl(story)} className="group flex items-start gap-4 py-4 border-b border-white/[0.06] hover:border-white/[0.12] transition-colors">
      {story.cover_image && (
        <div className="w-20 h-14 flex-shrink-0 overflow-hidden">
          <img src={story.cover_image} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: OUTLET_CYAN }}>{story.primary_category}</span>
        </div>
        <h4 className="text-xs font-bold text-white/85 group-hover:text-white transition-colors leading-snug line-clamp-2">{story.title}</h4>
        {story.published_date && <span className="text-[9px] text-white/25 font-mono mt-1 block">{format(new Date(story.published_date), 'MMM d')}</span>}
      </div>
    </Link>
  );
}

export default function OutletHome() {
  const [activePrimary, setActivePrimary] = useState('All');
  const [activeSub, setActiveSub] = useState('All');

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['outletStories'],
    queryFn: () => base44.entities.OutletStory.filter({ status: 'published' }, '-published_date', 50),
    staleTime: 3 * 60 * 1000,
  });

  const handlePrimaryClick = (cat) => { setActivePrimary(cat); setActiveSub('All'); };
  const subCategories = activePrimary !== 'All' ? CATEGORY_MAP[activePrimary] : [];

  const filtered = stories.filter(s => {
    const matchesPrimary = activePrimary === 'All' || s.primary_category === activePrimary;
    const matchesSub = activeSub === 'All' || s.sub_category === activeSub;
    return matchesPrimary && matchesSub;
  });

  const heroStory = activePrimary === 'All' ? filtered[0] : null;
  const secondaryStories = heroStory ? filtered.slice(1, 4) : filtered.slice(0, 3);
  const remainingStories = heroStory ? filtered.slice(4) : filtered.slice(3);
  const sidebarStories = activePrimary === 'All' ? filtered.slice(1, 8) : [];

  return (
    <div style={{ background: '#080808', minHeight: '100vh' }}>

      {/* ── MASTHEAD ── */}
      <div style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={LOGO_URL} alt="The Outlet" className="w-9 h-9" />
            <div>
              <div className="font-black text-white text-xl tracking-tight uppercase leading-none">The Outlet</div>
              <div className="font-mono text-[9px] tracking-[0.4em] uppercase mt-0.5" style={{ color: OUTLET_CYAN }}>Motorsports Editorials, Culture, and News</div>
            </div>
          </div>
          <Link
            to={createPageUrl('OutletSubmit')}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors"
            style={{ border: `1px solid ${OUTLET_CYAN}`, color: OUTLET_CYAN }}
            onMouseEnter={e => { e.currentTarget.style.background = OUTLET_CYAN; e.currentTarget.style.color = '#000'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = OUTLET_CYAN; }}
          >
            <PenLine className="w-3.5 h-3.5" /> Submit a Story
          </Link>
        </div>
      </div>

      {/* ── CATEGORY NAV ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto no-scrollbar">
            {['All', ...PRIMARY_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => handlePrimaryClick(cat)}
                className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-all relative"
                style={{
                  color: activePrimary === cat ? OUTLET_CYAN : 'rgba(255,255,255,0.4)',
                  borderBottom: activePrimary === cat ? `2px solid ${OUTLET_CYAN}` : '2px solid transparent',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-category strip */}
      {subCategories.length > 0 && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0a' }}>
          <div className="max-w-7xl mx-auto px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar">
            {['All', ...subCategories].map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSub(sub)}
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all"
                style={{
                  color: activeSub === sub ? '#000' : 'rgba(255,255,255,0.4)',
                  background: activeSub === sub ? OUTLET_CYAN : 'transparent',
                  border: `1px solid ${activeSub === sub ? OUTLET_CYAN : 'rgba(255,255,255,0.12)'}`,
                }}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
                <Skeleton className="h-3 w-16" style={{ background: 'rgba(255,255,255,0.05)' }} />
                <Skeleton className="h-5 w-3/4" style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="relative overflow-hidden py-20" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: OUTLET_CYAN }} />
            <div className="px-10 md:px-16">
              <div className="flex items-center gap-3 mb-6">
                <img src={LOGO_URL} alt="The Outlet" className="w-10 h-10 opacity-70" />
                <span className="font-mono text-[10px] tracking-[0.4em] uppercase" style={{ color: OUTLET_CYAN }}>The Outlet</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
                {activePrimary !== 'All' ? `${activePrimary} coverage is on the way.` : 'Editorial coverage is coming.'}
              </h2>
              <p className="text-white/45 text-base max-w-xl mb-8">
                Motorsports coverage — stories, stats, standings, and culture from across the sport.
              </p>
              <Link
                to={createPageUrl('OutletSubmit')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors"
                style={{ background: OUTLET_CYAN, color: '#000' }}
              >
                <PenLine className="w-4 h-4" /> Submit a Story
              </Link>
            </div>
          </div>
        )}

        {/* All-category layout: hero + sidebar + grid */}
        {!isLoading && filtered.length > 0 && activePrimary === 'All' && (
          <div className="space-y-8">
            {/* Hero + sidebar */}
            {heroStory && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0.5">
                <div className="lg:col-span-2">
                  <StoryCard story={heroStory} hero />
                </div>
                <div style={{ background: '#0a0a0a', borderLeft: '1px solid rgba(255,255,255,0.05)' }} className="px-5">
                  <div className="py-4 border-b border-white/[0.06] mb-1">
                    <span className="font-mono text-[9px] tracking-[0.45em] uppercase" style={{ color: OUTLET_CYAN }}>Latest</span>
                  </div>
                  {sidebarStories.map(s => <SmallStoryRow key={s.id} story={s} />)}
                </div>
              </div>
            )}

            {/* Thin divider label */}
            {secondaryStories.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span className="font-mono text-[9px] tracking-[0.45em] uppercase text-white/25">More Stories</span>
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            )}

            {/* Secondary grid */}
            {secondaryStories.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5">
                {secondaryStories.map(s => <StoryCard key={s.id} story={s} />)}
              </div>
            )}

            {/* Remaining grid */}
            {remainingStories.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0.5">
                {remainingStories.map(s => <StoryCard key={s.id} story={s} />)}
              </div>
            )}
          </div>
        )}

        {/* Category-filtered layout: straight grid */}
        {!isLoading && filtered.length > 0 && activePrimary !== 'All' && (
          <div className="space-y-8">
            {/* Category hero */}
            {filtered[0] && <StoryCard story={filtered[0]} hero />}

            {filtered.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5">
                {filtered.slice(1).map(s => <StoryCard key={s.id} story={s} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER STRIP ── */}
      <div className="max-w-7xl mx-auto px-6 py-12 mt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="The Outlet" className="w-7 h-7 opacity-60" />
            <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-white/25">The Outlet · HIJINX CO</span>
          </div>
          <Link
            to={createPageUrl('OutletSubmit')}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
            style={{ color: OUTLET_CYAN }}
          >
            <PenLine className="w-3.5 h-3.5" /> Submit a Story
          </Link>
        </div>
      </div>
    </div>
  );
}