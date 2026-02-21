import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function AdvertisementCard({ ad }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const aspectRatioClass = ad.aspect_ratio === '1:1' ? 'aspect-square' : 'aspect-[4/5]';
  const bgColor = ad.background_color || '#FAFAFA';
  const textColor = ad.text_color || '#0A0A0A';

  return (
    <div 
      className={`relative cursor-pointer ${aspectRatioClass}`}
      style={{ perspective: '1000px' }}
      onClick={(e) => {
        if (!e.target.closest('a') && !e.target.closest('button')) {
          handleFlip();
        }
      }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d', pointerEvents: 'auto' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {/* FRONT OF CARD */}
        <div
          className="absolute inset-0 border border-gray-300"
          style={{ backfaceVisibility: 'hidden', backgroundColor: bgColor }}
        >
          <div className="relative w-full h-full flex flex-col overflow-hidden">
            {ad.cover_image_url && (
              <img
                src={ad.cover_image_url}
                alt={ad.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            
            {/* Overlay with content */}
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-4">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight leading-tight">
                  {ad.title}
                </h3>
                {ad.tagline && (
                  <p className="text-sm text-white/90 mt-2">{ad.tagline}</p>
                )}
              </div>
              
              {/* Flip indicator */}
              <div className="text-white text-xs font-medium flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Flip to Learn More
              </div>
            </div>
          </div>
        </div>

        {/* BACK OF CARD */}
        <div
          className="absolute inset-0 border border-gray-300 p-6 flex flex-col overflow-y-auto"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundColor: bgColor,
            color: textColor,
          }}
        >
          <div className="flex-1">
            <h3 className="text-lg font-black tracking-tight mb-3">
              {ad.title}
            </h3>
            {ad.body && (
              <p className="text-sm leading-relaxed mb-4">
                {ad.body}
              </p>
            )}
          </div>

          {/* CTA */}
          <div className="mt-auto pt-4 border-t flex flex-col gap-3" style={{ borderColor: textColor + '20' }}>
            <a
              href={ad.call_to_action_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 font-bold text-sm text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: textColor }}
            >
              {ad.call_to_action_text}
              <ArrowRight className="w-4 h-4" />
            </a>
            
            <button
              type="button"
              onClick={handleFlip}
              className="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity text-center"
            >
              Back ←
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}