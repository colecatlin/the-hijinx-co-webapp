import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';
import { mergeConfig, resolveCta } from './home1Helpers';

const HERO_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/15d41358e_generated_image.png';

const HERO_DEFAULTS = {
  enabled: true,
  eyebrow: 'MOTORSPORTS // PEOPLE // CULTURE // COMMUNITY',
  headline_line1: 'HIJINX',
  headline_line2: 'A BIGGER',
  headline_line3: 'TOMORROW.',
  accent_line: 'TOMORROW.',
  supporting_copy: 'Connecting people, products, stories and technology to keep the culture moving forward.',
  desktop_media_url: HERO_IMAGE,
  mobile_media_url: '',
  desktop_image_position: '68% center',
  mobile_image_position: 'center center',
  cta1: { enabled: true, label: 'EXPLORE THE HIJINX WORLD', destination: { type: 'none' }, style: 'solid' },
  cta2: { enabled: true, label: 'WATCH THE FILM', destination: { type: 'none' }, style: 'outline' },
  right_side_phrase: 'Different Terrain.\nSame People.',
  show_right_side_phrase: true,
  bottom_editorial: 'RACE WEEKENDS // NEW DROPS // REAL STORIES // OPPORTUNITY // ALL IN MOTION',
  show_bottom_editorial: true,
  schedule: { enabled: false, start_at: '', end_at: '' },
};

function HeroCta({ cta, defaultStyle }) {
  const resolved = resolveCta(cta);
  if (!resolved) return null;

  const style = resolved.style || defaultStyle;
  const isSolid = style === 'solid';
  const cls = 'group inline-flex items-center justify-center gap-2 px-7 py-4 font-bold text-sm tracking-wide uppercase transition-transform duration-200 hover:-translate-y-0.5';
  const solidStyle = { background: '#00FFDA', color: '#232323' };
  const outlineStyle = { borderColor: '#FFF8F5', color: '#FFF8F5', background: 'transparent' };
  const ctaStyle = isSolid ? solidStyle : outlineStyle;
  const icon = isSolid ? <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" /> : <Play className="w-4 h-4" />;

  if (!resolved.isLink) {
    return (
      <span className={cls} style={ctaStyle} aria-label={resolved.label}>
        {resolved.label}
        {icon}
      </span>
    );
  }

  if (resolved.isExternal) {
    return (
      <a
        href={resolved.href}
        target={resolved.openInNewTab ? '_blank' : undefined}
        rel={resolved.openInNewTab ? 'noopener noreferrer' : undefined}
        aria-label={resolved.label}
        className={cls}
        style={ctaStyle}
      >
        {resolved.label}
        {icon}
      </a>
    );
  }

  return (
    <Link to={resolved.href} aria-label={resolved.label} className={cls} style={ctaStyle}>
      {resolved.label}
      {icon}
    </Link>
  );
}

export default function Home1Hero({ config }) {
  const v = mergeConfig(HERO_DEFAULTS, config);
  const reduceMotion = useReducedMotion();

  const heroImage = v.desktop_media_url || HERO_IMAGE;
  const bgPosition = v.desktop_image_position || '68% center';

  return (
    <section
      className="relative w-full overflow-hidden h-[64vh] lg:h-[68vh]"
      style={{ minHeight: '460px', background: '#232323' }}
    >
      {/* Background image layer — very slow scale-in */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: bgPosition,
          willChange: 'transform',
        }}
        initial={reduceMotion ? false : { scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 14, ease: 'easeOut' }}
      />

      {/* Base readability overlay */}
      <div className="absolute inset-0" style={{ background: 'rgba(35,35,35,0.28)' }} />

      {/* Left-strong gradient overlay for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(35,35,35,0.92) 0%, rgba(35,35,35,0.78) 28%, rgba(35,35,35,0.4) 52%, rgba(35,35,35,0.12) 72%, rgba(35,35,35,0) 100%)',
        }}
      />

      {/* Bottom vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: 'linear-gradient(0deg, rgba(35,35,35,0.55), rgba(35,35,35,0))' }}
      />

      {/* Content */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 flex flex-col justify-center">
        <motion.div
          className="max-w-2xl"
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: 'easeOut', delay: 0.15 }}
        >
          {/* Eyebrow */}
          <p
            className="font-mono text-[10px] sm:text-[11px] tracking-[0.3em] uppercase mb-5"
            style={{ color: 'rgba(255,248,245,0.7)' }}
          >
            {v.eyebrow}
          </p>

          {/* Headline */}
          <h1
            className="font-black uppercase leading-[0.86] tracking-[-0.03em]"
            style={{ color: '#FFF8F5' }}
          >
            <span className="block" style={{ fontSize: 'clamp(3.25rem, 8.5vw, 7rem)' }}>
              {v.headline_line1}
            </span>
            <span className="block" style={{ fontSize: 'clamp(2.25rem, 6vw, 5rem)' }}>
              {v.headline_line2}
            </span>
            <span
              className="block"
              style={{ fontSize: 'clamp(2.25rem, 6vw, 5rem)', color: '#00FFDA' }}
            >
              {v.headline_line3}
            </span>
          </h1>

          {/* Supporting copy */}
          <p
            className="mt-6 max-w-md text-base sm:text-lg leading-relaxed"
            style={{ color: 'rgba(255,248,245,0.85)' }}
          >
            {v.supporting_copy}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <HeroCta cta={v.cta1} defaultStyle="solid" />
            <HeroCta cta={v.cta2} defaultStyle="outline" />
          </div>
        </motion.div>
      </div>

      {/* Bottom editorial detail */}
      {v.show_bottom_editorial && (
        <div className="absolute bottom-5 left-6 sm:left-8 lg:left-10 z-10 hidden md:block">
          <p
            className="font-mono text-[10px] tracking-[0.25em] uppercase"
            style={{ color: 'rgba(255,248,245,0.6)' }}
          >
            {v.bottom_editorial}
          </p>
        </div>
      )}

      {/* Right-side brand detail */}
      {v.show_right_side_phrase && (
        <div className="absolute top-[22%] right-6 lg:right-12 z-10 hidden lg:block max-w-[210px] text-right">
          <p
            className="font-serif italic leading-[1.05]"
            style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)', color: 'rgba(255,248,245,0.92)' }}
          >
            {v.right_side_phrase?.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < (v.right_side_phrase?.split('\n').length || 0) - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}