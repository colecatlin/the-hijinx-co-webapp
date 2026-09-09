import React from 'react';
import { Users, Globe, TrendingUp, Move } from 'lucide-react';

const BONE = '#FFF8F5';
const OIL = '#232323';

const PILLARS = [
  { icon: Users, name: 'PEOPLE', desc: 'The reason.' },
  { icon: Globe, name: 'CULTURE', desc: 'The connection.' },
  { icon: TrendingUp, name: 'OPPORTUNITY', desc: 'The goal.' },
  { icon: Move, name: 'MOTION', desc: 'The mindset.' },
];

export default function Home1OneBrand() {
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
                A Connected Motorsports Community
              </p>
            </div>
            {/* Headline */}
            <h2
              className="font-black uppercase leading-[0.9] tracking-[-0.02em]"
              style={{ color: OIL, fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
            >
              One Brand.
              <br />
              A Bigger Movement.
            </h2>
            {/* Copy */}
            <div className="mt-5 max-w-xl space-y-3">
              <p
                className="text-[15px] md:text-[16px] leading-relaxed font-semibold"
                style={{ color: OIL }}
              >
                HIJINX connects the pieces of motorsports that usually live
                separately.
              </p>
              <p
                className="text-[14px] md:text-[15px] leading-relaxed"
                style={{ color: 'rgba(35,35,35,0.72)' }}
              >
                Apparel, media, information, racing, commerce, tools and
                community — brought together to create more ways for people to
                participate, discover, build and keep moving forward.
              </p>
            </div>
          </div>

          {/* RIGHT — Pillars 2x2 */}
          <div className="grid grid-cols-2 gap-px" style={{ background: 'rgba(35,35,35,0.12)' }}>
            {PILLARS.map(({ icon: Icon, name, desc }) => (
              <div
                key={name}
                className="flex flex-col gap-1.5 p-4 md:p-5"
                style={{ background: BONE }}
              >
                <Icon className="w-4 h-4" style={{ color: OIL, strokeWidth: 1.5 }} />
                <p
                  className="font-black uppercase tracking-[0.04em] mt-0.5"
                  style={{ color: OIL, fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}
                >
                  {name}
                </p>
                <p
                  className="text-[12px] md:text-[13px]"
                  style={{ color: 'rgba(35,35,35,0.6)' }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
        {/* Bottom rule */}
        <div className="h-px w-full mt-6 md:mt-8" style={{ background: 'rgba(35,35,35,0.12)' }} />
      </div>
    </section>
  );
}