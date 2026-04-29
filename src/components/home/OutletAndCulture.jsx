import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { getOutletStoryUrl } from '@/lib/storyUrl';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const PLACEHOLDER_BG = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&q=80&fit=crop';

const paperGrain = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
  backgroundSize: '256px 256px',
};

function safeDate(d) {
  if (!d) return null;
  const p = new Date(d);
  return isNaN(p) ? null : format(p, 'MMM d, yyyy').toUpperCase();
}

// Fallback culture tile data — used when no DB content exists
const FALLBACK_TILES = [
  { title: 'On Track', label: 'Racing', image_url: 'https://images.unsplash.com/photo-1558981852-426c349548ab?w=600&q=80&fit=crop', link_url: '/OutletHome', accent_color: '#1DA1A1' },
  { title: 'Built', label: 'Engineering', image_url: 'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=600&q=80&fit=crop', link_url: '/OutletHome', accent_color: '#00FFDA' },
  { title: 'The Culture', label: 'Lifestyle', image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80&fit=crop', link_url: '/OutletHome', accent_color: '#E5FF00' },
];

function CultureTile({ tile, index }) {
  const accent = tile.accent_color || '#1DA1A1';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      className="h-full"
    >
      <Link
        to={tile.link_url || createPageUrl('OutletHome')}
        className="group relative block overflow-hidden h-full min-h-[180px]"
        style={{ borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)' }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.12)`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        style={{ borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', transition: 'all 0.3s ease' }}
      >
        {tile.image_url ? (
          <img
            src={tile.image_url}
            alt={tile.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
            style={{ filter: 'contrast(1.12) saturate(0.55) brightness(0.72)' }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Accent bar on hover */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: accent }}
        />

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className="block font-mono text-[8px] tracking-[0.4em] uppercase text-white/45 mb-1">
            {tile.label}
          </span>
          <h4 className="text-white font-bold text-sm leading-snug">{tile.title}</h4>
        </div>
      </Link>
    </motion.div>
  );
}

export default function OutletAndCulture({ featuredStory, supportingStories = [] }) {
  // Fetch culture tiles from DB
  const { data: dbTiles = [] } = useQuery({
    queryKey: ['cultureBlocks'],
    queryFn: () => base44.entities.CultureBlock.filter({ is_active: true }, 'sort_order', 5),
    staleTime: 5 * 60 * 1000,
  });

  const tiles = dbTiles.length > 0 ? dbTiles.slice(0, 3) : FALLBACK_TILES;

  // Supporting stories — show up to 3 as compact list items
  const displaySupporting = supportingStories.slice(0, 3);

  return (
    <section className="relative py-16 md:py-24" style={{ background: '#F5F0E8' }}>
      {/* Paper grain */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={paperGrain} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-20">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-px bg-black" />
              <span className="font-mono text-[9px] tracking-[0.45em] text-black/50 uppercase">
                The Outlet · Editorial
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight leading-tight max-w-lg">
              We tell the stories no one else is telling.
            </h2>
          </div>
          <Link
            to={createPageUrl('OutletHome')}
            className="flex-shrink-0 flex items-center gap-2 font-mono text-[9px] tracking-[0.4em] text-black/40 hover:text-black transition-colors uppercase font-bold border-b border-black/20 hover:border-black pb-0.5 self-end"
          >
            Explore The Outlet <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Main content: featured story + culture tiles + supporting list */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* LEFT: Featured story — large card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5"
          >
            <Link
              to={featuredStory ? getOutletStoryUrl(featuredStory) : createPageUrl('OutletHome')}
              className="group block h-full"
            >
              <div
                className="relative overflow-hidden mb-4"
                style={{ height: 320, borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <img
                  src={featuredStory?.cover_image || PLACEHOLDER_BG}
                  alt={featuredStory?.title || 'The Outlet'}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-700"
                  style={{ filter: 'contrast(1.1) saturate(0.8)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {featuredStory?.primary_category && (
                  <div className="absolute top-3 left-3">
                    <span className="font-mono text-[8px] tracking-[0.4em] text-white uppercase font-bold px-2 py-0.5" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      {featuredStory.primary_category}
                    </span>
                  </div>
                )}
              </div>

              {safeDate(featuredStory?.published_date) && (
                <span className="font-mono text-[9px] text-black/35 tracking-[0.25em] block mb-2">
                  {safeDate(featuredStory.published_date)}
                </span>
              )}

              <h3 className="text-2xl md:text-3xl font-black text-black tracking-tight leading-tight mb-2 group-hover:opacity-60 transition-opacity">
                {featuredStory?.title || 'Latest from The Outlet'}
              </h3>

              <span className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.4em] text-black uppercase font-bold border-b border-black pb-0.5 group-hover:opacity-50 transition-opacity">
                Read Story <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </motion.div>

          {/* RIGHT: Culture tiles grid + story list */}
          <div className="lg:col-span-7 flex flex-col gap-4">

            {/* Culture tiles — 3 cards */}
            <div className="grid grid-cols-3 gap-3" style={{ height: 180 }}>
              {tiles.map((tile, i) => (
                <CultureTile key={tile.id || i} tile={tile} index={i} />
              ))}
            </div>

            {/* Supporting stories list */}
            {displaySupporting.length > 0 && (
              <div className="space-y-0 border-t border-black/10">
                {displaySupporting.map((story, i) => (
                  <motion.div
                    key={story?.id || i}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                  >
                    {story ? (
                      <Link
                        to={getOutletStoryUrl(story)}
                        className="group flex gap-4 py-3.5 items-start border-b border-black/08 hover:opacity-70 transition-opacity"
                      >
                        <span className="font-mono text-[9px] text-black/20 font-bold pt-0.5 flex-shrink-0 w-5">
                          0{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          {story.primary_category && (
                            <span className="font-mono text-[8px] tracking-[0.35em] text-black/40 uppercase font-bold block mb-1">
                              {story.primary_category}
                            </span>
                          )}
                          <h4 className="text-sm font-black text-black tracking-tight leading-snug line-clamp-2">
                            {story.title}
                          </h4>
                        </div>
                        {story.cover_image && (
                          <div className="flex-shrink-0 overflow-hidden rounded" style={{ width: 56, height: 56 }}>
                            <img src={story.cover_image} alt={story.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                        )}
                      </Link>
                    ) : null}
                  </motion.div>
                ))}
              </div>
            )}

            {/* No stories fallback */}
            {displaySupporting.length === 0 && (
              <div className="border-t border-black/10 pt-5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4 py-3.5 border-b border-black/08">
                    <span className="font-mono text-[9px] text-black/15 w-5">0{i}</span>
                    <div className="flex-1 space-y-2">
                      <div className="h-2 bg-black/8 rounded w-1/4" />
                      <div className="h-4 bg-black/8 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}