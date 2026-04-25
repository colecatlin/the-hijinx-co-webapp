import React from 'react';
import { motion } from 'framer-motion';

const cards = [
  {
    id: 'anchor',
    size: 'large',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
    label: 'This is racing.',
    tag: 'Culture',
  },
  {
    id: 'med1',
    size: 'medium',
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80',
    label: 'From the pits.',
    tag: 'Pit Lane',
  },
  {
    id: 'med2',
    size: 'medium',
    image: 'https://images.unsplash.com/photo-1547027159-6e634f552ce9?w=800&q=80',
    label: 'Built in the garage.',
    tag: 'Workshop',
  },
  {
    id: 'sm1',
    size: 'small',
    image: 'https://images.unsplash.com/photo-1541443131876-44b03de101c5?w=600&q=80',
    label: 'Every detail counts.',
    tag: 'Mechanical',
  },
  {
    id: 'sm2',
    size: 'small',
    image: 'https://images.unsplash.com/photo-1600706432502-77a0e2e32790?w=600&q=80',
    label: 'Dirt. Speed. Glory.',
    tag: 'Off-Road',
  },
  {
    id: 'sm3',
    size: 'small',
    image: 'https://images.unsplash.com/photo-1504439904031-93ded9f93e4e?w=600&q=80',
    label: 'Before the green flag.',
    tag: 'Driver Prep',
  },
  {
    id: 'wide',
    size: 'wide',
    image: 'https://images.unsplash.com/photo-1567808291548-fc3ee04dbcf0?w=1600&q=80',
    label: 'The whole world is watching.',
    tag: 'Race Day',
  },
];

const glass = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
};

function CultureCard({ card, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl group ${className}`}
      style={glass}
    >
      <img
        src={card.image}
        alt={card.label}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      {/* dark overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(4,8,8,0.85) 0%, rgba(4,8,8,0.2) 55%, transparent 100%)' }} />

      {/* content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <span className="inline-block font-mono text-[8px] tracking-[0.4em] uppercase text-[#1DA1A1] mb-1.5">{card.tag}</span>
        <p className="text-white font-black text-sm leading-tight tracking-tight">{card.label}</p>
      </div>

      {/* top-right accent line */}
      <div className="absolute top-3 right-3 w-6 h-[1px] bg-white/20" />
    </motion.div>
  );
}

export default function CultureSection() {
  const [anchor, med1, med2, sm1, sm2, sm3, wide] = cards;

  return (
    <section
      className="px-8 md:px-12 lg:px-20 py-16"
      style={{ background: 'rgba(4,8,8,0.7)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-3 h-[1px] bg-[#1DA1A1]" />
        <span className="font-mono text-[9px] tracking-[0.4em] text-white/40 uppercase">Motorsports Culture</span>
        <div className="flex-1 h-[1px] bg-white/5 ml-2" />
      </div>

      {/* ── ROW 1: large anchor + two mediums ── */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        {/* Large anchor — spans 7 cols, tall */}
        <CultureCard card={anchor} className="col-span-12 lg:col-span-7 h-[420px]" />

        {/* Two mediums stacked — spans 5 cols */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
          <CultureCard card={med1} className="flex-1 h-[200px]" />
          <CultureCard card={med2} className="flex-1 h-[200px]" />
        </div>
      </div>

      {/* ── ROW 2: three small cards, offset ── */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        {/* small offset left — indent by 1 col */}
        <CultureCard card={sm1} className="col-span-12 md:col-span-4 lg:col-span-3 lg:col-start-2 h-[180px]" />
        <CultureCard card={sm2} className="col-span-12 md:col-span-4 lg:col-span-4 h-[180px]" />
        <CultureCard card={sm3} className="col-span-12 md:col-span-4 lg:col-span-4 h-[180px]" />
      </div>

      {/* ── ROW 3: wide cinematic card ── */}
      <CultureCard card={wide} className="w-full h-[220px]" />
    </section>
  );
}