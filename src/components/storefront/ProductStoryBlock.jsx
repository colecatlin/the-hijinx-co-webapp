import React from 'react';
import DOMPurify from 'dompurify';

export default function ProductStoryBlock({ story, lifestyleImages = [] }) {
  if (!story && lifestyleImages.length === 0) return null;

  return (
    <div className="py-20 border-t border-[#1a1a1a]">
      <div className="max-w-7xl mx-auto px-6">
        <div className={`grid gap-16 items-center ${lifestyleImages.length > 0 ? 'lg:grid-cols-2' : 'max-w-2xl'}`}>
          {story && (
            <div>
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-6">
                The Story
              </span>
              <div
                className="prose-story text-[#A1A1A1] leading-relaxed text-base"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story) }}
              />
            </div>
          )}

          {lifestyleImages.length > 0 && (
            <div className={`grid gap-3 ${lifestyleImages.length >= 2 ? 'grid-cols-2' : ''}`}>
              {lifestyleImages.slice(0, 4).map((img, i) => (
                <div
                  key={i}
                  className={`overflow-hidden bg-[#111111] ${
                    i === 0 && lifestyleImages.length >= 3 ? 'col-span-2 aspect-[16/9]' : 'aspect-[4/5]'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}