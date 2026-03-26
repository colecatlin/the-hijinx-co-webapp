import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { getFallback } from '@/utils/imageResolver';

const RACE_BG = getFallback('track');

const DIRECTORIES = [
  { label: 'Drivers',  page: 'DriverDirectory',  meta: 'Profiles & Stats',     image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70' },
  { label: 'Teams',    page: 'TeamDirectory',     meta: 'Rosters & Programs',   image: 'https://images.unsplash.com/photo-1547043386-e31db9b6a69c?w=400&q=70' },
  { label: 'Tracks',   page: 'TrackDirectory',    meta: 'Venues & Layouts',     image: 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=400&q=70' },
  { label: 'Series',   page: 'SeriesHome',        meta: 'Championships',        image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=70' },
];

function EventRow({ event, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.35, delay: index * 0.07 }}>
      <div className="flex items-center justify-between py-3 px-4"
        style={{ background: 'rgba(10,10,10,0.6)', borderLeft: '2px solid rgba(0,255,218,0.4)' }}>
        <div className="flex-1 min-w-0 mr-4">
          <div className="font-semibold text-sm truncate" style={{ color: '#FFF8F5' }}>{event.name}</div>
          {event.series_name && <div className="font-mono text-[9px] uppercase mt-0.5" style={{ color: 'rgba(255,248,245,0.35)' }}>{event.series_name}</div>}
        </div>
        {event.event_date && (
          <div className="font-mono text-xs shrink-0" style={{ color: '#00FFDA' }}>
            {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DirCard({ dir, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.07 }}
      whileHover={{ y: -4 }}>
      <Link to={createPageUrl(dir.page)} className="group relative overflow-hidden block" style={{ height: 120, background: '#111' }}>
        <img src={dir.image} alt={dir.label} className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.3) contrast(1.1) saturate(0.8)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.95) 35%, transparent 80%)' }} />
        <div className="absolute inset-0 p-3 flex flex-col justify-end">
          <div className="font-black text-base leading-tight transition-colors group-hover:text-[#00FFDA]" style={{ color: '#FFF8F5' }}>{dir.label}</div>
          <div className="text-[9px]" style={{ color: 'rgba(255,248,245,0.35)' }}>{dir.meta}</div>
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
          whileHover={{ scaleX: 1 }} transition={{ duration: 0.25 }} />
      </Link>
    </motion.div>
  );
}

export default function CoreSection({ upcomingEvents = [], recentResults = [] }) {
  return (
    <section className="relative overflow-hidden" style={{ background: '#0a0a0a', borderTop: '1px solid rgba(255,248,245,0.04)' }}>
      {/* Right-half background image */}
      <div className="absolute inset-0 z-0">
        <img src={RACE_BG} alt="" className="absolute right-0 top-0 h-full w-1/2 object-cover"
          style={{ filter: 'brightness(0.15) contrast(1.2) saturate(0.7)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0a0a0a 45%, transparent 85%)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Left: Race Core + events/results */}
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <h2 className="font-black text-3xl md:text-4xl leading-none mb-3" style={{ color: '#FFF8F5' }}>
                Race Core
              </h2>
              <p className="text-sm leading-relaxed mb-6 max-w-sm" style={{ color: 'rgba(255,248,245,0.5)' }}>
                Live entry management, real-time results, tech inspection, timing sync, and multi-party event collaboration.
              </p>
              <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                <Link to={createPageUrl('Registration')}
                  className="inline-flex items-center gap-3 px-5 py-3 font-bold text-sm tracking-wide uppercase mb-8"
                  style={{ border: '1px solid rgba(0,255,218,0.4)', color: '#00FFDA' }}>
                  Learn More
                </Link>
              </motion.div>
            </motion.div>

            {upcomingEvents.length > 0 && (
              <div className="mb-5">
                <div className="font-mono text-[9px] tracking-[0.3em] uppercase mb-3 pb-2"
                  style={{ color: 'rgba(255,248,245,0.3)', borderBottom: '1px solid rgba(255,248,245,0.08)' }}>
                  Upcoming Events
                </div>
                <div className="flex flex-col gap-1">
                  {upcomingEvents.slice(0, 4).map((e, i) => <EventRow key={e.id} event={e} index={i} />)}
                </div>
              </div>
            )}

            {recentResults?.length > 0 && (
              <div>
                <div className="font-mono text-[9px] tracking-[0.3em] uppercase mb-3 pb-2"
                  style={{ color: 'rgba(255,248,245,0.3)', borderBottom: '1px solid rgba(255,248,245,0.08)' }}>
                  Recent Results
                </div>
                <div className="flex flex-col gap-1">
                  {recentResults.slice(0, 3).map((r, i) => (
                    <motion.div key={r.id || i} className="flex items-center gap-4 py-2 px-4"
                      style={{ background: 'rgba(10,10,10,0.6)' }}
                      initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.06 }}>
                      <span className="font-black text-lg w-8" style={{ color: r.position === 1 ? '#00FFDA' : 'rgba(255,248,245,0.3)' }}>
                        P{r.position}
                      </span>
                      <span className="text-sm" style={{ color: '#FFF8F5' }}>{r.driver_id}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Directory navigation */}
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
              <h2 className="font-black text-3xl md:text-4xl leading-none mb-6" style={{ color: '#FFF8F5' }}>
                Enter the Ecosystem
              </h2>
            </motion.div>
            <div className="grid grid-cols-2 gap-2">
              {DIRECTORIES.map((dir, i) => <DirCard key={dir.page} dir={dir} index={i} />)}
            </div>
            <div className="mt-3">
              <Link to={createPageUrl('EventDirectory')}
                className="group relative overflow-hidden block" style={{ height: 80, background: '#111' }}>
                <img src="https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=70"
                  alt="Events" className="absolute inset-0 w-full h-full object-cover"
                  style={{ filter: 'brightness(0.3) contrast(1.1) saturate(0.8)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.95) 35%, transparent 80%)' }} />
                <div className="absolute inset-0 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-black text-base transition-colors group-hover:text-[#00FFDA]" style={{ color: '#FFF8F5' }}>Events</div>
                    <div className="text-[9px]" style={{ color: 'rgba(255,248,245,0.35)' }}>Schedule & Results</div>
                  </div>
                  <span className="font-mono text-[9px]" style={{ color: 'rgba(255,248,245,0.3)' }}>05</span>
                </div>
                <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
                  whileHover={{ scaleX: 1 }} transition={{ duration: 0.25 }} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}