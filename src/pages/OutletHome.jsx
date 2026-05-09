import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getOutletStoryUrl } from '@/lib/storyUrl';
import { format } from 'date-fns';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, ArrowRight, PenLine } from 'lucide-react';
import { OUTLET_LAUNCH_COPY } from '@/components/content/fallbackContent';

const CATEGORY_MAP = {
  Racing: ['Race Reports', 'Results', 'Standings', 'Championship Watch', 'Track Profiles'],
  Business: ['Sponsorship', 'Industry', 'Deals', 'Ownership', 'Expansion'],
  Culture: ['Grassroots', 'Legacy', 'Fan Experience', 'Opinion', 'Letters'],
  Tech: ['Engineering', 'Data', 'Setup', 'Safety', 'Rules'],
  Media: ['Photo Essays', 'Film Room', 'Behind The Lens', 'Broadcast', 'Creator Spotlight'],
  Marketplace: ['Classifieds', 'Rent A Ride', 'Auctions', 'Gear', 'Builds'],
};

const PRIMARY_CATEGORIES = Object.keys(CATEGORY_MAP);

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
    <PageShell style={{ backgroundImage: 'url(https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/44b72608e_TheOutletv1.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader
          label="The Outlet"
          title="Stories"
          subtitle="Journalism, culture, and coverage from across the Hijinx network."
          light
        />

        {/* Primary category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
          {['All', ...PRIMARY_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => handlePrimaryClick(cat)}
              className={`px-4 py-2 text-xs font-medium tracking-wide whitespace-nowrap transition-all ${
                activePrimary === cat
                  ? 'bg-white text-[#0A0A0A]'
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sub-category filters */}
        {subCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-10 no-scrollbar">
            {['All', ...subCategories].map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSub(sub)}
                className={`px-3 py-1.5 text-[11px] font-medium tracking-wide whitespace-nowrap transition-all border ${
                  activeSub === sub
                    ? 'border-white bg-white text-[#0A0A0A]'
                    : 'border-white/20 bg-transparent text-white/55 hover:border-white/50 hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Spacer when no sub-categories shown */}
        {subCategories.length === 0 && <div className="mb-10" />}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-56 w-full bg-white/10" />
                <Skeleton className="h-3 w-16 bg-white/10" />
                <Skeleton className="h-5 w-3/4 bg-white/10" />
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={Newspaper}
            title="Error loading stories"
            message="Something went wrong. Please try again later."
          />
        ) : filtered.length === 0 ? (
          <div className="space-y-8">
            {/* Editorial fallback block */}
            <div className="relative bg-[#0A0A0A] border border-gray-800 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00FFDA]/90 via-[#2563EB]/40 to-transparent" />
              <div className="p-8 md:p-12">
                <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase mb-4 block">The Outlet · HIJINX CO</span>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-4">
                  {activePrimary !== 'All' ? `${activePrimary} coverage is on the way.` : 'Editorial coverage is coming.'}
                </h2>
                <p className="text-white/55 text-base leading-relaxed mb-6 max-w-2xl">
                  The Outlet covers motorsports journalism, culture, business, and technology — stories from the people who make the sport move. Coverage drops regularly as our editorial network grows.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link to={createPageUrl('OutletSubmit')} className="inline-flex items-center gap-2 px-5 py-3 bg-[#00FFDA] text-[#0A0A0A] text-sm font-bold hover:bg-white transition-colors">
                    <PenLine className="w-4 h-4" /> Submit a Story
                  </Link>
                  <Link to={createPageUrl('OutletHome')} onClick={() => handlePrimaryClick('All')} className="inline-flex items-center gap-2 px-5 py-3 border border-white/20 text-white text-sm font-bold hover:border-[#00FFDA] hover:text-[#00FFDA] transition-colors">
                    All Categories <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {filtered.map((story) => (
              <Link
                key={story.id}
                to={getOutletStoryUrl(story)}
                className="group"
              >
                <div className="aspect-[3/2] bg-white/10 mb-4 overflow-hidden">
                  {story.cover_image ? (
                    <img
                      src={story.cover_image}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-mono text-xs text-white/40">{story.primary_category}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {story.primary_category}
                  </span>
                  {story.sub_category && (
                    <>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                      <span className="font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {story.sub_category}
                      </span>
                    </>
                  )}
                </div>
                <h3 className="font-bold text-lg mt-1 tracking-tight leading-tight text-white group-hover:underline decoration-1 underline-offset-4" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {story.title}
                </h3>
                {story.subtitle && (
                  <p className="text-sm mt-2 line-clamp-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{story.subtitle}</p>
                )}
                {story.published_date && (
                  <span className="text-xs mt-3 block" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {format(new Date(story.published_date), 'MMM d, yyyy · h:mm a')}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}