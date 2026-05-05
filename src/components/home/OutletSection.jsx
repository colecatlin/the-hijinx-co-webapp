import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getOutletStoryUrl } from '@/lib/storyUrl';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const PLACEHOLDER_BG = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1400&q=90&fit=crop';

function safeDate(d) {
  if (!d) return null;
  const p = new Date(d);
  return isNaN(p) ? null : format(p, 'MMM d, yyyy').toUpperCase();
}

const paperGrain = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
  backgroundSize: '256px 256px',
};

export default function OutletSection({ featuredStory, supportingStories = [] }) {
  const hasSupporting = supportingStories.length > 0;
  const displayStories = hasSupporting ? supportingStories.slice(0, 5) : [null, null, null, null, null];

  return (
    <section
      className="pt-10 md:pt-14 pb-16 md:pb-24 relative"
      style={{ background: 'transparent' }}
    >
      {/* Subtle ambient glow behind the section */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 60%, rgba(29,161,161,0.06) 0%, transparent 70%)' }} />

      <div className="relative max-w-7xl mx-auto px-6">

        {/* ── MASTHEAD ── */}
        <div className="border-b border-white/10 pt-16 pb-4 mb-10 relative flex items-end justify-between">
          <span className="font-mono text-[9px] tracking-[0.5em] text-white/60 uppercase font-bold self-end pb-0.5">
            Editorial — Vol. 01
          </span>

          <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex flex-col items-center gap-1">
            <img
              src="https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/e0e7460c8_OutletLogo.png"
              alt="The Outlet"
              className="h-12 md:h-16 object-contain"
              style={{ filter: 'brightness(0) invert(1) opacity(1) drop-shadow(0 0 8px rgba(255,255,255,0.6)) drop-shadow(0 0 20px rgba(255,255,255,0.25))' }}
            />
            <p className="font-mono text-[9px] tracking-[0.3em] text-white/60 uppercase text-center">Motorsports journalism, culture &amp; coverage</p>
          </div>

          <Link
            to={createPageUrl('OutletHome')}
            className="hidden md:flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] text-white/60 hover:text-white transition-colors uppercase font-bold pb-1"
          >
            All Stories <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* ── MAIN EDITORIAL GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

          {/* ── FEATURED STORY ── */}
          <motion.div
            initial={{ y: 20 }} whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0 }} transition={{ duration: 0.7 }}
            className="lg:col-span-7 lg:border-r lg:pr-8"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <Link
              to={featuredStory ? getOutletStoryUrl(featuredStory) : createPageUrl('OutletHome')}
              className="group block"
            >
              <div className="relative overflow-hidden mb-5 rounded-xl" style={{ height: 360 }}>
                <img
                  src={featuredStory?.cover_image || PLACEHOLDER_BG}
                  alt={featuredStory?.title || 'The Outlet'}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-700"
                  style={{ filter: 'contrast(1.15) saturate(0.65) brightness(0.80)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {featuredStory?.primary_category && (
                  <div className="absolute top-4 left-4">
                    <span
                      className="font-mono text-[8px] tracking-[0.4em] text-white uppercase font-bold px-2 py-1"
                      style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {featuredStory.primary_category}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mb-3">
                {safeDate(featuredStory?.published_date) && (
                  <span className="font-mono text-[9px] text-white/60 tracking-[0.25em]">
                    {safeDate(featuredStory.published_date)}
                  </span>
                )}
                {featuredStory?.author && (
                  <>
                    <span className="text-white/20 text-xs">—</span>
                    <span className="font-mono text-[9px] text-white/60 tracking-[0.15em] uppercase">
                      {featuredStory.author}
                    </span>
                  </>
                )}
              </div>

              <h3
                className="text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.05] mb-3 group-hover:opacity-60 transition-opacity"
                style={{ maxWidth: '90%' }}
              >
                {featuredStory?.title || 'Latest from The Outlet'}
              </h3>

              {featuredStory?.subtitle && (
                <p className="text-white/70 text-sm leading-relaxed mb-5 max-w-lg line-clamp-2">
                  {featuredStory.subtitle}
                </p>
              )}

              <span className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.4em] text-white/80 uppercase font-bold border-b border-white/40 pb-0.5 group-hover:text-white group-hover:border-white transition-all">
                Read Story <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </motion.div>

          {/* ── SUPPORTING STORIES ── */}
          <div className="lg:col-span-5 lg:pl-8 pt-8 lg:pt-0 border-t lg:border-t-0 mt-8 lg:mt-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="font-mono text-[8px] tracking-[0.5em] text-white/60 uppercase">More Stories</span>
            </div>

            <div className="space-y-0">
              {displayStories.map((story, i) => (
                <motion.div
                  key={story?.id || i}
                  initial={{ x: 16 }} whileInView={{ x: 0 }}
                  viewport={{ once: true, amount: 0 }} transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`border-b ${i === 0 ? 'border-t' : ''}`}
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  {story ? (
                    <Link to={getOutletStoryUrl(story)} className="group flex gap-4 py-4 items-start">
                      <span className="font-mono text-[9px] tracking-[0.2em] text-white/50 font-bold pt-0.5 flex-shrink-0 w-5">
                        0{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {story.primary_category && (
                          <span className="font-mono text-[8px] tracking-[0.35em] text-white/60 uppercase font-bold block mb-1">
                            {story.primary_category}
                          </span>
                        )}
                        <h4 className="text-base font-black text-white tracking-tight leading-snug group-hover:opacity-50 transition-opacity line-clamp-2">
                          {story.title}
                        </h4>
                        {safeDate(story.published_date) && (
                          <span className="font-mono text-[8px] text-white/55 mt-1.5 block tracking-[0.2em]">
                            {safeDate(story.published_date)}
                          </span>
                        )}
                      </div>
                      {story.cover_image && (
                        <div
                          className="flex-shrink-0 overflow-hidden rounded-lg"
                          style={{ width: 64, height: 64 }}
                        >
                          <img
                            src={story.cover_image}
                            alt={story.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            style={{ filter: 'contrast(1.05) saturate(0.75) brightness(0.85)' }}
                          />
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div className="py-4 flex gap-4 items-start">
                      <span className="font-mono text-[9px] text-white/10 w-5">0{i + 1}</span>
                      <div className="flex-1 space-y-2">
                        <div className="h-2 rounded w-1/4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="h-4 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <div className="h-4 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <Link
              to={createPageUrl('OutletHome')}
              className="mt-6 flex items-center gap-2 font-mono text-[9px] tracking-[0.4em] text-white/60 hover:text-white transition-colors uppercase font-bold"
            >
              Explore The Outlet <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}