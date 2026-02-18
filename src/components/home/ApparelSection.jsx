import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight } from 'lucide-react';

export default function ApparelSection() {
  return (
    <section className="relative overflow-hidden bg-[#0A0A0A] min-h-[480px] flex items-center">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80"
          alt="Apparel background"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
      </div>

      {/* Accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00FFDA]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <p className="text-[#00FFDA] text-xs font-bold tracking-[0.25em] uppercase mb-4">
          HIJINX CO.
        </p>
        <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none mb-4">
          LIFESTYLE<br />APPAREL
        </h2>
        <p className="text-[#00FFDA] text-lg md:text-xl font-semibold tracking-widest uppercase mt-6 mb-8">
          IN MOTION. ON PURPOSE.
        </p>
        <Link
          to={createPageUrl('ApparelHome')}
          className="inline-flex items-center gap-2 bg-[#00FFDA] text-[#0A0A0A] px-6 py-3 text-sm font-black tracking-wide uppercase hover:bg-white transition-colors"
        >
          Shop Now <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}