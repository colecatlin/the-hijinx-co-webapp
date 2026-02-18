import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DEFAULT_BG = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80';

export default function ApparelSection() {
  const { data: settings = [] } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: () => base44.entities.HomepageSettings.list(),
  });

  const bgUrl = settings.find(s => s.key === 'apparel_bg')?.image_url || DEFAULT_BG;

  return (
    <section className="relative overflow-hidden bg-[#0A0A0A] min-h-[480px] flex items-center">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src={bgUrl}
          alt="Apparel background"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
      </div>

      {/* Accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00FFDA]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 flex justify-start">
        <div className="max-w-lg text-left">
          <p className="text-[#00FFDA] text-xs font-bold tracking-[0.25em] uppercase mb-4">
            HIJINX CO.
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter leading-none mb-4">
            LIFESTYLE<br />APPAREL
          </h2>
          <p className="text-[#00FFDA] text-lg md:text-xl font-semibold tracking-widest uppercase mt-6 mb-8">
            IN MOTION. ON PURPOSE.
          </p>
          <span className="inline-flex items-center gap-2 bg-[#00FFDA] text-[#0A0A0A] px-6 py-3 text-sm font-black tracking-wide uppercase opacity-80 cursor-default">
            Coming Soon
          </span>
        </div>
      </div>
    </section>
  );
}