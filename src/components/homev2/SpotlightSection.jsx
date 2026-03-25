import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBestImage, getFallback } from '@/utils/imageResolver';

const FALLBACK = 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=1200&q=80';

export default function SpotlightSection({ spotlightDriver, spotlightEvent, featuredStory }) {
  const hasContent = spotlightDriver || spotlightEvent || featuredStory;
  if (!hasContent) return null;

  const driverImg = getBestImage(spotlightDriver, 'driver', 'spotlight');
  const storyImg = getBestImage(featuredStory, 'story', 'spotlight');

  return (
    <section style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(255,248,245,0.04)' }} className="py-0">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <motion.div className="flex items-center gap-3 mb-10"
          initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Spotlight</span>
        </motion.div>

        <div className={`grid gap-2 ${spotlightDriver && featuredStory ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Driver — full-bleed cinematic card */}
          {spotlightDriver && (
            <motion.div
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link to={`/drivers/${spotlightDriver.slug || spotlightDriver.id}`}
                className="group relative overflow-hidden block" style={{ height: 520, background: '#111' }}>
                <motion.img src={driverImg} alt={`${spotlightDriver.first_name} ${spotlightDriver.last_name}`}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                  style={{ filter: 'brightness(0.45) contrast(1.2) saturate(1.05)' }}
                  whileHover={{ scale: 1.03 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                {/* Vignette */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,10,10,0.85) 30%, transparent 70%), linear-gradient(to top, rgba(10,10,10,0.95) 25%, transparent 60%)' }} />
                {/* Content */}
                <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-end">
                  <span className="font-mono text-[9px] tracking-[0.45em] uppercase mb-4 inline-flex items-center gap-2" style={{ color: '#D33F49' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D33F49' }} />
                    Driver Spotlight
                  </span>
                  <h2 className="font-black leading-none mb-4" style={{ color: '#FFF8F5', fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}>
                    {spotlightDriver.first_name}<br />{spotlightDriver.last_name}
                  </h2>
                  {spotlightDriver.primary_discipline && (
                    <div className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'rgba(255,248,245,0.4)' }}>
                      {spotlightDriver.primary_discipline}
                    </div>
                  )}
                  {spotlightDriver.tagline && (
                    <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'rgba(255,248,245,0.55)' }}>{spotlightDriver.tagline}</p>
                  )}
                  <div className="flex items-center gap-2 mt-6">
                    <span className="font-bold text-sm" style={{ color: '#00FFDA' }}>View Profile</span>
                    <div className="h-px w-8" style={{ background: '#00FFDA' }} />
                  </div>
                </div>
                <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
                  whileHover={{ scaleX: 1 }} transition={{ duration: 0.5 }} />
              </Link>
            </motion.div>
          )}

          {/* Featured story */}
          {featuredStory && (
            <motion.div
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link to={`/story/${featuredStory.slug || featuredStory.id}`}
                className="group relative overflow-hidden block" style={{ height: 520, background: '#111' }}>
                <motion.img src={storyImg} alt={featuredStory.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ filter: 'brightness(0.4) contrast(1.15) saturate(1.05)' }}
                  whileHover={{ scale: 1.03 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.97) 30%, transparent 65%)' }} />
                <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-end">
                  {featuredStory.primary_category && (
                    <span className="font-mono text-[9px] tracking-widest uppercase mb-4 inline-block px-2 py-1" style={{ background: '#00FFDA', color: '#232323', fontWeight: 800, width: 'fit-content' }}>
                      {featuredStory.primary_category}
                    </span>
                  )}
                  <h2 className="font-black text-3xl md:text-4xl leading-tight mb-4" style={{ color: '#FFF8F5' }}>{featuredStory.title}</h2>
                  {featuredStory.subtitle && (
                    <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(255,248,245,0.5)' }}>{featuredStory.subtitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-6">
                    <span className="font-bold text-sm" style={{ color: '#00FFDA' }}>Read Story</span>
                    <div className="h-px w-8" style={{ background: '#00FFDA' }} />
                  </div>
                </div>
                <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
                  whileHover={{ scaleX: 1 }} transition={{ duration: 0.5 }} />
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}