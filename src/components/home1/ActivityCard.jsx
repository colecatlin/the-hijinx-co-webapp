import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const BONE = '#FFF8F5';
const OIL = '#232323';
const TEAL = '#00FFDA';
const RASP = '#D33F49';
const DENIM = '#1E3A5F';
const GREY = '#6B6B6B';

const SOURCE_STYLES = {
  OUTLET: { bg: RASP, text: '#FFFFFF', label: 'THE OUTLET' },
  HIJINX: { bg: TEAL, text: OIL, label: 'HIJINX' },
  INDEX46: { bg: OIL, text: '#FFFFFF', label: 'INDEX46' },
  MARKETPLACE: { bg: GREY, text: '#FFFFFF', label: 'MARKETPLACE' },
  RACECORE: { bg: DENIM, text: '#FFFFFF', label: 'RACECORE' },
  COMMUNITY: { bg: '#FFFFFF', text: OIL, label: 'COMMUNITY', border: OIL },
};

function timeAgo(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return formatDistanceToNow(d, { addSuffix: false }).toUpperCase();
  } catch {
    return null;
  }
}

function fallbackImg(seed) {
  return `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=800&q=80`;
}

export default function ActivityCard({ item }) {
  const s = SOURCE_STYLES[item.source] || SOURCE_STYLES.INDEX46;
  const img = item.image || fallbackImg(item.fallbackSeed);

  return (
    <Link
      to={item.to}
      className="group flex flex-col bg-white border transition-colors hover:border-[#232323]"
      style={{ borderColor: 'rgba(35,35,35,0.15)' }}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#f0ece6]">
        <img
          src={img}
          alt={item.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        {/* Source tag */}
        <span
          className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 font-mono text-[9px] tracking-[0.2em] uppercase font-bold"
          style={{
            background: s.bg,
            color: s.text,
            border: s.border ? `1px solid ${s.border}` : 'none',
          }}
        >
          {s.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <h3
          className="font-black uppercase leading-[1.05] tracking-[-0.01em] line-clamp-2"
          style={{ color: OIL, fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)' }}
        >
          {item.title}
        </h3>
        {item.body && (
          <p
            className="mt-2 text-[12px] leading-snug line-clamp-2"
            style={{ color: 'rgba(35,35,35,0.65)' }}
          >
            {item.body}
          </p>
        )}
        {/* Footer */}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <span
            className="font-mono text-[9px] tracking-[0.18em] uppercase"
            style={{ color: 'rgba(35,35,35,0.5)' }}
          >
            {item.time}
          </span>
          <span
            className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.18em] uppercase font-bold"
            style={{ color: OIL }}
          >
            {item.cta}
            <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}