import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight } from 'lucide-react';

const grain = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
  backgroundSize: '128px 128px',
};

export default function CultureSection() {
  return (
    <section className="bg-[#0A0A0A] py-12 md:py-20 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="flex gap-3 md:gap-4" style={{ height: 560 }}>

          {/* Left sidebar — vertical labels */}
          <div className="hidden md:flex flex-col justify-between py-2 flex-shrink-0">
            <div
              className="flex items-center justify-center px-3 py-8 rounded-xl text-white/60 text-xs font-bold uppercase"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', background: 'rgba(255,255,255,0.06)', letterSpacing: '0.3em' }}
            >
              Crew
            </div>
            <div
              className="flex items-center justify-center px-3 py-8 rounded-xl text-white/60 text-xs font-bold uppercase"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', background: 'rgba(255,255,255,0.06)', letterSpacing: '0.3em' }}
            >
              Garage
            </div>
          </div>

          {/* Panel 1 — wide, garage/engine with text overlay */}
          <div className="relative flex-[2.2] min-w-[260px] rounded-2xl overflow-hidden group cursor-pointer flex-shrink-0">
            <img
              src="https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&q=90&fit=crop"
              alt="Garage"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-1000"
              style={{ filter: 'contrast(1.15) saturate(0.55) brightness(0.55)' }}
            />
            {/* Grain */}
            <div className="absolute inset-0 opacity-[0.06]" style={grain} />
            {/* Gradient overlay */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)' }} />

            {/* Text — top left */}
            <div className="absolute top-7 left-7 right-7">
              <h2 className="text-5xl md:text-6xl font-black text-white leading-none mb-4" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}>
                Culture
              </h2>
              <p className="text-white/75 text-sm leading-relaxed mb-5">
                Born from the garage.<br />
                Built for the track. Worn everywhere else.<br />
                Where racing culture meets real life — on and off the grid.
              </p>
              <Link
                to={createPageUrl('ApparelHome')}
                className="inline-flex items-center gap-2 text-white text-sm font-medium underline underline-offset-4 hover:text-white/70 transition-colors"
              >
                Shop Apparel <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Panel 2 — tall narrow, race car */}
          <div className="relative flex-[1.1] min-w-[120px] rounded-2xl overflow-hidden flex-shrink-0">
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=90&fit=crop"
              alt="Racing"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'contrast(1.2) saturate(0.7) brightness(0.85)' }}
            />
            <div className="absolute inset-0 opacity-[0.06]" style={grain} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)' }} />
          </div>

          {/* Panel 3 — wide, crew/camera with bottom-left quote */}
          <div className="relative flex-[2.2] min-w-[260px] rounded-2xl overflow-hidden group cursor-pointer flex-shrink-0">
            <img
              src="https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=900&q=90&fit=crop"
              alt="Crew"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-1000"
              style={{ filter: 'contrast(1.15) saturate(0.6) brightness(0.65)' }}
            />
            <div className="absolute inset-0 opacity-[0.06]" style={grain} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.8) 100%)' }} />

            {/* Text — bottom left */}
            <div className="absolute bottom-7 left-7 right-7">
              <h3 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                We document what others overlook.
              </h3>
              <Link
                to={createPageUrl('OutletHome')}
                className="inline-flex items-center gap-2 text-white text-sm font-medium underline underline-offset-4 hover:text-white/70 transition-colors"
              >
                Explore <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Panel 4 — helmet/driver, right edge */}
          <div className="relative flex-[1.2] min-w-[130px] rounded-2xl overflow-hidden flex-shrink-0">
            <img
              src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=90&fit=crop&crop=left"
              alt="Driver"
              className="absolute inset-0 w-full h-full object-cover object-left"
              style={{ filter: 'contrast(1.2) saturate(0.5) brightness(0.75)' }}
            />
            <div className="absolute inset-0 opacity-[0.06]" style={grain} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)' }} />
          </div>

        </div>
      </div>
    </section>
  );
}