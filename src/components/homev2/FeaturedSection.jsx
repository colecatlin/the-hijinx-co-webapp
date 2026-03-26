import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import EntityImage from '@/components/shared/EntityImage';

const reveal = {
  hidden: { y: 24, opacity: 0 },
  visible: (i = 0) => ({ y: 0, opacity: 1, transition: { duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] } }),
};

// ── Unified large feature card ────────────────────────────────────────────────
function FeatureCard({ item, index }) {
  const isDriver = !!item._isDriver;
  const href = isDriver
    ? `/drivers/${item.slug || item.id}`
    : item._isEvent
      ? createPageUrl('EventDirectory')
      : `/story/${item.slug || item.id}`;

  const label = isDriver ? 'Driver' : item._isEvent ? 'Event' : item.primary_category || 'Story';
  const title = isDriver ? `${item.first_name} ${item.last_name}` : item.name || item.title;
  const sub   = isDriver ? item.primary_discipline : item._isEvent ? item.series_name : item.subtitle;

  return (
    <motion.div custom={index} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
      <Link to={href} className="group relative overflow-hidden block" style={{ height: 480, background: '#111' }}>
        <motion.div className="absolute inset-0" whileHover={{ scale: 1.03 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <EntityImage
            entity={item}
            entityType={isDriver ? 'driver' : item._isEvent ? 'event' : 'story'}
            context="spotlight"
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ filter: 'brightness(0.42) contrast(1.15)' }}
          />
        </motion.div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.97) 30%, transparent 65%)' }} />
        <div className="absolute inset-0 p-8 flex flex-col justify-end">
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3 inline-block" style={{ color: 'rgba(255,248,245,0.4)' }}>
            {label}
          </span>
          <h3 className="font-black leading-tight mb-3" style={{ color: '#FFF8F5', fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>{title}</h3>
          {sub && <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,248,245,0.45)' }}>{sub}</p>}
          <div className="flex items-center gap-2 mt-5">
            <span className="font-bold text-sm" style={{ color: '#00FFDA' }}>View</span>
            <div className="h-px w-8" style={{ background: '#00FFDA' }} />
          </div>
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
          whileHover={{ scaleX: 1 }} transition={{ duration: 0.4 }} />
      </Link>
    </motion.div>
  );
}

// ── Unified grid card ─────────────────────────────────────────────────────────
function GridCard({ item, index }) {
  const isDriver = !!item._isDriver;
  const href = isDriver
    ? `/drivers/${item.slug || item.id}`
    : item._isEvent
      ? createPageUrl('EventDirectory')
      : `/story/${item.slug || item.id}`;

  const title = isDriver ? `${item.first_name} ${item.last_name}` : item.name || item.title;
  const meta  = isDriver ? item.primary_discipline : item._isEvent
    ? item.event_date
      ? new Date(item.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : item.series_name
    : item.primary_category;

  return (
    <motion.div custom={index} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
      <Link to={href} className="group relative overflow-hidden block" style={{ height: 200, background: '#111' }}>
        <motion.div className="absolute inset-0" whileHover={{ scale: 1.06 }} transition={{ duration: 0.5 }}>
          <EntityImage
            entity={item}
            entityType={isDriver ? 'driver' : item._isEvent ? 'event' : 'story'}
            context="grid"
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ filter: 'brightness(0.48) contrast(1.15)' }}
          />
        </motion.div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.93) 30%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="font-black text-sm leading-tight" style={{ color: '#FFF8F5' }}>{title}</div>
          {meta && <div className="font-mono text-[9px] uppercase mt-1" style={{ color: '#00FFDA' }}>{meta}</div>}
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
          whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
      </Link>
    </motion.div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────
export default function FeaturedSection({
  featuredDrivers = [],
  featuredStories = [],
  upcomingEvents  = [],
  spotlightDriver  = null,
  featuredStory    = null,
}) {
  const hasAny = featuredDrivers.length || featuredStories.length || upcomingEvents.length || spotlightDriver || featuredStory;
  if (!hasAny) return null;

  // Build the top 2 large feature items: prefer spotlight driver + featured story
  const largeItems = [];
  if (spotlightDriver) largeItems.push({ ...spotlightDriver, _isDriver: true });
  else if (featuredDrivers[0]) largeItems.push({ ...featuredDrivers[0], _isDriver: true });

  if (featuredStory) largeItems.push({ ...featuredStory });
  else if (featuredStories[0]) largeItems.push({ ...featuredStories[0] });

  // Build the grid: remaining drivers, stories, and upcoming events
  const gridItems = [];
  const usedDriverId  = largeItems.find(i => i._isDriver)?.id;
  const usedStoryId   = largeItems.find(i => !i._isDriver && !i._isEvent)?.id;

  featuredDrivers.slice(usedDriverId ? 1 : 0, 4).forEach(d => gridItems.push({ ...d, _isDriver: true }));
  featuredStories.slice(usedStoryId  ? 1 : 0, 3).forEach(s => gridItems.push({ ...s }));
  upcomingEvents.slice(0, 4).forEach(e => gridItems.push({ ...e, _isEvent: true }));

  return (
    <section style={{ background: '#0a0a0a' }} className="py-14 md:py-18">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section header — minimal */}
        <motion.div className="flex items-end justify-between mb-8"
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <h2 className="font-black text-3xl md:text-4xl leading-none" style={{ color: '#FFF8F5' }}>Featured</h2>
          <Link to={createPageUrl('OutletHome')} className="font-bold text-xs uppercase hidden md:block" style={{ color: 'rgba(255,248,245,0.25)' }}>All Stories →</Link>
        </motion.div>

        {/* Large feature cards */}
        {largeItems.length > 0 && (
          <div className={`grid gap-2 mb-2 ${largeItems.length >= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {largeItems.map((item, i) => (
              <FeatureCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}

        {/* Mixed grid */}
        {gridItems.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {gridItems.map((item, i) => (
              <GridCard key={`${item._isDriver ? 'd' : item._isEvent ? 'e' : 's'}-${item.id}`} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}