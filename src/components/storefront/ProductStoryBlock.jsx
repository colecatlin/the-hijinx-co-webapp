import React from 'react';
import DOMPurify from 'dompurify';

export default function ProductStoryBlock({ story, lifestyleImages = [] }) {
  if (!story && lifestyleImages.length === 0) return null;

  return (
    <section style={{ background: '#0A0A0A', borderTop: '1px solid #111', borderBottom: '1px solid #111' }}>
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className={`grid gap-16 lg:gap-24 items-center ${lifestyleImages.length > 0 ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto'}`}>
          
          {story && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-5 h-px bg-[#00FFDA]" />
                <span className="font-mono text-[10px] tracking-[0.45em] text-[#00FFDA] uppercase">The Story</span>
              </div>
              <div
                className="text-[#7a7a7a] leading-[1.9] text-base space-y-5"
                style={{ fontFamily: 'Georgia, serif' }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story) }}
              />
            </div>
          )}

          {lifestyleImages.length > 0 && (
            <div className={`grid gap-3 ${lifestyleImages.length >= 2 ? 'grid-cols-2' : ''}`}>
              {lifestyleImages.slice(0, 4).map((img, i) => (
                <div
                  key={i}
                  className="overflow-hidden"
                  style={{
                    background: '#111',
                    aspectRatio: i === 0 && lifestyleImages.length >= 3 ? '16/9' : '4/5',
                    gridColumn: i === 0 && lifestyleImages.length >= 3 ? 'span 2' : undefined,
                  }}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}