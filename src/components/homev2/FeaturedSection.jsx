import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import EntityImage from '@/components/shared/EntityImage';

// ── Helpers ───────────────────────────────────────────────────────────────────

function tagItem(item, type) {
  return { ...item, _type: type };
}

function getHref(item) {
  if (item._type === 'driver') return `/drivers/${item.slug || item.id}`;
  if (item._type === 'event')  return createPageUrl('EventDirectory');
  return `/story/${item.slug || item.id}`;
}

function getEntityType(item) {
  if (item._type === 'driver') return 'driver';
  if (item._type === 'event')  return 'event';
  return 'story';
}

function getLabel(item) {
  if (item._type === 'driver') return item.primary_discipline || 'Driver';
  if (item._type === 'event')  return item.series_name || 'Event';
  return item.primary_category || 'Story';
}

function getTitle(item) {
  if (item._type === 'driver') return `${item.first_name} ${item.last_name}`;
  return item.name || item.title || '';
}

function getSub(item) {
  if (item._type === 'driver') return item.tagline || null;
  if (item._type === 'event')
    return item.event_date
      ? new Date(item.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null;
  return item.subtitle || null;
}

// ── Layer 1: Hero card (full width, dominant) ─────────────────────────────────

function HeroCard({ item }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <Link to={getHref(item)} className="group relative block overflow-hidden"
        style={{ height: 'clamp(420px, 55vh, 640px)', background: '#111' }}>
        <motion.div className="absolute inset-0"
          whileHover={{ scale: 1.02 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
          <EntityImage entity={item} entityType={getEntityType(item)} context="spotlight"
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ filter: 'brightness(0.38) contrast(1.15) saturate(1.05)' }} />
        </motion.div>
        {/* Gradient: strong bottom, subtle left */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.97) 28%, rgba(10,10,10,0.3) 60%, transparent 85%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.6) 0%, transparent 50%)' }} />

        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
          <div className="max-w-2xl">
            <span className="font-mono text-[9px] tracking-[0.45em] uppercase mb-4 inline-flex items-center gap-2"
              style={{ color: 'rgba(255,248,245,0.45)' }}>
              {getLabel(item)}
            </span>
            <h2 className="font-black leading-none mb-4"
              style={{ color: '#FFF8F5', fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
              {getTitle(item)}
            </h2>
            {getSub(item) && (
              <p className="text-base leading-relaxed max-w-lg mb-6"
                style={{ color: 'rgba(255,248,245,0.5)', fontSize: 'clamp(0.85rem, 1.5vw, 1rem)' }}>
                {getSub(item)}
              </p>
            )}
            <div className="inline-flex items-center gap-3">
              <span className="font-bold text-sm" style={{ color: '#00FFDA' }}>View</span>
              <div className="h-px w-10 transition-all duration-300 group-hover:w-16"
                style={{ background: '#00FFDA' }} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Layer 2: Secondary card (medium, side-by-side) ────────────────────────────

function SecondaryCard({ item, index }) {
  return (
    <motion.div
      custom={index} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}>
      <Link to={getHref(item)} className="group relative block overflow-hidden"
        style={{ height: 300, background: '#111' }}>
        <motion.div className="absolute inset-0"
          whileHover={{ scale: 1.04 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <EntityImage entity={item} entityType={getEntityType(item)} context="grid"
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ filter: 'brightness(0.42) contrast(1.1)' }} />
        </motion.div>
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.95) 35%, transparent 70%)' }} />
        <div className="absolute inset-0 p-5 flex flex-col justify-end">
          <span className="font-mono text-[8px] tracking-[0.35em] uppercase mb-2"
            style={{ color: 'rgba(255,248,245,0.4)' }}>
            {getLabel(item)}
          </span>
          <h3 className="font-black text-xl leading-tight mb-2" style={{ color: '#FFF8F5' }}>
            {getTitle(item)}
          </h3>
          {getSub(item) && (
            <p className="text-xs line-clamp-2" style={{ color: 'rgba(255,248,245,0.4)' }}>{getSub(item)}</p>
          )}
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
          whileHover={{ scaleX: 1 }} transition={{ duration: 0.35 }} />
      </Link>
    </motion.div>
  );
}

// ── Layer 3: Discovery grid card (small) ──────────────────────────────────────

function GridCard({ item, index }) {
  return (
    <motion.div
      custom={index} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}>
      <Link to={getHref(item)} className="group relative block overflow-hidden"
        style={{ height: 160, background: '#111' }}>
        <motion.div className="absolute inset-0"
          whileHover={{ scale: 1.06 }} transition={{ duration: 0.5 }}>
          <EntityImage entity={item} entityType={getEntityType(item)} context="feed"
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ filter: 'brightness(0.45) contrast(1.1)' }} />
        </motion.div>
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.95) 40%, transparent 75%)' }} />
        <div className="absolute inset-0 p-3 flex flex-col justify-end">
          <div className="font-mono text-[8px] uppercase mb-1 truncate"
            style={{ color: 'rgba(255,248,245,0.35)' }}>{getLabel(item)}</div>
          <div className="font-bold text-sm leading-tight truncate" style={{ color: '#FFF8F5' }}>
            {getTitle(item)}
          </div>
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
          whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
      </Link>
    </motion.div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function FeaturedSection({
  featuredDrivers = [],
  featuredStories  = [],
  upcomingEvents   = [],
  spotlightDriver  = null,
  featuredStory    = null,
}) {
  // Build a flat pool of all items, tagged by type
  const pool = [];
  if (spotlightDriver) pool.push(tagItem(spotlightDriver, 'driver'));
  featuredDrivers.forEach(d => {
    if (!pool.find(p => p.id === d.id)) pool.push(tagItem(d, 'driver'));
  });
  if (featuredStory) pool.push(tagItem(featuredStory, 'story'));
  featuredStories.forEach(s => {
    if (!pool.find(p => p.id === s.id)) pool.push(tagItem(s, 'story'));
  });
  upcomingEvents.forEach(e => pool.push(tagItem(e, 'event')));

  if (!pool.length) return null;

  // Layer 1: first item = hero
  const hero = pool[0];

  // Layer 2: next 2–3 items, mixed types
  const secondary = pool.slice(1, 4);

  // Layer 3: remaining up to 8 items
  const grid = pool.slice(4, 12);

  return (
    <section style={{ background: '#0a0a0a' }} className="py-14 md:py-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-2">

        {/* ── Layer 1: Hero ── */}
        <HeroCard item={hero} />

        {/* ── Layer 2: Secondary ── */}
        {secondary.length > 0 && (
          <div className={`grid gap-2 ${secondary.length === 1 ? 'grid-cols-1' : secondary.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
            {secondary.map((item, i) => (
              <SecondaryCard key={`${item._type}-${item.id}`} item={item} index={i} />
            ))}
          </div>
        )}

        {/* ── Layer 3: Discovery grid ── */}
        {grid.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {grid.map((item, i) => (
              <GridCard key={`${item._type}-${item.id}`} item={item} index={i} />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}