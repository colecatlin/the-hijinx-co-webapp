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

export default function OutletSection({ featuredStory, supportingStories = [] }) {
  const hasSupporting = supportingStories.length > 0;
  const displayStories = hasSupporting ? supportingStories.slice(0, 5) : [null, null, null, null, null];

  return (
    <section
      className="pt-10 md:pt-14 pb-16 md:pb-24 relative"
      style={{ background: 'transparent' }}
    >
      {/* Subtle ambient glow behind the section */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 60%, hsl(var(--motion) / 0.05) 0%, transparent 70%)' }} />

      <div className="relative max-w-7xl mx-auto px-6">

        {/* ── MASTHEAD ── */}
        <div className="pt-16 pb-5 mb-2 relative flex items-center justify-between">
          <Link to={createPageUrl('OutletHome')} className="flex items-center gap-4 group">
            <img
              src="https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/735f3b096_Asset62x.png"
              alt="The Outlet"
              className="w-10 h-10 object-contain"
            />
            <div className="flex flex-col leading-none">
              <span className="font-black text-foreground text-xl tracking-tight uppercase group-hover:opacity-70 transition-opacity">The Outlet</span>
              <span className="font-mono text-[9px] tracking-[0.35em] uppercase mt-1.5 text-motion">Motorsports Editorials, Culture, and News</span>
            </div>
          </Link>

          <Link
            to={createPageUrl('OutletHome')}
            className="hidden md:flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] text-foreground-secondary hover:text-foreground transition-colors uppercase font-bold pb-1"
          >
            All Stories <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="h-px mb-10 bg-divider" />

        {/* ── MAIN EDITORIAL GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

          {/* ── FEATURED STORY ── */}
          <motion.div
            initial={{ y: 20 }} whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0 }} transition={{ duration: 0.7 }}
            className="lg:col-span-7 lg:border-r lg:pr-8 border-divider"
          >
            <Link
              to={featuredStory ? getOutletStoryUrl(featuredStory) : createPageUrl('OutletHome')}
              className="group flex flex-col p-5 md:p-6 rounded-xl h-full bg-surface-elevated border border-divider"
            >
              <div className="relative overflow-hidden mb-5 rounded-xl flex-1 min-h-[420px]">
                <img
                  src={featuredStory?.cover_image || PLACEHOLDER_BG}
                  alt={featuredStory?.title || 'The Outlet'}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-700"
                  style={{ filter: 'contrast(1.08) saturate(0.90) brightness(0.92)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                {featuredStory?.primary_category && (
                  <div className="absolute top-4 left-4">
                    <span
                      className="font-mono text-[8px] tracking-[0.4em] text-white uppercase font-bold px-2 py-1 bg-black/75 border border-white/10"
                    >
                      {featuredStory.primary_category}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mb-3">
                {safeDate(featuredStory?.published_date) && (
                  <span className="font-mono text-[9px] text-foreground-quiet tracking-[0.25em]">
                    {safeDate(featuredStory.published_date)}
                  </span>
                )}
                {featuredStory?.author && (
                  <>
                    <span className="text-foreground-quiet/40 text-xs">—</span>
                    <span className="font-mono text-[9px] text-foreground-secondary tracking-[0.15em] uppercase">
                      {featuredStory.author}
                    </span>
                  </>
                )}
              </div>

              <h3
                className="text-3xl md:text-4xl font-black text-foreground tracking-tight leading-[1.05] mb-3 group-hover:opacity-70 transition-opacity"
                style={{ maxWidth: '90%' }}
              >
                {featuredStory?.title || 'Latest from The Outlet'}
              </h3>

              {featuredStory?.subtitle && (
                <p className="text-foreground-secondary text-sm leading-relaxed mb-6 max-w-lg line-clamp-2">
                  {featuredStory.subtitle}
                </p>
              )}

              <div className="mt-auto pt-6">
                <span className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.4em] text-foreground uppercase font-bold border-b border-divider pb-0.5 group-hover:text-motion group-hover:border-motion transition-all">
                  Read Story <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          </motion.div>

          {/* ── SUPPORTING STORIES ── */}
          <div className="lg:col-span-5 lg:pl-8 pt-8 lg:pt-0 border-t lg:border-t-0 mt-8 lg:mt-0 flex flex-col border-divider">
            <div className="p-5 md:p-6 rounded-xl flex-1 flex flex-col bg-surface-elevated border border-divider">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-[1px] bg-divider" />
              <span className="font-mono text-[8px] tracking-[0.5em] text-foreground-quiet uppercase">More Stories</span>
            </div>

            <div className="space-y-0">
              {displayStories.map((story, i) => (
                <motion.div
                  key={story?.id || i}
                  initial={{ x: 16 }} whileInView={{ x: 0 }}
                  viewport={{ once: true, amount: 0 }} transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`border-b ${i === 0 ? 'border-t' : ''} border-divider`}
                >
                  {story ? (
                    <Link to={getOutletStoryUrl(story)} className="group flex gap-4 py-4 items-start">
                      <span className="font-mono text-[9px] tracking-[0.2em] text-foreground-quiet font-bold pt-0.5 flex-shrink-0 w-5">
                        0{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {story.primary_category && (
                          <span className="font-mono text-[8px] tracking-[0.35em] text-foreground-quiet uppercase font-bold block mb-1">
                            {story.primary_category}
                          </span>
                        )}
                        <h4 className="text-base font-black text-foreground tracking-tight leading-snug group-hover:opacity-70 transition-opacity line-clamp-2">
                          {story.title}
                        </h4>
                        {safeDate(story.published_date) && (
                          <span className="font-mono text-[8px] text-foreground-quiet mt-1.5 block tracking-[0.2em]">
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
                      <span className="font-mono text-[9px] text-foreground-quiet/30 w-5">0{i + 1}</span>
                      <div className="flex-1 space-y-2">
                        <div className="h-2 rounded w-1/4 bg-surface-interactive" />
                        <div className="h-4 rounded w-3/4 bg-surface-interactive" />
                        <div className="h-4 rounded w-1/2 bg-surface-interactive" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <Link
              to={createPageUrl('OutletHome')}
              className="mt-6 flex items-center justify-center gap-2 py-4 font-mono text-[9px] tracking-[0.4em] text-foreground hover:text-motion transition-colors uppercase font-bold bg-surface-interactive border border-divider"
            >
              Explore The Outlet <ArrowRight className="w-3 h-3" />
            </Link>
            </div>
          </div>

        </div>

        {/* ── EDITORIAL VOLUME MARK ── */}
        <div className="flex justify-center pt-12">
          <span className="font-mono text-[9px] tracking-[0.5em] text-foreground-quiet uppercase font-bold">
            Editorial — Vol. 01
          </span>
        </div>

      </div>
    </section>
  );
}