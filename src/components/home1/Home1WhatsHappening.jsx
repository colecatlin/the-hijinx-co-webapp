import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight } from 'lucide-react';
import ActivityCard from './ActivityCard';

const BONE = '#FFF8F5';
const OIL = '#232323';
const TEAL = '#00FFDA';

const FALLBACK_SEEDS = [
  '1502920917128-1aa1c652f298',
  '1556906781-9a412961c28c',
  '1568605117036-5fe5e7bab8b7',
  '1601362840410-2f0b3a4a7e76',
  '1518770660439-4636190af475',
];

function buildOutletItems(stories) {
  return (stories || [])
    .filter((s) => s.status === 'published')
    .slice(0, 2)
    .map((s, i) => ({
      source: 'OUTLET',
      title: s.title,
      body: s.subtitle || s.primary_category,
      image: s.cover_image,
      time: timeAgo(s.published_date),
      to: s.slug ? `/story/${s.slug}` : '/OutletHome',
      cta: 'READ STORY',
      fallbackSeed: FALLBACK_SEEDS[0],
      sortDate: s.published_date || s.created_date,
    }));
}

function buildProductItems(products) {
  return (products || [])
    .filter((p) => p.status === 'active')
    .slice(0, 1)
    .map((p, i) => ({
      source: 'HIJINX',
      title: p.name,
      body: p.tagline || p.short_description,
      image: p.cover_image_url,
      time: timeAgo(p.created_date),
      to: p.slug ? `/product/${p.slug}` : '/ApparelHome',
      cta: 'SHOP NOW',
      fallbackSeed: FALLBACK_SEEDS[1],
      sortDate: p.created_date,
    }));
}

function buildEventItems(events) {
  const today = new Date().toISOString().split('T')[0];
  return (events || [])
    .filter((e) => !e.is_archived && (e.end_date || e.event_date) >= today)
    .slice(0, 1)
    .map((e, i) => ({
      source: 'INDEX46',
      title: e.name,
      body: [e.series_name, e.location_note].filter(Boolean).join(' / '),
      image: e.cover_image_url || e.banner_image_url,
      time: 'UPCOMING',
      to: e.slug ? `/events/${e.slug}` : '/Directory?cat=events',
      cta: 'VIEW EVENT',
      fallbackSeed: FALLBACK_SEEDS[2],
      sortDate: e.event_date,
    }));
}

function buildVehicleItems(vehicles) {
  return (vehicles || [])
    .filter((v) => v.visibility_status !== 'draft' && !v.is_archived)
    .slice(0, 1)
    .map((v, i) => ({
      source: 'MARKETPLACE',
      title: [v.year, v.manufacturer, v.model].filter(Boolean).join(' ') || v.nickname || 'Race Vehicle',
      body: v.vehicle_type ? `${v.vehicle_type} listed in the Marketplace` : 'Listed in the Marketplace',
      image: v.image_url,
      time: timeAgo(v.created_date),
      to: v.slug ? `/vehicles/${v.slug}` : '/MarketplaceHome',
      cta: 'VIEW LISTING',
      fallbackSeed: FALLBACK_SEEDS[3],
      sortDate: v.created_date,
    }));
}

function buildActivityItems(feed) {
  return (feed || [])
    .filter((a) => a.visibility === 'public')
    .slice(0, 1)
    .map((a, i) => ({
      source: a.entity_type === 'results' ? 'RACECORE' : 'COMMUNITY',
      title: a.title,
      body: a.description,
      image: a.thumbnail,
      time: timeAgo(a.created_at),
      to: '/racecore',
      cta: a.entity_type === 'results' ? 'SEE RESULTS' : 'SEE MORE',
      fallbackSeed: FALLBACK_SEEDS[4],
      sortDate: a.created_at,
    }));
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return 'JUST NOW';
    if (hrs < 24) return `${hrs} HOUR${hrs > 1 ? 'S' : ''} AGO`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} DAY${days > 1 ? 'S' : ''} AGO`;
    return `${Math.floor(days / 7)} WEEK${Math.floor(days / 7) > 1 ? 'S' : ''} AGO`;
  } catch {
    return null;
  }
}

export default function Home1WhatsHappening() {
  const scrollerRef = useRef(null);

  const { data: stories = [] } = useQuery({
    queryKey: ['home1ActivityStories'],
    queryFn: () => base44.entities.OutletStory.list('-published_date', 10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['home1ActivityProducts'],
    queryFn: () => base44.entities.Product.list('-created_date', 10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['home1ActivityEvents'],
    queryFn: () => base44.entities.Event.list('event_date', 20),
    staleTime: 5 * 60 * 1000,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['home1ActivityVehicles'],
    queryFn: () => base44.entities.Vehicle.list('-created_date', 10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: feed = [] } = useQuery({
    queryKey: ['home1ActivityFeed'],
    queryFn: () => base44.entities.ActivityFeed.list('-created_at', 10),
    staleTime: 5 * 60 * 1000,
  });

  // Build items from each source, then merge with source diversity
  const allItems = [
    ...buildOutletItems(stories),
    ...buildProductItems(products),
    ...buildEventItems(events),
    ...buildVehicleItems(vehicles),
    ...buildActivityItems(feed),
  ].filter((i) => i.title);

  // Sort by recency but cap per-source to maintain diversity
  allItems.sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0));

  // Ensure source diversity: max 2 per source
  const seen = {};
  const diverse = [];
  for (const item of allItems) {
    seen[item.source] = (seen[item.source] || 0) + 1;
    if (seen[item.source] <= 2) diverse.push(item);
  }
  const items = diverse.slice(0, 6);

  const scrollByCards = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]');
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className="w-full" style={{ background: BONE, paddingTop: '32px', paddingBottom: '36px' }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5 md:mb-6">
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8" style={{ background: OIL }} />
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase font-bold" style={{ color: OIL }}>
                Across The Ecosystem
              </p>
            </div>
            <h2
              className="font-black uppercase leading-[0.92] tracking-[-0.02em]"
              style={{ color: OIL, fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
            >
              What's Happening At <span style={{ color: TEAL }}>HIJINX</span>
            </h2>
            <p
              className="mt-2 font-mono text-[10px] md:text-[11px] tracking-[0.25em] uppercase"
              style={{ color: 'rgba(35,35,35,0.6)' }}
            >
              A Live Look Across The Ecosystem.
            </p>
          </div>
          {/* Right side */}
          <div className="md:text-right">
            <p
              className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] uppercase leading-relaxed"
              style={{ color: OIL }}
            >
              People. Places. Projects. Progress.
              <br />
              All In Motion.
            </p>
          </div>
        </div>

        {/* Cards */}
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-16 border" style={{ borderColor: 'rgba(35,35,35,0.15)' }}>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: 'rgba(35,35,35,0.5)' }}>
              Activity coming soon.
            </p>
          </div>
        ) : (
          <div className="relative" style={{ marginTop: '20px' }}>
            <div
              ref={scrollerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-6 px-6 sm:mx-0 sm:px-0 pb-2"
            >
              {items.map((item, i) => (
                <div
                  key={`${item.source}-${i}`}
                  data-card
                  className="snap-start shrink-0 w-[78%] sm:w-[45%] lg:w-[19%]"
                >
                  <ActivityCard item={item} />
                </div>
              ))}
            </div>
            {items.length > 5 && (
              <button
                onClick={() => scrollByCards(1)}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center shadow-sm transition-transform hover:scale-105"
                style={{ background: OIL, color: BONE }}
                aria-label="More activity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}