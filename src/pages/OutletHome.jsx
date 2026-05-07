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

const CATEGORY_MAP = {
  Racing: ['Race Reports', 'Results', 'Standings', 'Championship Watch', 'Track Profiles'],
  Business: ['Sponsorship', 'Industry', 'Deals', 'Ownership', 'Expansion'],
  Culture: ['Grassroots', 'Legacy', 'Fan Experience', 'Opinion', 'Letters'],
  Tech: ['Engineering', 'Data', 'Setup', 'Safety', 'Rules'],
  Media: ['Photo Essays', 'Film Room', 'Behind The Lens', 'Broadcast', 'Creator Spotlight'],
  Marketplace: ['Classifieds', 'Rent A Ride', 'Auctions', 'Gear', 'Builds'],
};

const PRIMARY_CATEGORIES = Object.keys(CATEGORY_MAP);

// Light frosted glass panel
const lightGlass = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.9)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
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
      {/* Subtle dark overlay to make light glass cards pop */}
      <div style={{ background: 'rgba(4,8,8,0.45)', minHeight: '100vh' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20">

          {/* Header — light glass */}
          <div className="rounded-2xl px-8 py-8 mb-8" style={lightGlass}>
            <p className="font-mono text-[10px] tracking-[0.45em] uppercase mb-2" style={{ color: TEAL }}>HIJINX · Editorial</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: '#0A0A0A' }}>The Outlet</h1>
            <p className="text-sm mt-2 text-gray-500">
              Journalism, culture, and coverage from across the HIJINX network.
            </p>
          </div>

          {/* Primary category filters — light glass pill bar */}
          <div className="rounded-2xl px-4 py-3 mb-3" style={lightGlass}>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {['All', ...PRIMARY_CATEGORIES].map((cat) => {
                const active = activePrimary === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handlePrimaryClick(cat)}
                    className="px-4 py-1.5 text-xs font-bold tracking-wide whitespace-nowrap rounded-lg transition-all"
                    style={{
                      background: active ? '#0A0A0A' : 'rgba(0,0,0,0.06)',
                      color: active ? '#fff' : '#525252',
                      border: active ? '1px solid #0A0A0A' : '1px solid rgba(0,0,0,0.1)',
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
                      background: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
                      color: active ? TEAL : '#737373',
                      border: active ? `1px solid ${TEAL}` : '1px solid rgba(255,255,255,0.6)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
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
                <div key={i} className="rounded-2xl overflow-hidden" style={lightGlass}>
                  <Skeleton className="h-48 w-full rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl p-8 text-center" style={lightGlass}>
              <Newspaper className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p className="font-bold text-gray-800">Error loading stories</p>
              <p className="text-sm mt-1 text-gray-500">Something went wrong. Please try again.</p>
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state */
            <div className="rounded-2xl overflow-hidden" style={lightGlass}>
              <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${TEAL}, transparent)` }} />
              <div className="p-8 md:p-12">
                <span className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4 block" style={{ color: TEAL }}>The Outlet · HIJINX CO</span>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-4 text-gray-900">
                  {activePrimary !== 'All' ? `${activePrimary} coverage is on the way.` : 'Editorial coverage is coming.'}
                </h2>
                <p className="text-base leading-relaxed mb-6 max-w-2xl text-gray-500">
                  The Outlet covers motorsports journalism, culture, business, and technology — stories from the people who make the sport move.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link to={createPageUrl('OutletSubmit')}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition-all text-white"
                    style={{ background: TEAL }}
                  >
                    <PenLine className="w-4 h-4" /> Submit a Story
                  </Link>
                  <button onClick={() => handlePrimaryClick('All')}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition-all text-gray-700 bg-gray-100 hover:bg-gray-200"
                  >
                    All Categories <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Story cards grid — light glass */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((story) => (
                <Link key={story.id} to={getOutletStoryUrl(story)} className="group">
                  <div
                    className="rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-300"
                    style={{ ...lightGlass, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 40px rgba(29,161,161,0.2)`; e.currentTarget.style.border = `1px solid rgba(29,161,161,0.4)`; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.9)'; }}
                  >
                    {/* Image */}
                    <div className="aspect-[3/2] overflow-hidden flex-shrink-0 bg-gray-100">
                      {story.cover_image ? (
                        <img
                          src={story.cover_image}
                          alt={story.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <span className="font-mono text-xs text-gray-400">{story.primary_category}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-[9px] tracking-[0.25em] uppercase font-bold" style={{ color: TEAL }}>
                          {story.primary_category}
                        </span>
                        {story.sub_category && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-gray-400">
                              {story.sub_category}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-bold text-base leading-snug text-gray-900 group-hover:text-[#1DA1A1] transition-colors flex-1">
                        {story.title}
                      </h3>
                      {story.subtitle && (
                        <p className="text-sm mt-2 line-clamp-2 text-gray-500">{story.subtitle}</p>
                      )}
                      {story.published_date && (
                        <span className="text-[10px] font-mono mt-3 block text-gray-400">
                          {format(new Date(story.published_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Submit CTA — light glass */}
          <div className="mt-16 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={lightGlass}>
            <div>
              <p className="text-sm font-bold text-gray-900">Got a story to tell?</p>
              <p className="text-xs mt-0.5 text-gray-500">Submit your pitch to The Outlet editorial team.</p>
            </div>
            <Link to={createPageUrl('OutletSubmit')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex-shrink-0 text-white"
              style={{ background: TEAL }}
            >
              <PenLine className="w-4 h-4" /> Submit a Story
            </Link>
          </div>

        </div>
      </div>
    </PageShell>
  );
}