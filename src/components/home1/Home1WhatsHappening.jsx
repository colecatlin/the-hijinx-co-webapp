import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight } from 'lucide-react';
import ActivityCard from './ActivityCard';

const BONE = '#FFF8F5';
const OIL = '#232323';
const TEAL = '#00AAB5';

function buildOutletItems(stories) {
  return (stories || [])
    .filter((s) => s.status === 'published')
    .slice(0, 2)
    .map((s) => ({
      source: 'OUTLET',
      title: s.title,
      image: s.cover_image,
      to: s.slug ? `/story/${s.slug}` : '/OutletHome',
      cta: 'READ STORY',
      sortDate: s.published_date || s.created_date,
    }));
}

function buildProductItems(products) {
  return (products || [])
    .filter((p) => p.status === 'active')
    .slice(0, 2)
    .map((p) => ({
      source: 'HIJINX',
      title: p.name,
      image: p.cover_image_url,
      to: p.slug ? `/product/${p.slug}` : '/ApparelHome',
      cta: 'SHOP NOW',
      sortDate: p.created_date,
    }));
}

function buildEventItems(events) {
  // Most recent events first (past or upcoming) — ecosystem activity, not just a future calendar.
  return (events || [])
    .filter((e) => !e.is_archived && e.name)
    .slice(0, 2)
    .map((e) => ({
      source: 'INDEX46',
      title: e.name,
      image: e.cover_image_url || e.banner_image_url,
      to: e.slug ? `/events/${e.slug}` : '/Directory?cat=events',
      cta: 'VIEW EVENT',
      sortDate: e.event_date,
    }));
}

function buildVehicleItems(vehicles) {
  return (vehicles || [])
    .filter((v) => v.visibility_status !== 'draft' && !v.is_archived)
    .slice(0, 2)
    .map((v) => ({
      source: 'MARKETPLACE',
      title: [v.year, v.manufacturer, v.model].filter(Boolean).join(' ') || v.nickname || 'Race Vehicle',
      image: v.image_url,
      to: v.slug ? `/vehicles/${v.slug}` : '/MarketplaceHome',
      cta: 'VIEW LISTING',
      sortDate: v.created_date,
    }));
}

function buildActivityItems(feed) {
  return (feed || [])
    .filter((a) => a.visibility === 'public')
    .slice(0, 2)
    .map((a) => ({
      source: a.entity_type === 'results' ? 'RACECORE' : 'COMMUNITY',
      title: a.title,
      image: a.thumbnail,
      to: a.entity_type === 'results' ? '/racecore' : '/Directory',
      cta: a.entity_type === 'results' ? 'SEE RESULTS' : 'EXPLORE',
      sortDate: a.created_at,
    }));
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
    queryFn: () => base44.entities.Event.list('-event_date', 20),
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

  // Diversity-first: take the most recent item per source, then sort by recency.
  const bySource = {
    OUTLET: buildOutletItems(stories),
    HIJINX: buildProductItems(products),
    INDEX46: buildEventItems(events),
    MARKETPLACE: buildVehicleItems(vehicles),
    RACECORE: buildActivityItems(feed).filter((i) => i.source === 'RACECORE'),
    COMMUNITY: buildActivityItems(feed).filter((i) => i.source === 'COMMUNITY'),
  };

  // Pick the single most-recent item from each source, then order by recency.
  const topPerSource = Object.values(bySource)
    .map((arr) => (arr.length ? arr.slice().sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0))[0] : null))
    .filter(Boolean)
    .filter((i) => i.title);

  topPerSource.sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0));

  // Preferred source order for the first 5 slots.
  const PREFERRED = ['INDEX46', 'RACECORE', 'HIJINX', 'OUTLET', 'MARKETPLACE', 'COMMUNITY'];
  const ordered = [];
  const used = new Set();
  for (const src of PREFERRED) {
    const item = topPerSource.find((i) => i.source === src);
    if (item && !used.has(item.source)) {
      ordered.push(item);
      used.add(item.source);
    }
  }
  // Fill any remaining slots with other recent items (max 1 per source).
  for (const item of topPerSource) {
    if (ordered.length >= 5) break;
    if (!used.has(item.source)) {
      ordered.push(item);
      used.add(item.source);
    }
  }
  const items = ordered.slice(0, 5);

  const scrollByCards = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]');
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className="w-full" style={{ background: BONE, paddingTop: '30px', paddingBottom: '32px' }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Header — eyebrow + headline + supporting text only */}
        <div>
          <div className="flex items-center gap-3 mb-2.5">
            <div className="h-px w-8" style={{ background: OIL }} />
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase font-bold" style={{ color: OIL }}>
              Across The Ecosystem
            </p>
          </div>
          <h2
            className="font-black uppercase leading-[0.92] tracking-[-0.02em]"
            style={{ color: OIL, fontSize: 'clamp(1.75rem, 3.8vw, 2.75rem)' }}
          >
            What's Happening At <span style={{ color: TEAL }}>HIJINX</span>
          </h2>
          <p
            className="mt-2 font-mono text-[10px] md:text-[11px] tracking-[0.25em] uppercase"
            style={{ color: 'rgba(35,35,35,0.6)' }}
          >
            The Latest From Across The HIJINX World.
          </p>
        </div>

        {/* Cards */}
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-12 border" style={{ borderColor: 'rgba(35,35,35,0.15)', marginTop: '20px' }}>
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
                  className="snap-start shrink-0 w-[80%] sm:w-[45%] md:w-[31%] lg:w-[19%]"
                >
                  <ActivityCard item={item} />
                </div>
              ))}
            </div>
            {items.length > 5 && (
              <button
                onClick={() => scrollByCards(1)}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full items-center justify-center transition-transform hover:scale-105"
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