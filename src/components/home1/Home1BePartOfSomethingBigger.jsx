import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { mergeConfig, resolveCta } from './home1Helpers';

const BG_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/c7e783970_generated_image.png';

const SECONDARY_WORDS_DEFAULT = ['PEOPLE', 'PLACES', 'PROGRESS', 'NO LIMITS'];

const CLOSING_DEFAULTS = {
  enabled: true,
  eyebrow: 'BE PART OF',
  headline: 'SOMETHING BIGGER.',
  accent_text: '',
  supporting_line_1: 'Racers. Builders. Fans. Creators.',
  supporting_line_2: 'Everyone has a place here.',
  background_image: BG_IMAGE,
  desktop_image_position: 'center center',
  mobile_image_position: 'center center',
  cta: {
    enabled: true,
    label: 'Join the Movement',
    destination: { type: 'internal_page', internal_page: '/join' },
  },
  right_side_words: SECONDARY_WORDS_DEFAULT,
  show_right_side_words: true,
  schedule: { enabled: false, start_at: '', end_at: '' },
};

export default function Home1BePartOfSomethingBigger({ config }) {
  const v = mergeConfig(CLOSING_DEFAULTS, config);
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : ['-6%', '6%']);
  const scale = useTransform(scrollYProgress, [0, 1], reduceMotion ? [1, 1] : [1.08, 1]);

  const bgImage = v.background_image || BG_IMAGE;
  const words = v.right_side_words || SECONDARY_WORDS_DEFAULT;
  const cta = resolveCta(v.cta);

  const ctaContent = cta ? (
    <>
      <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
        {cta.label}
      </span>
      <ArrowRight
        className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
        style={{ color: '#00FFD1' }}
      />
    </>
  ) : null;

  const ctaClassName = 'group inline-flex items-center gap-2 mt-7 lg:mt-8 px-5 py-2.5 transition-all';
  const ctaStyle = { border: '1px solid #FFFFFF', color: '#FFFFFF', background: 'transparent' };

  return (
    <section
      ref={ref}
      aria-label="Be part of something bigger"
      className="relative w-full overflow-hidden"
      style={{ background: 'hsl(var(--canvas))' }}
    >
      {/* Cinematic image */}
      <div className="relative w-full" style={{ height: 'clamp(420px, 46vw, 520px)' }}>
        <motion.div
          className="absolute inset-0"
          style={{ y, scale }}
        >
          <img
            src={bgImage}
            alt="People walking through a race paddock at golden hour"
            className="w-full h-full object-cover"
            loading="lazy"
            style={{ filter: 'saturate(1.05) contrast(1.05)', objectPosition: v.desktop_image_position }}
          />
        </motion.div>

        {/* Cinematic gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,0.25) 62%, rgba(0,0,0,0.45) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.0) 70%, rgba(0,0,0,0.5) 100%)',
          }}
        />

        {/* Top-left header: HIJINX CO. — */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 lg:pt-8 flex items-center gap-3">
            <span
              className="font-mono text-[10px] tracking-[0.4em] uppercase"
              style={{ color: 'hsl(var(--foreground-secondary))' }}
            >
              HIJINX CO.
            </span>
            <span
              className="inline-block"
              style={{ width: '40px', height: '1px', background: 'hsl(var(--foreground-secondary) / 0.5)' }}
            />
          </div>
        </div>

        {/* Primary content block — left aligned */}
        <div className="absolute inset-0 z-10 flex items-center">
          <div className="max-w-7xl mx-auto w-full px-6 lg:px-10">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="max-w-xl"
            >
              {/* Eyebrow */}
              <span
                className="block uppercase font-bold"
                style={{
                  color: '#FFFFFF',
                  fontSize: 'clamp(0.7rem, 1vw, 0.85rem)',
                  letterSpacing: '0.35em',
                  marginBottom: '0.85rem',
                }}
              >
                {v.eyebrow}
              </span>

              {/* Headline */}
              <h2
                className="uppercase leading-[0.9] tracking-[-0.01em]"
                style={{
                  color: '#00FFD1',
                  fontWeight: 800,
                  fontSize: 'clamp(2.75rem, 6vw, 5rem)',
                }}
              >
                {v.headline}
              </h2>

              {/* Supporting copy */}
              <p
                className="mt-5 lg:mt-6 text-base lg:text-lg leading-relaxed"
                style={{ color: '#D1D1D1' }}
              >
                {v.supporting_line_1}
                <br />
                {v.supporting_line_2}
              </p>

              {/* CTA */}
              {cta && cta.isLink && !cta.isExternal && (
                <Link to={cta.href} className={ctaClassName} style={ctaStyle}>
                  {ctaContent}
                </Link>
              )}
              {cta && cta.isLink && cta.isExternal && (
                <a
                  href={cta.href}
                  target={cta.openInNewTab ? '_blank' : undefined}
                  rel={cta.openInNewTab ? 'noopener noreferrer' : undefined}
                  className={ctaClassName}
                  style={ctaStyle}
                >
                  {ctaContent}
                </a>
              )}
              {cta && !cta.isLink && (
                <span className={ctaClassName} style={ctaStyle}>
                  {ctaContent}
                </span>
              )}
            </motion.div>
          </div>
        </div>

        {/* Secondary editorial block — right side, desktop only */}
        {v.show_right_side_words && (
          <div className="hidden lg:flex absolute inset-0 z-10 items-center justify-end pointer-events-none">
            <div className="max-w-7xl mx-auto w-full px-10">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
                className="flex flex-col items-end gap-1.5"
              >
                {words.map((word) => (
                  <span
                    key={word}
                    className="font-mono text-[10px] tracking-[0.45em] uppercase"
                    style={{ color: 'hsl(var(--foreground-secondary) / 0.7)' }}
                  >
                    {word}
                  </span>
                ))}
                <span
                  className="inline-block mt-1.5"
                  style={{ width: '32px', height: '1px', background: 'hsl(var(--foreground-secondary) / 0.4)' }}
                />
              </motion.div>
            </div>
          </div>
        )}

        {/* Bottom-left footer: LIFE IN MOTION — */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-5 lg:pb-6 flex items-center gap-3">
            <span
              className="font-mono text-[10px] tracking-[0.4em] uppercase"
              style={{ color: 'hsl(var(--foreground-secondary) / 0.8)' }}
            >
              LIFE IN MOTION
            </span>
            <span
              className="inline-block"
              style={{ width: '40px', height: '1px', background: 'hsl(var(--foreground-secondary) / 0.4)' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}