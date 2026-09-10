import React from 'react';
import { Users, Globe, TrendingUp, Move } from 'lucide-react';
import { mergeConfig } from './home1Helpers';

const BONE = '#FFF8F5';
const OIL = '#232323';

const PILLAR_ICONS = [Users, Globe, TrendingUp, Move];

const ONE_BRAND_DEFAULTS = {
  enabled: true,
  eyebrow: 'A Connected Motorsports Community',
  headline: 'One Brand.\nA Bigger Movement.',
  body_copy_1: 'HIJINX connects the pieces of motorsports that usually live separately.',
  body_copy_2: 'Apparel, media, information, racing, commerce, tools and community — brought together to create more ways for people to participate, discover, build and keep moving forward.',
  pillars: [
    { name: 'PEOPLE', desc: 'The reason.' },
    { name: 'CULTURE', desc: 'The connection.' },
    { name: 'OPPORTUNITY', desc: 'The goal.' },
    { name: 'MOTION', desc: 'The mindset.' },
  ],
  schedule: { enabled: false, start_at: '', end_at: '' },
};

export default function Home1OneBrand({ config }) {
  const v = mergeConfig(ONE_BRAND_DEFAULTS, config);
  const pillars = (v.pillars || []).slice(0, 4);

  return (
    <section className="w-full py-8 md:py-12" style={{ background: BONE }}>
      {/* Top rule */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="h-px w-full mb-6 md:mb-8" style={{ background: 'rgba(35,35,35,0.12)' }} />
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-12 items-start">
          {/* LEFT — Statement */}
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8" style={{ background: OIL }} />
              <p
                className="font-mono text-[10px] tracking-[0.3em] uppercase font-bold"
                style={{ color: OIL }}
              >
                {v.eyebrow}
              </p>
            </div>
            {/* Headline */}
            <h2
              className="font-black uppercase leading-[0.9] tracking-[-0.02em]"
              style={{ color: OIL, fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
            >
              {v.headline?.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < (v.headline?.split('\n').length || 0) - 1 && <br />}
                </React.Fragment>
              ))}
            </h2>
            {/* Copy */}
            <div className="mt-5 max-w-xl space-y-3">
              <p
                className="text-[15px] md:text-[16px] leading-relaxed font-semibold"
                style={{ color: OIL }}
              >
                {v.body_copy_1}
              </p>
              <p
                className="text-[14px] md:text-[15px] leading-relaxed"
                style={{ color: 'rgba(35,35,35,0.72)' }}
              >
                {v.body_copy_2}
              </p>
            </div>
          </div>

          {/* RIGHT — Pillars 2x2 */}
          <div className="grid grid-cols-2 gap-px" style={{ background: 'rgba(35,35,35,0.12)' }}>
            {pillars.map((pillar, i) => {
              const Icon = PILLAR_ICONS[i] || PILLAR_ICONS[0];
              return (
                <div
                  key={pillar.name || i}
                  className="flex flex-col gap-1.5 p-4 md:p-5"
                  style={{ background: BONE }}
                >
                  <Icon className="w-4 h-4" style={{ color: OIL, strokeWidth: 1.5 }} />
                  <p
                    className="font-black uppercase tracking-[0.04em] mt-0.5"
                    style={{ color: OIL, fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}
                  >
                    {pillar.name}
                  </p>
                  <p
                    className="text-[12px] md:text-[13px]"
                    style={{ color: 'rgba(35,35,35,0.6)' }}
                  >
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        {/* Bottom rule */}
        <div className="h-px w-full mt-6 md:mt-8" style={{ background: 'rgba(35,35,35,0.12)' }} />
      </div>
    </section>
  );
}