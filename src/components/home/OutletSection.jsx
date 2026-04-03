import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getOutletStoryUrl } from '@/lib/storyUrl';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const PLACEHOLDER_BG = 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=1200&q=80&fit=crop';

function safeDate(d) {
  if (!d) return null;
  const p = new Date(d);
  return isNaN(p) ? null : format(p, 'MMM d, yyyy');
}

export default function OutletSection({ featuredStory, supportingStories = [] }) {
  return (
    <section className="bg-[#111111] py-16 md:py-24 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-[2px] bg-[#00FFDA]" />
              <span className="font-mono text-[10px] tracking-[0.45em] text-[#00FFDA] uppercase font-bold">The Outlet</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Editorial.
            </h2>
          </div>
          <Link
            to={createPageUrl('OutletHome')}
            className="hidden md:flex items-center gap-1.5 font-mono text-[9px] tracking-[0.3em] text-white/40 hover:text-[#00FFDA] transition-colors uppercase font-bold"
          >
            All Stories <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* Featured story — large */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <Link
              to={featuredStory ? getOutletStoryUrl(featuredStory) : createPageUrl('OutletHome')}
              className="group relative flex flex-col justify-end min-h-[480px] overflow-hidden block"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <img
                src={featuredStory?.cover_image || PLACEHOLDER_BG}
                alt={featuredStory?.title || 'The Outlet'}
                className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-75 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00FFDA]/80 to-transparent" />

              <div className="relative p-7 md:p-10">
                {featuredStory?.primary_category && (
                  <span className="font-mono text-[9px] tracking-[0.4em] text-[#00FFDA] uppercase font-bold block mb-3">
                    {featuredStory.primary_category}
                  </span>
                )}
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-3 group-hover:text-[#00FFDA] transition-colors duration-300">
                  {featuredStory?.title || 'Latest from The Outlet'}
                </h3>
                {featuredStory?.subtitle && (
                  <p className="text-white/50 text-sm leading-relaxed mb-5 max-w-md line-clamp-2">
                    {featuredStory.subtitle}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  {safeDate(featuredStory?.published_date) && (
                    <span className="font-mono text-[9px] text-white/30">{safeDate(featuredStory.published_date)}</span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs font-black text-[#00FFDA] uppercase tracking-wider group-hover:gap-3 transition-all">
                    Read Story <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Supporting stories */}
          <div className="flex flex-col gap-3">
            {supportingStories.length > 0 ? supportingStories.map((story, i) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex-1"
              >
                <Link
                  to={getOutletStoryUrl(story)}
                  className="group flex gap-4 h-full min-h-[130px] overflow-hidden transition-all duration-200 block"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {story.cover_image && (
                    <div className="w-24 flex-shrink-0 overflow-hidden">
                      <img
                        src={story.cover_image}
                        alt={story.title}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      />
                    </div>
                  )}
                  <div className="p-4 flex flex-col justify-center min-w-0">
                    {story.primary_category && (
                      <span className="font-mono text-[8px] tracking-[0.3em] text-[#00FFDA] uppercase font-bold mb-1">
                        {story.primary_category}
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-white/90 group-hover:text-white transition-colors tracking-tight leading-snug line-clamp-2">
                      {story.title}
                    </h4>
                    {safeDate(story.published_date) && (
                      <span className="font-mono text-[8px] text-white/25 mt-2">{safeDate(story.published_date)}</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            )) : (
              /* Placeholder if no stories */
              [1,2,3].map(i => (
                <div key={i} className="flex-1 min-h-[130px]"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="p-4 h-full flex flex-col justify-center">
                    <div className="w-12 h-[1px] bg-[#00FFDA]/30 mb-3" />
                    <div className="h-3 bg-white/5 rounded mb-2 w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))
            )}

            <Link
              to={createPageUrl('OutletHome')}
              className="flex items-center justify-center gap-2 py-4 font-mono text-[9px] tracking-[0.3em] text-white/30 hover:text-[#00FFDA] transition-colors uppercase mt-1"
              style={{ border: '1px solid rgba(255,255,255,0.05)' }}
            >
              Explore The Outlet <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}