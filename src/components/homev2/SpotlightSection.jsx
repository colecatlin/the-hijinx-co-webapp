import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function SpotlightSection({ spotlightDriver, spotlightEvent, featuredStory }) {
  const hasContent = spotlightDriver || spotlightEvent || featuredStory;
  if (!hasContent) return null;

  const driverImg = spotlightDriver?.hero_image_url || spotlightDriver?.profile_image_url;

  return (
    <section style={{ background: '#1A3249', borderBottom: '1px solid rgba(0,255,218,0.12)' }} className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Spotlight</span>
        </div>

        <div className={`grid gap-4 ${(spotlightDriver || spotlightEvent) && featuredStory ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>

          {/* Driver spotlight */}
          {spotlightDriver && (
            <Link
              to={`/drivers/${spotlightDriver.slug || spotlightDriver.id}`}
              className="group relative overflow-hidden block"
              style={{ background: '#232323', minHeight: 380 }}
            >
              {driverImg && (
                <>
                  <img
                    src={driverImg}
                    alt={`${spotlightDriver.first_name} ${spotlightDriver.last_name}`}
                    className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    style={{ filter: 'brightness(0.35) contrast(1.2)' }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #232323 40%, transparent 100%)' }} />
                </>
              )}
              <div className="relative z-10 p-8 flex flex-col justify-end h-full" style={{ minHeight: 380 }}>
                <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: '#D33F49' }}>
                  Driver Spotlight
                </div>
                <h3 className="font-black text-4xl md:text-5xl leading-none mb-3" style={{ color: '#FFF8F5' }}>
                  {spotlightDriver.first_name}<br />{spotlightDriver.last_name}
                </h3>
                {spotlightDriver.tagline && (
                  <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,248,245,0.6)' }}>
                    {spotlightDriver.tagline}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-6">
                  <span className="font-bold text-xs tracking-wide" style={{ color: '#00FFDA' }}>View Profile</span>
                  <div className="w-4 h-px" style={{ background: '#00FFDA' }} />
                </div>
              </div>
              {/* Bottom teal line */}
              <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500" style={{ background: '#00FFDA' }} />
            </Link>
          )}

          {/* Event spotlight */}
          {spotlightEvent && !featuredStory && (
            <div
              className="relative overflow-hidden"
              style={{ background: '#232323', minHeight: 380, border: '1px solid rgba(255,248,245,0.08)' }}
            >
              <div className="p-8 flex flex-col justify-end h-full" style={{ minHeight: 380 }}>
                <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: '#D33F49' }}>
                  Event Spotlight
                </div>
                <h3 className="font-black text-3xl leading-tight mb-3" style={{ color: '#FFF8F5' }}>
                  {spotlightEvent.name}
                </h3>
                {spotlightEvent.event_date && (
                  <div className="font-mono text-sm" style={{ color: '#00FFDA' }}>
                    {new Date(spotlightEvent.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
                {spotlightEvent.series_name && (
                  <div className="text-xs mt-2" style={{ color: 'rgba(255,248,245,0.4)' }}>{spotlightEvent.series_name}</div>
                )}
              </div>
            </div>
          )}

          {/* Featured story */}
          {featuredStory && (
            <Link
              to={`/story/${featuredStory.slug || featuredStory.id}`}
              className="group relative overflow-hidden block"
              style={{ background: '#232323', minHeight: 380, border: '1px solid rgba(255,248,245,0.08)' }}
            >
              {featuredStory.cover_image && (
                <>
                  <img
                    src={featuredStory.cover_image}
                    alt={featuredStory.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ filter: 'brightness(0.3) contrast(1.2)' }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #232323 50%, transparent 100%)' }} />
                </>
              )}
              <div className="relative z-10 p-8 flex flex-col justify-end h-full" style={{ minHeight: 380 }}>
                {featuredStory.primary_category && (
                  <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: '#00FFDA' }}>
                    {featuredStory.primary_category}
                  </div>
                )}
                <h3 className="font-black text-2xl md:text-3xl leading-tight mb-3" style={{ color: '#FFF8F5' }}>
                  {featuredStory.title}
                </h3>
                {featuredStory.subtitle && (
                  <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(255,248,245,0.5)' }}>
                    {featuredStory.subtitle}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-6">
                  <span className="font-bold text-xs tracking-wide" style={{ color: '#00FFDA' }}>Read Story</span>
                  <div className="w-4 h-px" style={{ background: '#00FFDA' }} />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500" style={{ background: '#00FFDA' }} />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}