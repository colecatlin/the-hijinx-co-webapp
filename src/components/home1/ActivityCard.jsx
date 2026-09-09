import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const OIL = '#232323';
const TEAL = '#00AAB5';
const RASP = '#D33F49';
const DENIM = '#1E3A5F';
const GREY = '#6B6B6B';

const FALLBACK_SEEDS = {
  INDEX46: '1502920917128-1aa1c652f298',
  RACECORE: '1568605117036-5fe5e7bab8b7',
  HIJINX: '1556906781-9a412961c28c',
  OUTLET: '1601362840410-2f0b3a4a7e76',
  MARKETPLACE: '1518770660439-4636190af475',
  COMMUNITY: '1485827404703-89b55fcc5950',
};

const SOURCE_STYLES = {
  INDEX46: { bg: OIL, text: '#FFFFFF', label: 'INDEX46' },
  RACECORE: { bg: DENIM, text: '#FFFFFF', label: 'RACECORE' },
  HIJINX: { bg: TEAL, text: '#FFFFFF', label: 'HIJINX' },
  OUTLET: { bg: RASP, text: '#FFFFFF', label: 'THE OUTLET' },
  MARKETPLACE: { bg: GREY, text: '#FFFFFF', label: 'MARKETPLACE' },
  COMMUNITY: { bg: '#FFFFFF', text: OIL, label: 'COMMUNITY', border: OIL },
};

function fallbackImg(source) {
  const seed = FALLBACK_SEEDS[source] || FALLBACK_SEEDS.INDEX46;
  return `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=800&q=80`;
}

export default function ActivityCard({ item }) {
  const s = SOURCE_STYLES[item.source] || SOURCE_STYLES.INDEX46;
  const img = item.image || fallbackImg(item.source);

  return (
    <Link
      to={item.to}
      className="group flex flex-col bg-white border transition-colors hover:border-[#232323]"
      style={{ borderColor: 'rgba(35,35,35,0.15)', borderRadius: '2px' }}
    >
      {/* 1. IMAGE — fixed 16:9, object-cover */}
      <div className="relative aspect-[16/9] overflow-hidden bg-[#f0ece6]">
        <img
          src={img}
          alt={item.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        {/* 2. SOURCE TAG — upper-left overlay */}
        <span
          className="absolute top-2.5 left-2.5 inline-flex items-center px-2 py-0.5 font-mono text-[8px] tracking-[0.18em] uppercase font-bold"
          style={{
            background: s.bg,
            color: s.text,
            border: s.border ? `1px solid ${s.border}` : 'none',
          }}
        >
          {s.label}
        </span>
      </div>

      {/* 3. HEADLINE + 4. ACTION */}
      <div className="p-3">
        <h3
          className="font-black uppercase leading-[1.1] tracking-[-0.01em] line-clamp-2"
          style={{ color: OIL, fontSize: 'clamp(0.78rem, 0.95vw, 0.92rem)' }}
        >
          {item.title}
        </h3>
        <span
          className="mt-2 inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.18em] uppercase font-bold"
          style={{ color: OIL }}
        >
          {item.cta}
          <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}