import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';

const FALLBACK_RACE = 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=75';
const FALLBACK_PORTRAIT = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=75';

const reveal = {
  hidden: { y: 32, opacity: 0 },
  visible: (i = 0) => ({ y: 0, opacity: 1, transition: { duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] } }),
};

/* ── Large story card (hero slot) ── */
function LargeStoryCard({ story }) {
  const img = story.cover_image || FALLBACK_RACE;
  return (
    <motion.div custom={0} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="row-span-2">
      <Link to={`/story/${story.slug || story.id}`} className="group relative overflow-hidden block h-full" style={{ minHeight: 420, background: '#111' }}>
        <motion.img src={img} alt={story.title} className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.55) contrast(1.15)' }}
          whileHover={{ scale: 1.04 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.95) 35%, transparent 75%)' }} />
        {/* Category bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          {story.primary_category && (
            <span className="font-mono text-[9px] tracking-widest uppercase px-2 py-1" style={{ background: '#00FFDA', color: '#232323', fontWeight: 800 }}>
              {story.primary_category}
            </span>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="font-black text-2xl md:text-3xl leading-tight" style={{ color: '#FFF8F5' }}>{story.title}</h3>
          {story.subtitle && <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,248,245,0.55)' }}>{story.subtitle}</p>}
          <div className="flex items-center gap-2 mt-4">
            <span className="font-bold text-xs" style={{ color: '#00FFDA' }}>Read Story</span>
            <div className="h-px w-6" style={{ background: '#00FFDA' }} />
          </div>
        </div>
        <motion.div className="absolute bottom-0 left-0 h-0.5 right-0" style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
          whileHover={{ scaleX: 1 }} transition={{ duration: 0.35 }} />
      </Link>
    </motion.div>
  );
}

/* ── Driver portrait card ── */
function DriverCard({ driver, index }) {
  const img = driver.profile_image_url || driver.hero_image_url || FALLBACK_PORTRAIT;
  return (
    <motion.div custom={index} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
      <Link to={`/drivers/${driver.slug || driver.id}`} className="group relative overflow-hidden block" style={{ minHeight: 180, background: '#111' }}>
        <motion.img src={img} alt={`${driver.first_name} ${driver.last_name}`}
          className="absolute inset-0 w-full h-full object-cover object-top"
          style={{ filter: 'brightness(0.5) contrast(1.2)' }}
          whileHover={{ scale: 1.06 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.92) 30%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="font-black text-sm leading-tight" style={{ color: '#FFF8F5' }}>{driver.first_name} {driver.last_name}</div>
          {driver.primary_discipline && <div className="font-mono text-[9px] uppercase mt-0.5" style={{ color: '#00FFDA' }}>{driver.primary_discipline}</div>}
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
          whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
      </Link>
    </motion.div>
  );
}

/* ── Event date card ── */
function EventCard({ event, index }) {
  const img = event.cover_image || event.track_image || FALLBACK_RACE;
  return (
    <motion.div custom={index} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
      <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
        <Link to={createPageUrl('EventDirectory')} className="group flex items-center gap-3 overflow-hidden"
          style={{ background: '#0f1e2e', border: '1px solid rgba(255,248,245,0.07)' }}>
          {/* Date thumb */}
          <div className="relative shrink-0 w-16 h-16 overflow-hidden">
            <img src={img} alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.4) contrast(1.1)' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {event.event_date && (
                <>
                  <div className="font-black text-lg leading-none" style={{ color: '#FFF8F5' }}>{new Date(event.event_date).getDate()}</div>
                  <div className="font-mono text-[8px] uppercase" style={{ color: '#00FFDA' }}>{new Date(event.event_date).toLocaleString('en', { month: 'short' })}</div>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 py-3 pr-3">
            <div className="font-bold text-xs leading-tight truncate" style={{ color: '#FFF8F5' }}>{event.name}</div>
            {event.series_name && <div className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,248,245,0.35)' }}>{event.series_name}</div>}
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* ── Small story card ── */
function SmallStoryCard({ story, index }) {
  const img = story.cover_image || FALLBACK_RACE;
  return (
    <motion.div custom={index} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
      <Link to={`/story/${story.slug || story.id}`} className="group relative overflow-hidden flex gap-3"
        style={{ background: '#0f1e2e', border: '1px solid rgba(255,248,245,0.07)' }}>
        <div className="relative shrink-0 w-20 h-16 overflow-hidden">
          <motion.img src={img} alt={story.title} className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.6)' }} whileHover={{ scale: 1.08 }} transition={{ duration: 0.4 }} />
        </div>
        <div className="flex-1 min-w-0 py-2 pr-3 flex flex-col justify-center">
          {story.primary_category && <div className="font-mono text-[8px] uppercase mb-1" style={{ color: '#00FFDA' }}>{story.primary_category}</div>}
          <div className="font-bold text-xs leading-tight line-clamp-2" style={{ color: '#FFF8F5' }}>{story.title}</div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function DiscoverySection({ featuredDrivers = [], featuredStories = [], upcomingEvents = [] }) {
  const hasContent = featuredDrivers.length || featuredStories.length || upcomingEvents.length;
  if (!hasContent) return null;

  const primaryStory = featuredStories[0];
  const secondaryStories = featuredStories.slice(1, 4);

  return (
    <section style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(255,248,245,0.05)' }} className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div className="flex items-end justify-between mb-10"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
              <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Discover</span>
            </div>
            <h2 className="font-black text-3xl md:text-4xl leading-none" style={{ color: '#FFF8F5' }}>What's Happening</h2>
          </div>
          <Link to={createPageUrl('OutletHome')} className="font-bold text-xs uppercase hidden md:block" style={{ color: 'rgba(255,248,245,0.3)' }}>All Stories →</Link>
        </motion.div>

        {/* Main asymmetric grid */}
        <div className="grid grid-cols-12 gap-2 md:gap-3">
          {/* Large story — 5 cols, 2 rows */}
          {primaryStory && (
            <div className="col-span-12 md:col-span-5 md:row-span-2">
              <LargeStoryCard story={primaryStory} />
            </div>
          )}
          {/* Driver portraits — 4 cols */}
          {featuredDrivers.slice(0, 2).map((d, i) => (
            <div key={d.id} className="col-span-6 md:col-span-2">
              <DriverCard driver={d} index={i + 1} />
            </div>
          ))}
          {/* Third driver or story */}
          {featuredDrivers[2] && (
            <div className="col-span-6 md:col-span-2">
              <DriverCard driver={featuredDrivers[2]} index={3} />
            </div>
          )}
          {/* Secondary stories */}
          {secondaryStories.slice(0, 1).map((s, i) => (
            <div key={s.id} className="col-span-6 md:col-span-3">
              <SmallStoryCard story={s} index={i + 4} />
            </div>
          ))}
          {/* Events row */}
          {upcomingEvents.slice(0, 4).map((e, i) => (
            <div key={e.id} className="col-span-6 md:col-span-3">
              <EventCard event={e} index={i + 6} />
            </div>
          ))}
          {/* Remaining stories */}
          {secondaryStories.slice(1).map((s, i) => (
            <div key={s.id} className="col-span-6 md:col-span-3">
              <SmallStoryCard story={s} index={i + 10} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}