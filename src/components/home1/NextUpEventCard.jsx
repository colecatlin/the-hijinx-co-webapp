import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function formatDate(dateStr, endStr) {
  if (!dateStr) return null;
  try {
    const start = parseISO(dateStr);
    if (!endStr) return format(start, 'MMM d, yyyy').toUpperCase();
    const end = parseISO(endStr);
    if (isNaN(end.getTime()) || endStr === dateStr)
      return format(start, 'MMM d, yyyy').toUpperCase();
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`.toUpperCase();
  } catch {
    return null;
  }
}

export default function NextUpEventCard({ event, series, track, discipline }) {
  const to = `/events/${event.slug || event.id}`;
  const dateLabel = formatDate(event.event_date, event.end_date);
  const location = track
    ? [track.location_city, track.location_state].filter(Boolean).join(', ')
    : event.location_note;
  const seriesName = event.series_name || series?.name;
  const disciplineName = discipline?.name || series?.discipline;
  const disciplineColor = discipline?.color_code || '#232323';
  const trackOutline = track?.map_image_url;
  const image =
    event.event_cover_image_url ||
    track?.hero_image_url ||
    track?.image_url ||
    series?.hero_image_url ||
    series?.banner_url;

  return (
    <Link
      to={to}
      data-card
      className="group flex-shrink-0 w-[80vw] sm:w-[330px] md:w-[300px] lg:w-[278px] xl:w-[288px] snap-start flex flex-col border bg-[#F9F7F2] hover:bg-white transition-colors"
      style={{ borderColor: '#232323' }}
    >
      {/* Info area — text left, track outline right */}
      <div className="flex items-stretch border-b" style={{ borderColor: '#232323' }}>
        <div className="flex-1 p-4 min-w-0">
          {dateLabel && (
            <p
              className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2"
              style={{ color: '#232323' }}
            >
              {dateLabel}
            </p>
          )}
          <h3
            className="font-black uppercase leading-[0.95] tracking-[-0.01em] mb-2"
            style={{ color: '#232323', fontSize: 'clamp(1.05rem, 1.4vw, 1.3rem)' }}
          >
            {event.name}
          </h3>
          {seriesName && (
            <p
              className="font-mono text-[9px] tracking-[0.2em] uppercase truncate"
              style={{ color: 'rgba(35,35,35,0.6)' }}
            >
              {seriesName}
            </p>
          )}
          {location && (
            <p
              className="mt-1 flex items-center gap-1 font-mono text-[9px] tracking-wide"
              style={{ color: 'rgba(35,35,35,0.6)' }}
            >
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              {location}
            </p>
          )}
        </div>
        {trackOutline && (
          <div
            className="w-20 flex-shrink-0 border-l flex items-center justify-center p-2"
            style={{ borderColor: '#232323', background: 'rgba(35,35,35,0.03)' }}
          >
            <img
              src={trackOutline}
              alt={`${track?.name || 'Track'} layout`}
              className="w-full h-full object-contain"
              style={{ filter: 'grayscale(1) opacity(0.85)' }}
            />
          </div>
        )}
      </div>

      {/* Wide event photograph */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '16 / 9', background: '#F9F7F2' }}
      >
        {image ? (
          <img
            src={image}
            alt={event.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            style={{ filter: 'contrast(1.05) saturate(0.96)' }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'rgba(35,35,35,0.04)' }}
          >
            <span
              className="font-mono text-[10px] tracking-[0.4em] uppercase"
              style={{ color: 'rgba(35,35,35,0.35)' }}
            >
              HIJINX
            </span>
          </div>
        )}
      </div>

      {/* Footer — discipline tag + view event */}
      <div
        className="flex items-center justify-between px-4 h-11 border-t"
        style={{ borderColor: '#232323' }}
      >
        {disciplineName ? (
          <span
            className="font-mono text-[9px] tracking-[0.2em] uppercase font-bold"
            style={{ color: disciplineColor }}
          >
            {disciplineName}
          </span>
        ) : (
          <span />
        )}
        <span
          className="flex items-center gap-1 font-mono text-[9px] tracking-[0.2em] uppercase font-bold transition-transform group-hover:translate-x-0.5"
          style={{ color: '#232323' }}
        >
          VIEW EVENT <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}