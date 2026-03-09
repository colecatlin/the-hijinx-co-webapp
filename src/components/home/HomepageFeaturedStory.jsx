import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import { ArrowRight, Newspaper } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomepageFeaturedStory({ featuredStory, supportingStories = [] }) {
  const featured = featuredStory;
  const supporting = supportingStories;

  if (!featured) {
    return (
      <section className="bg-white py-16 md:py-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-px bg-[#00FFDA]" />
                <span className="font-mono text-[10px] tracking-[0.4em] text-[#008080] uppercase font-bold">The Outlet</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-[#111] tracking-tight">Latest Stories</h2>
            </div>
            <Link
              to={createPageUrl('OutletHome')}
              className="hidden md:flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-gray-400 hover:text-[#008080] transition-colors uppercase"
            >
              Explore Stories <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <Link
            to={createPageUrl('OutletHome')}
            className="group relative flex flex-col justify-end min-h-[320px] md:min-h-[360px] overflow-hidden border border-gray-200 hover:border-[#00FFDA] transition-all duration-300 bg-gradient-to-br from-[#001F1F] to-[#000D20]"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00FFDA]/90 via-[#2563EB]/40 to-transparent" />
            <div className="absolute inset-0 bg-[#00FFDA]/3 group-hover:bg-[#00FFDA]/6 transition-all" />
            <div className="relative p-8 md:p-12">
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase mb-4 block">The Outlet</span>
              <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-3">
                The HIJINX story is just getting started.
              </h3>
              <p className="text-white/55 text-base leading-relaxed mb-6 max-w-lg">
                Stories, insight, and motorsports culture will appear here.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#00FFDA] tracking-wide uppercase group-hover:gap-3 transition-all">
                Explore Motorsports <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-20 md:py-28 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex items-end justify-between mb-10 md:mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-[#00FFDA]" />
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#008080] uppercase font-bold">The Outlet</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#111] tracking-tight">Latest Stories</h2>
          </div>
          <Link
            to={createPageUrl('OutletHome')}
            className="hidden md:flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-gray-400 hover:text-[#008080] transition-colors uppercase"
          >
            All Stories <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Featured story — large */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            className="lg:col-span-3"
          >
            <Link
              to={createPageUrl('OutletStoryPage') + `?id=${featured.id}`}
              className="group relative flex flex-col justify-end min-h-[420px] md:min-h-[500px] overflow-hidden border border-gray-200 hover:border-[#00FFDA] transition-all duration-300"
            >
              {featured.cover_image ? (
                <img
                  src={featured.cover_image}
                  alt={featured.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-85 group-hover:scale-105 transition-all duration-700"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

              {/* Top teal + blue accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00FFDA]/90 via-[#2563EB]/40 to-transparent" />

              <div className="absolute inset-0 p-7 md:p-8 flex flex-col justify-end">
                {featured.category && (
                  <span className="font-mono text-[10px] tracking-[0.35em] text-[#00FFDA] uppercase mb-3">
                    {featured.category}
                  </span>
                )}
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-3 group-hover:text-[#00FFDA] transition-colors duration-300">
                  {featured.title}
                </h3>
                {featured.excerpt && (
                  <p className="text-white/65 text-sm leading-relaxed mb-5 max-w-lg line-clamp-2">
                    {featured.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  {featured.published_date && !isNaN(new Date(featured.published_date)) && (
                    <span className="font-mono text-[9px] text-white/40">
                      {format(new Date(featured.published_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#00FFDA] tracking-wide uppercase group-hover:gap-2.5 transition-all">
                    Explore Stories <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Supporting stories */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {supporting.map((story, i) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex-1"
              >
                <Link
                  to={createPageUrl('OutletStoryPage') + `?id=${story.id}`}
                  className="group flex gap-4 h-full min-h-[110px] bg-white border border-gray-200 hover:border-[#00FFDA] hover:shadow-sm p-4 transition-all duration-200 overflow-hidden"
                >
                  {story.cover_image && (
                    <div className="w-20 h-20 flex-shrink-0 overflow-hidden">
                      <img
                        src={story.cover_image}
                        alt={story.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex flex-col justify-center min-w-0">
                    {story.category && (
                      <span className="font-mono text-[9px] tracking-[0.25em] text-[#008080] uppercase mb-1 font-bold">
                        {story.category}
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-[#222] group-hover:text-[#008080] transition-colors tracking-tight leading-snug line-clamp-2">
                      {story.title}
                    </h4>
                    {story.published_date && !isNaN(new Date(story.published_date)) && (
                      <span className="font-mono text-[9px] text-gray-400 mt-2">
                        {format(new Date(story.published_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}

            <Link
              to={createPageUrl('OutletHome')}
              className="flex items-center justify-center gap-2 border border-gray-200 hover:border-[#00FFDA] hover:bg-teal-50 py-4 font-mono text-[10px] tracking-[0.25em] text-gray-400 hover:text-[#008080] transition-all uppercase"
            >
              <Newspaper className="w-3.5 h-3.5" />
              Explore Stories
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}