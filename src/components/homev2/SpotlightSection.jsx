import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const cardReveal = {
  hidden: { y: 32, opacity: 0 },
  visible: (i = 0) => ({
    y: 0, opacity: 1,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function SpotlightSection({ spotlightDriver, spotlightEvent, featuredStory }) {
  const hasContent = spotlightDriver || spotlightEvent || featuredStory;
  if (!hasContent) return null;

  const driverImg = spotlightDriver?.hero_image_url || spotlightDriver?.profile_image_url;

  return (
    <section style={{ background: '#1A3249', borderBottom: '1px solid rgba(0,255,218,0.12)' }} className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="flex items-center gap-3 mb-12"
          initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.4 }}
        >
          <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Spotlight</span>
        </motion.div>

        <div className={`grid gap-4 ${(spotlightDriver || spotlightEvent) && featuredStory ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
          {/* Driver spotlight */}
          {spotlightDriver && (
            <motion.div custom={0} variants={cardReveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
              <Link
                to={`/drivers/${spotlightDriver.slug || spotlightDriver.id}`}
                className="group relative overflow-hidden block"
                style={{ background: '#232323', minHeight: 380 }}
              >
                {driverImg && (
                  <>
                    <motion.img
                      src={driverImg}
                      alt={`${spotlightDriver.first_name} ${spotlightDriver.last_name}`}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                      style={{ filter: 'brightness(0.35) contrast(1.2)' }}
                      whileHover={{ scale: 1.04 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #232323 40%, transparent 100%)' }} />
                  </>
                )}
                <div className="relative z-10 p-8 flex flex-col justify-end" style={{ minHeight: 380 }}>
                  <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: '#D33F49' }}>Driver Spotlight</div>
                  <h3 className="font-black text-4xl md:text-5xl leading-none mb-3" style={{ color: '#FFF8F5' }}>
                    {spotlightDriver.first_name}<br />{spotlightDriver.last_name}
                  </h3>
                  {spotlightDriver.tagline && (
                    <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,248,245,0.6)' }}>{spotlightDriver.tagline}</p>
                  )}
                  <div className="flex items-center gap-2 mt-6">
                    <span className="font-bold text-xs tracking-wide" style={{ color: '#00FFDA' }}>View Profile</span>
                    <motion.div
                      className="h-px"
                      style={{ background: '#00FFDA' }}
                      initial={{ width: 16 }}
                      whileHover={{ width: 32 }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>
                <motion.div
                  className="absolute bottom-0 left-0 h-0.5"
                  style={{ background: '#00FFDA', originX: 0 }}
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              </Link>
            </motion.div>
          )}

          {/* Featured story */}
          {featuredStory && (
            <motion.div custom={1} variants={cardReveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
              <Link
                to={`/story/${featuredStory.slug || featuredStory.id}`}
                className="group relative overflow-hidden block"
                style={{ background: '#232323', minHeight: 380, border: '1px solid rgba(255,248,245,0.08)' }}
              >
                {featuredStory.cover_image && (
                  <>
                    <motion.img
                      src={featuredStory.cover_image}
                      alt={featuredStory.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ filter: 'brightness(0.3) contrast(1.2)' }}
                      whileHover={{ scale: 1.04 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #232323 50%, transparent 100%)' }} />
                  </>
                )}
                <div className="relative z-10 p-8 flex flex-col justify-end" style={{ minHeight: 380 }}>
                  {featuredStory.primary_category && (
                    <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: '#00FFDA' }}>
                      {featuredStory.primary_category}
                    </div>
                  )}
                  <h3 className="font-black text-2xl md:text-3xl leading-tight mb-3" style={{ color: '#FFF8F5' }}>{featuredStory.title}</h3>
                  {featuredStory.subtitle && (
                    <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(255,248,245,0.5)' }}>{featuredStory.subtitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-6">
                    <span className="font-bold text-xs tracking-wide" style={{ color: '#00FFDA' }}>Read Story</span>
                    <div className="w-4 h-px" style={{ background: '#00FFDA' }} />
                  </div>
                </div>
                <motion.div
                  className="absolute bottom-0 left-0 h-0.5"
                  style={{ background: '#00FFDA', originX: 0 }}
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}