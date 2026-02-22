import React from 'react';

export default function BrandStatement() {
  return (
    <section className="relative w-full h-[70vh] min-h-[480px] overflow-hidden">
      {/* Photo */}
      <img
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/34986112d_Boonville-214.jpg"
        alt="Snowmobile racing"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Gradient overlay — dark on right for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/30 to-black/70" />

      {/* Text — pinned to right side */}
      <div className="absolute inset-0 flex items-center justify-end">
        <div className="max-w-md px-8 md:px-12 text-right">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-white/60 mb-3">
            Hijinx Co
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight mb-4">
            IN MOTION.<br />ON PURPOSE.
          </h2>
          <p className="text-base md:text-lg text-white/70 font-light tracking-wide">
            dream it, build it, live it.
          </p>
        </div>
      </div>
    </section>
  );
}