import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getOutletStoryUrl } from '@/lib/storyUrl';
import { format } from 'date-fns';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, ArrowRight, PenLine } from 'lucide-react';

const OUTLET_BG = 'url(https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/506952c44_THEOUTLETBACKGROUND.png)';
const TEAL = '#1DA1A1';
const CYAN = '#00FFDA';

const CATEGORY_MAP = {
  Racing: ['Race Reports', 'Results', 'Standings', 'Championship Watch', 'Track Profiles'],
  Business: ['Sponsorship', 'Industry', 'Deals', 'Ownership', 'Expansion'],
  Culture: ['Grassroots', 'Legacy', 'Fan Experience', 'Opinion', 'Letters'],
  Tech: ['Engineering', 'Data', 'Setup', 'Safety', 'Rules'],
  Media: ['Photo Essays', 'Film Room', 'Behind The Lens', 'Broadcast', 'Creator Spotlight'],
  Marketplace: ['Classifieds', 'Rent A Ride', 'Auctions', 'Gear', 'Builds'],
};

const PRIMARY_CATEGORIES = Object.keys(CATEGORY_MAP);

const glassPanel = {
  background: 'rgba(6,10,10,0.78)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.09)',
};

export default function OutletHome() {
  const [activePrimary, setActivePrimary] = useState('All');
  const [activeSub, setActiveSub] = useState('All');

  const { data: stories = [], isLoading, error } = useQuery({
    queryKey: ['outletStories'],
    queryFn: () => base44.entities.OutletStory.filter({ status: 'published' }, '-published_date', 50),
    staleTime: 3 * 60 * 1000,
  });

  const handlePrimaryClick = (cat) => {
    setActivePrimary(cat);
    setActiveSub('All');
  };

  const subCategories = activePrimary !== 'All' ? CATEGORY_MAP[activePrimary] : [];

  const filtered = stories.filter(s => {
    const matchesPrimary = activePrimary === 'All' || s.primary_category === activePrimary;
    const matchesSub = activeSub === 'All' || s.sub_category === activeSub;
    return matchesPrimary && matchesSub;
  });

  return (
    <PageShell style={{ backgroundImage: OUTLET_BG, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      {/* Dark overlay so glass cards pop */}
      <div style={{ background: 'rgba(4,8,8,0.55)', minHeight: '100vh' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20">

          {/* Header */}
          <div className="mb-10">
            <p className="font-mono text-[10px] tracking-[0.45em] uppercase mb-2" style={{ color: CYAN }}>HIJINX · Editorial</p>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">The Outlet</h1>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Journalism, culture, and coverage from across the HIJINX network.
            </p>
          </div>

          {/* Glass filter bar */}
          <div className="rounded-2xl px-4 py-3 mb-3" style={glassPanel}>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {['All', ...PRIMARY_CATEGORIES].map((cat) => {
                const active = activePrimary === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handlePrimaryClick(cat)}
                    className="px-4 py-1.5 text-xs font-bold tracking-wide whitespace-nowrap rounded-lg transition-all"
                    style={{
                      background: active ? TEAL : 'rgba(255,255,255,0.06)',
                      color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                      border: active ? `1px solid ${TEAL}` : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-category filters */}
          {subCategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
              {['All', ...subCategories].map((sub) => {
                const active = activeSub === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => setActiveSub(sub)}
                    className="px-3 py-1 text-[11px] font-medium whitespace-nowrap rounded-lg transition-all"
                    style={{
                      background: active ? 'rgba(29,161,161,0.15)' : 'rgba(255,255,255,0.04)',
                      color: active ? CYAN : 'rgba(255,255,255,0.4)',
                      border: active ? `1px solid rgba(0,255,218,0.3)` : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          )}

          {subCategories.length === 0 && <div className="mb-8" />}

          {/* Loading skeletons */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden" style={glassPanel}>
                  <Skeleton className="h-48 w-full opacity-20 rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-3 w-16 opacity-20" />
                    <Skeleton className="h-5 w-3/4 opacity-20" />
                    <Skeleton className="h-3 w-1/2 opacity-10" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl p-8 text-center" style={glassPanel}>
              <Newspaper className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p className="text-white font-bold">Error loading stories</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Something went wrong. Please try again.</p>
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state glass panel */
            <div className="rounded-2xl overflow-hidden" style={glassPanel}>
              <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${CYAN}, transparent)` }} />
              <div className="p-8 md:p-12">
                <span className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4 block" style={{ color: CYAN }}>The Outlet · HIJINX CO</span>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-4">
                  {activePrimary !== 'All' ? `${activePrimary} coverage is on the way.` : 'Editorial coverage is coming.'}
                </h2>
                <p className="text-base leading-relaxed mb-6 max-w-2xl" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  The Outlet covers motorsports journalism, culture, business, and technology — stories from the people who make the sport move. Coverage drops regularly as our editorial network grows.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link to={createPageUrl('OutletSubmit')}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition-all"
                    style={{ background: TEAL, color: '#fff' }}
                  >
                    <PenLine className="w-4 h-4" /> Submit a Story
                  </Link>
                  <button onClick={() => handlePrimaryClick('All')}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    All Categories <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Story cards grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((story) => (
                <Link key={story.id} to={getOutletStoryUrl(story)} className="group">
                  <div className="rounded-2xl overflow-hidden transition-all duration-300 h-full flex flex-col"
                    style={{
                      ...glassPanel,
                      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.border = `1px solid rgba(29,161,161,0.3)`}
                    onMouseLeave={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'}
                  >
                    {/* Image */}
                    <div className="aspect-[3/2] overflow-hidden flex-shrink-0">
                      {story.cover_image ? (
                        <img
                          src={story.cover_image}
                          alt={story.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: 'rgba(29,161,161,0.08)' }}>
                          <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{story.primary_category}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: TEAL }}>
                          {story.primary_category}
                        </span>
                        {story.sub_category && (
                          <>
                            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                            <span className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {story.sub_category}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-bold text-base leading-snug text-white group-hover:text-[#00FFDA] transition-colors flex-1">
                        {story.title}
                      </h3>
                      {story.subtitle && (
                        <p className="text-sm mt-2 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)' }}>{story.subtitle}</p>
                      )}
                      {story.published_date && (
                        <span className="text-[10px] font-mono mt-3 block" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {format(new Date(story.published_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Submit CTA */}
          <div className="mt-16 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={glassPanel}>
            <div>
              <p className="text-sm font-bold text-white">Got a story to tell?</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Submit your pitch to The Outlet editorial team.</p>
            </div>
            <Link to={createPageUrl('OutletSubmit')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex-shrink-0"
              style={{ background: TEAL, color: '#fff' }}
            >
              <PenLine className="w-4 h-4" /> Submit a Story
            </Link>
          </div>

        </div>
      </div>
    </PageShell>
  );
}