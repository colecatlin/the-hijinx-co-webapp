import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductGallery({ images = [], coverImage }) {
  const allImages = [coverImage, ...images].filter(Boolean);
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (allImages.length === 0) {
    return (
      <div className="aspect-[4/5] bg-[#111111] border border-[#262626] flex items-center justify-center">
        <span className="font-mono text-xs text-[#555] tracking-widest uppercase">No Image</span>
      </div>
    );
  }

  const prev = () => setActive(i => (i - 1 + allImages.length) % allImages.length);
  const next = () => setActive(i => (i + 1) % allImages.length);

  return (
    <div className="flex gap-4">
      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="hidden md:flex flex-col gap-2 w-16 flex-shrink-0">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-16 h-16 overflow-hidden border transition-all duration-200 ${
                active === i ? 'border-[#00FFDA]' : 'border-[#262626] hover:border-[#404040]'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="flex-1 relative group">
        <div
          className="relative aspect-[4/5] overflow-hidden bg-[#0D0D0D] cursor-zoom-in"
          onClick={() => setZoomed(true)}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={allImages[active]}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>

          {/* Nav arrows */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </>
          )}

          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="w-4 h-4 text-white/60" />
          </div>

          {/* Dot indicators */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActive(i); }}
                  className={`w-1.5 h-1.5 transition-all duration-200 ${
                    i === active ? 'bg-[#00FFDA] w-4' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile thumbnail strip */}
        {allImages.length > 1 && (
          <div className="flex md:hidden gap-2 mt-3 overflow-x-auto pb-1">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`flex-shrink-0 w-14 h-14 overflow-hidden border transition-all duration-200 ${
                  active === i ? 'border-[#00FFDA]' : 'border-[#262626]'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom modal */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setZoomed(false)}
          >
            <img
              src={allImages[active]}
              alt=""
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl font-light"
              onClick={() => setZoomed(false)}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}