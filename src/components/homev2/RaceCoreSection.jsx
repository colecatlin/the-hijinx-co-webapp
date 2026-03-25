import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function RaceCoreSection({ upcomingEvents = [], recentResults = [] }) {
  return (
    <section style={{ background: '#1A3249', borderBottom: '1px solid rgba(255,248,245,0.06)' }} className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Left — messaging */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
              <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Race Core</span>
            </div>
            <h2 className="font-black text-3xl md:text-4xl leading-none mb-5" style={{ color: '#FFF8F5' }}>
              The Event Platform<br />Built for Real Racing.
            </h2>
            <p className="text-sm leading-relaxed mb-8 max-w-sm" style={{ color: 'rgba(255,248,245,0.55)' }}>
              Live entry management, real-time results, tech inspection, timing sync, and multi-party event collaboration — all in one system.
            </p>
            <Link
              to={createPageUrl('Registration')}
              className="inline-flex items-center gap-3 px-5 py-3 font-bold text-sm tracking-wide uppercase transition-colors"
              style={{ border: '1px solid rgba(0,255,218,0.4)', color: '#00FFDA' }}
            >
              Learn More
            </Link>
          </div>

          {/* Right — live data */}
          <div>
            {upcomingEvents.length > 0 && (
              <div className="mb-6">
                <div className="font-mono text-[9px] tracking-[0.3em] uppercase mb-3 pb-2" style={{ color: 'rgba(255,248,245,0.3)', borderBottom: '1px solid rgba(255,248,245,0.08)' }}>
                  Upcoming Events
                </div>
                <div className="flex flex-col gap-1">
                  {upcomingEvents.slice(0, 4).map(event => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between py-3 px-4"
                      style={{ background: '#232323', borderLeft: '2px solid rgba(0,255,218,0.3)' }}
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="font-semibold text-sm truncate" style={{ color: '#FFF8F5' }}>{event.name}</div>
                        {event.series_name && (
                          <div className="font-mono text-[9px] uppercase mt-0.5" style={{ color: 'rgba(255,248,245,0.3)' }}>{event.series_name}</div>
                        )}
                      </div>
                      {event.event_date && (
                        <div className="font-mono text-xs shrink-0" style={{ color: '#00FFDA' }}>
                          {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentResults?.length > 0 && (
              <div>
                <div className="font-mono text-[9px] tracking-[0.3em] uppercase mb-3 pb-2" style={{ color: 'rgba(255,248,245,0.3)', borderBottom: '1px solid rgba(255,248,245,0.08)' }}>
                  Recent Results
                </div>
                <div className="flex flex-col gap-1">
                  {recentResults.slice(0, 3).map((result, i) => (
                    <div key={result.id || i} className="flex items-center gap-4 py-2 px-4" style={{ background: '#232323' }}>
                      <span className="font-black text-lg w-8" style={{ color: result.position === 1 ? '#00FFDA' : 'rgba(255,248,245,0.3)' }}>
                        P{result.position}
                      </span>
                      <span className="text-sm" style={{ color: '#FFF8F5' }}>{result.driver_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}