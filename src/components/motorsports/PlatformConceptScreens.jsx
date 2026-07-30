import React from 'react';
import { motion } from 'framer-motion';
import { Circle } from 'lucide-react';

/* Framed "screen grab" concept card — browser chrome around a generated
   product screenshot so it reads as a real screen-grab of the platform. */

const IMG = {
  index46: 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/aca062922_generated_image.png',
  racecore: 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/04103359d_generated_image.png',
};

function BrowserFrame({ label, url, src, alt }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'rgba(4,8,8,0.72)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex gap-1.5">
          <Circle className="w-2.5 h-2.5" style={{ color: '#ff5f57' }} fill="#ff5f57" />
          <Circle className="w-2.5 h-2.5" style={{ color: '#febc2e' }} fill="#febc2e" />
          <Circle className="w-2.5 h-2.5" style={{ color: '#28c840' }} fill="#28c840" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div
            className="text-[10px] font-mono tracking-wider px-3 py-1 rounded-md"
            style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {url}
          </div>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: 'rgba(29,161,161,0.7)' }}>
          {label}
        </span>
      </div>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full block"
        style={{ aspectRatio: '16 / 9', objectFit: 'cover', background: '#050A0A' }}
      />
    </motion.div>
  );
}

export function Index46ConceptScreen() {
  return (
    <BrowserFrame
      label="INDEX46"
      url="index46.ai/motorsports"
      src={IMG.index46}
      alt="INDEX46 motorsports network concept — drivers, teams, tracks, series, events and standings"
    />
  );
}

export function RaceCoreConceptScreen() {
  return (
    <BrowserFrame
      label="Race Core"
      url="index46.ai/racecore"
      src={IMG.racecore}
      alt="Race Core operations dashboard concept — event files, sessions, results and race control"
    />
  );
}

/* Full "concept screens" section used by the Join page — both platforms
   shown side by side with a kicker, title and blurb. */
export default function PlatformConceptScreens() {
  return (
    <section className="relative z-[3] px-5 sm:px-8 md:px-12 lg:px-20 py-16 md:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-5 h-[1px] bg-[#1DA1A1]" />
          <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">Concept Screens</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase mb-4 leading-[0.95]">
          Two sides of<br />the platform.
        </h2>
        <p className="text-white/55 text-sm sm:text-base max-w-2xl mb-12">
          INDEX46 is the public network — drivers, teams, tracks, series, events and standings.
          Race Core is the engine behind race weekend. Here's where each is headed.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col">
            <div className="mb-2 px-1 text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">INDEX46 · The Network</div>
            <Index46ConceptScreen />
          </div>
          <div className="flex flex-col">
            <div className="mb-2 px-1 text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">Race Core · The Engine</div>
            <RaceCoreConceptScreen />
          </div>
        </div>

        <p className="text-center text-[10px] font-mono tracking-[0.35em] uppercase text-white/30 mt-8">
          Pre-launch concept · Final UI subject to evolution
        </p>
      </div>
    </section>
  );
}