import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductGallery({ images = [], coverImage }) {
  const allImages = [coverImage, ...images].filter(Boolean);
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (allImages.length === 0) {
    return (
      <div
        className="aspect-[4/5] flex items-center justify-center"
        style={{ background: '#0D0D0D', border: '1px solid #1a1a1a' }}
      >
        <span className="font-mono text-[10px] text-[#333] tracking-[0.3em] uppercase">No Image</span>
      </div>
    );
  }

  const prev = () => setActive(i => (i - 1 + allImages.length) % allImages.length);
  const next = () => setActive(i => (i + 1) % allImages.length);

  return (
    <>
      <div className="flex gap-3">
        {/* Thumbnail strip — desktop */}
        {allImages.length > 1 && (
          <div className="hidden md:flex flex-col gap-2 w-[68px] flex-shrink-0">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="w-full aspect-square overflow-hidden transition-all duration-200 flex-shrink-0"
                style={{
                  background: '#0D0D0D',
                  outline: active === i ? '1.5px solid #00FFDA' : '1px solid #1a1a1a',
                  outlineOffset: active === i ? '1px' : '0',
                }}
                onMouseEnter={e => { if (active !== i) e.currentTarget.style.outline = '1px solid #333'; }}
                onMouseLeave={e => { if (active !== i) e.currentTarget.style.outline = '1px solid #1a1a1a'; }}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Main image */}
        <div className="flex-1 relative group cursor-zoom-in" onClick={() => setZoomed(true)}>
          <div
            className="relative aspect-[4/5] overflow-hidden"
            style={{ background: '#0D0D0D' }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={active}
                src={allImages[active]}
                alt=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>

            {/* Arrows — appear on hover */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                  style={{ background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(8px)', border: '1px solid #262626' }}
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                  style={{ background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(8px)', border: '1px solid #262626' }}
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </>
            )}

            {/* Dot nav */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 items-center">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setActive(i); }}
                    style={{
                      height: '2px',
                      width: i === active ? '20px' : '6px',
                      background: i === active ? '#00FFDA' : 'rgba(255,255,255,0.2)',
                      transition: 'width 0.3s ease, background 0.3s ease',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Mobile thumbnail strip */}
          {allImages.length > 1 && (
            <div className="flex md:hidden gap-2 mt-2.5 overflow-x-auto pb-1 scrollbar-hide">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActive(i); }}
                  className="flex-shrink-0 w-14 h-14 overflow-hidden transition-all duration-200"
                  style={{
                    outline: active === i ? '1.5px solid #00FFDA' : '1px solid #1a1a1a',
                    outlineOffset: active === i ? '1px' : '0',
                  }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zoom modal */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.95)' }}
            onClick={() => setZoomed(false)}
          >
            <img
              src={allImages[active]}
              alt=""
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
              style={{ maxHeight: '90vh' }}
            />
            <button
              className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center transition-colors"
              style={{ border: '1px solid #333', color: '#666' }}
              onClick={() => setZoomed(false)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#666'; }}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}