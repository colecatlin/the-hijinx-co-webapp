import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getOutletStoryUrl } from '@/lib/storyUrl';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const PLACEHOLDER_BG = 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=1400&q=90&fit=crop';

function safeDate(d) {
  if (!d) return null;
  const p = new Date(d);
  return isNaN(p) ? null : format(p, 'MMM d, yyyy').toUpperCase();
}

// Paper texture grain
const paperGrain = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
  backgroundSize: '256px 256px',
};

export default function OutletSection({ featuredStory, supportingStories = [] }) {
  const hasSupporting = supportingStories.length > 0;

  return (
    <section
      className="py-16 md:py-24 relative overflow-hidden"
      style={{ background: '#F5F0E8' }}
    >
      {/* Paper grain overlay */}
      <div className="absolute inset-0 opacity-[0.18] pointer-events-none" style={paperGrain} />

      <div className="relative max-w-7xl mx-auto px-6">

        {/* ── MASTHEAD ── */}
        <div className="border-b-2 border-black pb-4 mb-10 flex items-end justify-between">
          <div className="flex items-end gap-6">
            {/* Volume marker */}
            <span className="font-mono text-[9px] tracking-[0.5em] text-black/40 uppercase font-bold self-end pb-0.5">
              The Outlet — Vol. 01
            </span>
            <h2
              className="text-5xl md:text-7xl font-black text-black tracking-[-0.03em] leading-none"
              style={{ fontStyle: 'italic' }}
            >
              Editorial.
            </h2>
          </div>
          <Link
            to={createPageUrl('OutletHome')}
            className="hidden md:flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] text-black/40 hover:text-black transition-colors uppercase font-bold pb-1"
          >
            All Stories <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* ── MAIN EDITORIAL GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

          {/* ── FEATURED STORY ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="lg:col-span-7 lg:border-r-2 border-black lg:pr-8"
          >
            <Link
              to={featuredStory ? getOutletStoryUrl(featuredStory) : createPageUrl('OutletHome')}
              className="group block"
            >
              {/* Feature image */}
              <div className="relative overflow-hidden mb-5" style={{ height: 360 }}>
                <img
                  src={featuredStory?.cover_image || PLACEHOLDER_BG}
                  alt={featuredStory?.title || 'The Outlet'}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-700"
                  style={{ filter: 'contrast(1.15) saturate(0.75) brightness(0.92)' }}
                />
                {/* Dark overlay bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                {/* Category tag — overlaid on image */}
                {featuredStory?.primary_category && (
                  <div className="absolute top-4 left-4">
                    <span
                      className="font-mono text-[8px] tracking-[0.4em] text-white uppercase font-bold px-2 py-1"
                      style={{ background: 'rgba(0,0,0,0.75)' }}
                    >
                      {featuredStory.primary_category}
                    </span>
                  </div>
                )}
              </div>

              {/* Metadata line */}
              <div className="flex items-center gap-4 mb-3">
                {safeDate(featuredStory?.published_date) && (
                  <span className="font-mono text-[9px] text-black/40 tracking-[0.25em]">
                    {safeDate(featuredStory.published_date)}
                  </span>
                )}
                {featuredStory?.author && (
                  <>
                    <span className="text-black/20 text-xs">—</span>
                    <span className="font-mono text-[9px] text-black/40 tracking-[0.15em] uppercase">
                      {featuredStory.author}
                    </span>
                  </>
                )}
              </div>

              {/* Headline */}
              <h3
                className="text-3xl md:text-4xl font-black text-black tracking-tight leading-[1.05] mb-3 group-hover:opacity-70 transition-opacity"
                style={{ maxWidth: '90%' }}
              >
                {featuredStory?.title || 'Latest from The Outlet'}
              </h3>

              {featuredStory?.subtitle && (
                <p className="text-black/50 text-sm leading-relaxed mb-5 max-w-lg line-clamp-2">
                  {featuredStory.subtitle}
                </p>
              )}

              {/* Read CTA */}
              <span className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.4em] text-black uppercase font-bold border-b border-black pb-0.5 group-hover:opacity-50 transition-opacity">
                Read Story <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </motion.div>

          {/* ── SUPPORTING STORIES — offset/collage ── */}
          <div className="lg:col-span-5 lg:pl-8 pt-8 lg:pt-0 border-t-2 border-black lg:border-t-0 mt-8 lg:mt-0">

            {/* Section rule label */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-[1px] bg-black/15" />
              <span className="font-mono text-[8px] tracking-[0.5em] text-black/35 uppercase">More Stories</span>
            </div>

            <div className="space-y-0">
              {(hasSupporting ? supportingStories.slice(0, 3) : [null, null, null]).map((story, i) => (
                <motion.div
                  key={story?.id || i}
                  initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                  // Intentional offset — every other card shifts slightly right
                  style={{ marginLeft: i % 2 === 1 ? 16 : 0 }}
                  className={`border-b border-black/12 ${i === 0 ? 'border-t border-black/12' : ''}`}
                >
                  {story ? (
                    <Link
                      to={getOutletStoryUrl(story)}
                      className="group flex gap-4 py-4 items-start"
                    >
                      {/* Story number */}
                      <span
                        className="font-mono text-[9px] tracking-[0.2em] text-black/20 font-bold pt-0.5 flex-shrink-0 w-5"
                      >
                        0{i + 1}
                      </span>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        {story.primary_category && (
                          <span className="font-mono text-[8px] tracking-[0.35em] text-black/40 uppercase font-bold block mb-1">
                            {story.primary_category}
                          </span>
                        )}
                        <h4 className="text-base font-black text-black tracking-tight leading-snug group-hover:opacity-50 transition-opacity line-clamp-2">
                          {story.title}
                        </h4>
                        {safeDate(story.published_date) && (
                          <span className="font-mono text-[8px] text-black/30 mt-1.5 block tracking-[0.2em]">
                            {safeDate(story.published_date)}
                          </span>
                        )}
                      </div>

                      {/* Thumbnail — only if image exists */}
                      {story.cover_image && (
                        <div
                          className="flex-shrink-0 overflow-hidden"
                          style={{ width: 64, height: 64, filter: 'contrast(1.05) saturate(0.8)' }}
                        >
                          <img
                            src={story.cover_image}
                            alt={story.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                      )}
                    </Link>
                  ) : (
                    // Skeleton placeholder
                    <div className="py-4 flex gap-4 items-start">
                      <span className="font-mono text-[9px] text-black/15 w-5">0{i + 1}</span>
                      <div className="flex-1 space-y-2">
                        <div className="h-2 bg-black/8 rounded w-1/4" />
                        <div className="h-4 bg-black/8 rounded w-3/4" />
                        <div className="h-4 bg-black/8 rounded w-1/2" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* All stories link */}
            <Link
              to={createPageUrl('OutletHome')}
              className="mt-6 flex items-center gap-2 font-mono text-[9px] tracking-[0.4em] text-black/40 hover:text-black transition-colors uppercase font-bold"
            >
              Explore The Outlet <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}