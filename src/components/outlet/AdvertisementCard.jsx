import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

export default function AdvertisementCard({ ad }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const bgColor = ad.background_color || '#FAFAFA';
  const textColor = ad.text_color || '#232323';

  const getCardHeight = () => {
    const ratio = ad.aspect_ratio || '1:1';
    if (ratio === '4:5') return 'h-96';
    return 'h-80'; // 1:1 default
  };

  return (
    <div 
      className={`relative ${getCardHeight()} cursor-pointer`}
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
          className="absolute inset-0 bg-white border border-gray-300 p-4 flex flex-col justify-between"
          style={{ backfaceVisibility: 'hidden', backgroundColor: bgColor }}
        >
          {ad.cover_image_url && (
            <div className="w-full h-32 mb-3 overflow-hidden bg-gray-200 -mx-4 -mt-4">
              <img 
                src={ad.cover_image_url} 
                alt={ad.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-black" style={{ color: textColor }}>
                {ad.title}
              </h3>
              {ad.tagline && (
                <p className="text-xs mt-2 text-gray-600">{ad.tagline}</p>
              )}
            </div>
            <div className="text-right text-xs text-gray-500 font-medium">
              Flip →
            </div>
          </div>
        </div>

        {/* BACK OF CARD */}
        <div
          className="absolute inset-0 bg-white border border-gray-300 p-4 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: bgColor }}
        >
          <div className="flex-1 overflow-y-auto mb-4">
            <p className="text-sm leading-relaxed" style={{ color: textColor }}>
              {ad.body}
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-4 border-t border-gray-300">
            <a
              href={ad.call_to_action_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#232323] text-white text-xs font-semibold rounded hover:bg-[#1A3249] transition-colors"
            >
              {ad.call_to_action_text}
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="text-right text-xs text-gray-500 font-medium">
              ← Back
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}