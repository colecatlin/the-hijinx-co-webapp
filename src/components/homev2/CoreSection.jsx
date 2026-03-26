import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';

const DIRECTORIES = [
  { label: 'Drivers', page: 'DriverDirectory', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70' },
  { label: 'Teams',   page: 'TeamDirectory',   image: 'https://images.unsplash.com/photo-1547043386-e31db9b6a69c?w=400&q=70' },
  { label: 'Tracks',  page: 'TrackDirectory',  image: 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=400&q=70' },
  { label: 'Series',  page: 'SeriesHome',      image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=70' },
  { label: 'Events',  page: 'EventDirectory',  image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=70' },
];

function EventItem({ event, index }) {
  const date = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.3, delay: index * 0.06 }}
      className="flex items-center gap-4 py-3"
      style={{ borderBottom: '1px solid rgba(255,248,245,0.06)' }}>
      {date && (
        <div className="shrink-0 w-12 text-center">
          <div className="font-black text-base leading-none" style={{ color: '#00FFDA' }}>
            {new Date(event.event_date).getDate()}
          </div>
          <div className="font-mono text-[9px] uppercase mt-0.5" style={{ color: 'rgba(255,248,245,0.35)' }}>
            {new Date(event.event_date).toLocaleString('en', { month: 'short' })}
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate" style={{ color: '#FFF8F5' }}>{event.name}</div>
        {event.series_name && (
          <div className="font-mono text-[9px] uppercase mt-0.5 truncate" style={{ color: 'rgba(255,248,245,0.35)' }}>
            {event.series_name}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ResultItem({ result, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.3, delay: index * 0.06 }}
      className="flex items-center gap-4 py-3"
      style={{ borderBottom: '1px solid rgba(255,248,245,0.06)' }}>
      <span className="font-black text-xl w-10 shrink-0"
        style={{ color: result.position === 1 ? '#00FFDA' : result.position <= 3 ? 'rgba(255,248,245,0.5)' : 'rgba(255,248,245,0.25)' }}>
        P{result.position}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate" style={{ color: '#FFF8F5' }}>{result.driver_id}</div>
      </div>
    </motion.div>
  );
}

function DirTile({ dir, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.35, delay: index * 0.06 }}>
      <Link to={createPageUrl(dir.page)} className="group relative block overflow-hidden"
        style={{ height: 90, background: '#111' }}>
        <img src={dir.image} alt={dir.label}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ filter: 'brightness(0.28) contrast(1.1) saturate(0.7)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.7) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 flex items-center px-4">
          <span className="font-black text-lg transition-colors duration-200 group-hover:text-[#00FFDA]"
            style={{ color: '#FFF8F5' }}>{dir.label}</span>
        </div>
        <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-300"
          style={{ background: '#00FFDA' }} />
      </Link>
    </motion.div>
  );
}

export default function CoreSection({ upcomingEvents = [], recentResults = [] }) {
  return (
    <section style={{ background: '#0d0d0d', borderTop: '1px solid rgba(255,248,245,0.05)' }}>
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">

        {/* Single unified header */}
        <motion.div className="flex items-center gap-3 mb-10"
          initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>
            Platform
          </span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">

          {/* ── Left (60%): Live data ── */}
          <div className="lg:col-span-3 space-y-10">

            {upcomingEvents.length > 0 && (
              <div>
                <div className="font-mono text-[9px] tracking-[0.35em] uppercase mb-1"
                  style={{ color: 'rgba(255,248,245,0.3)' }}>
                  Upcoming Events
                </div>
                <div>
                  {upcomingEvents.slice(0, 5).map((e, i) => (
                    <EventItem key={e.id} event={e} index={i} />
                  ))}
                </div>
                <Link to={createPageUrl('EventDirectory')}
                  className="inline-block mt-4 font-bold text-xs uppercase tracking-wide"
                  style={{ color: 'rgba(255,248,245,0.25)' }}>
                  All Events →
                </Link>
              </div>
            )}

            {recentResults?.length > 0 && (
              <div>
                <div className="font-mono text-[9px] tracking-[0.35em] uppercase mb-1"
                  style={{ color: 'rgba(255,248,245,0.3)' }}>
                  Recent Results
                </div>
                <div>
                  {recentResults.slice(0, 4).map((r, i) => (
                    <ResultItem key={r.id || i} result={r} index={i} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <Link to={createPageUrl('Registration')}
                className="inline-flex items-center gap-3 px-5 py-3 font-bold text-sm tracking-wide uppercase"
                style={{ border: '1px solid rgba(0,255,218,0.3)', color: '#00FFDA' }}>
                Race Core Platform →
              </Link>
            </div>
          </div>

          {/* ── Right (40%): Navigation tiles ── */}
          <div className="lg:col-span-2">
            <div className="font-mono text-[9px] tracking-[0.35em] uppercase mb-4"
              style={{ color: 'rgba(255,248,245,0.3)' }}>
              Explore
            </div>
            <div className="flex flex-col gap-1">
              {DIRECTORIES.map((dir, i) => (
                <DirTile key={dir.page} dir={dir} index={i} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}