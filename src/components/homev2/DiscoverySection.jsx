import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';

const reveal = {
  hidden: { y: 28, opacity: 0 },
  visible: (i = 0) => ({
    y: 0, opacity: 1,
    transition: { duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

function DriverCard({ driver, index }) {
  const img = driver.profile_image_url || driver.hero_image_url;
  return (
    <motion.div custom={index} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
      <Link
        to={`/drivers/${driver.slug || driver.id}`}
        className="group relative overflow-hidden block"
        style={{ background: '#1A3249', border: '1px solid rgba(255,248,245,0.08)' }}
      >
        <motion.div className="aspect-[3/4] overflow-hidden" whileHover="hover">
          {img ? (
            <motion.img
              src={img}
              alt={`${driver.first_name} ${driver.last_name}`}
              className="w-full h-full object-cover object-top"
              style={{ filter: 'contrast(1.1)' }}
              variants={{ hover: { scale: 1.06, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: '#232323' }}>
              <span className="font-black text-4xl" style={{ color: 'rgba(255,248,245,0.1)' }}>
                {driver.first_name?.[0]}{driver.last_name?.[0]}
              </span>
            </div>
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #232323 25%, transparent 70%)' }} />
        </motion.div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="font-black text-sm leading-tight" style={{ color: '#FFF8F5' }}>
            {driver.first_name} {driver.last_name}
          </div>
          {driver.primary_discipline && (
            <div className="font-mono text-[9px] tracking-widest uppercase mt-1" style={{ color: '#00FFDA' }}>
              {driver.primary_discipline}
            </div>
          )}
        </div>
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </Link>
    </motion.div>
  );
}

function StoryCard({ story, large = false, index }) {
  return (
    <motion.div custom={index} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
      <Link
        to={`/story/${story.slug || story.id}`}
        className="group relative overflow-hidden block"
        style={{ background: '#1A3249', border: '1px solid rgba(255,248,245,0.08)' }}
      >
        <div className={`overflow-hidden ${large ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
          {story.cover_image ? (
            <motion.img
              src={story.cover_image}
              alt={story.title}
              className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.8) contrast(1.1)' }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : (
            <div className={`${large ? 'aspect-[16/9]' : 'aspect-[4/3]'}`} style={{ background: '#232323' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #232323 30%, transparent 70%)' }} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {story.primary_category && (
            <div className="font-mono text-[9px] tracking-widest uppercase mb-2" style={{ color: '#00FFDA' }}>
              {story.primary_category}
            </div>
          )}
          <div className={`font-black leading-tight ${large ? 'text-lg' : 'text-sm'}`} style={{ color: '#FFF8F5' }}>
            {story.title}
          </div>
        </div>
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
      </Link>
    </motion.div>
  );
}

function EventCard({ event, index }) {
  return (
    <motion.div custom={index} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
      <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
        <Link
          to={createPageUrl('EventDirectory')}
          className="group flex items-start gap-4 p-4 transition-colors"
          style={{ background: '#1A3249', border: '1px solid rgba(255,248,245,0.08)' }}
        >
          <div className="shrink-0 text-center px-3 py-2" style={{ background: '#232323', minWidth: 52 }}>
            {event.event_date && (
              <>
                <div className="font-black text-xl leading-none" style={{ color: '#FFF8F5' }}>
                  {new Date(event.event_date).getDate()}
                </div>
                <div className="font-mono text-[9px] tracking-widest uppercase mt-1" style={{ color: '#00FFDA' }}>
                  {new Date(event.event_date).toLocaleString('en', { month: 'short' })}
                </div>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm leading-tight truncate" style={{ color: '#FFF8F5' }}>{event.name}</div>
            {event.series_name && (
              <div className="text-xs mt-1 truncate" style={{ color: 'rgba(255,248,245,0.4)' }}>{event.series_name}</div>
            )}
          </div>
          <motion.div
            className="shrink-0 self-center w-1.5 h-1.5 rounded-full"
            style={{ background: '#00FFDA' }}
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
          />
        </Link>
      </motion.div>
    </motion.div>
  );
}

export default function DiscoverySection({ featuredDrivers = [], featuredStories = [], upcomingEvents = [] }) {
  const hasContent = featuredDrivers.length || featuredStories.length || upcomingEvents.length;
  if (!hasContent) return null;

  const primaryStory = featuredStories[0];
  const secondaryStories = featuredStories.slice(1, 3);

  return (
    <section style={{ background: '#232323', borderBottom: '1px solid rgba(255,248,245,0.06)' }} className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="flex items-end justify-between mb-10"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
              <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Discover</span>
            </div>
            <h2 className="font-black text-3xl md:text-4xl leading-none" style={{ color: '#FFF8F5' }}>What's Happening</h2>
          </div>
        </motion.div>

        <div className="grid grid-cols-12 gap-3">
          {primaryStory && (
            <div className="col-span-12 md:col-span-5">
              <StoryCard story={primaryStory} large index={0} />
            </div>
          )}
          {featuredDrivers.length > 0 && (
            <div className="col-span-12 md:col-span-4 grid grid-cols-3 gap-2">
              {featuredDrivers.slice(0, 3).map((d, i) => <DriverCard key={d.id} driver={d} index={i + 1} />)}
            </div>
          )}
          <div className="col-span-12 md:col-span-3 flex flex-col gap-3">
            {secondaryStories.map((s, i) => <StoryCard key={s.id} story={s} index={i + 4} />)}
            {upcomingEvents.slice(0, 2).map((e, i) => <EventCard key={e.id} event={e} index={i + 6} />)}
          </div>
        </div>

        {upcomingEvents.length > 2 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {upcomingEvents.slice(2, 6).map((e, i) => <EventCard key={e.id} event={e} index={i + 8} />)}
          </div>
        )}
      </div>
    </section>
  );
}