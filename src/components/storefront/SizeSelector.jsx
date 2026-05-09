import React from 'react';

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'OSFA'];

export default function SizeSelector({ sizes = [], selectedSize, onSizeChange, sizeGuideUrl }) {
  if (sizes.length === 0) return null;

  const sorted = [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.size?.toUpperCase());
    const bi = SIZE_ORDER.indexOf(b.size?.toUpperCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono tracking-[0.15em] text-[#A1A1A1] uppercase">Size</span>
        {sizeGuideUrl && (
          <a
            href={sizeGuideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#00FFDA] hover:underline"
          >
            Size Guide
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.map((v) => {
          const isSelected = selectedSize === v.size;
          const isUnavailable = !v.available || v.inventory === 0;
          return (
            <button
              key={v.size}
              onClick={() => !isUnavailable && onSizeChange(v.size)}
              disabled={isUnavailable}
              className={`relative min-w-[3rem] h-10 px-3 text-xs font-bold tracking-wide border transition-all duration-150 ${
                isSelected
                  ? 'border-[#00FFDA] bg-[#00FFDA]/10 text-[#00FFDA]'
                  : isUnavailable
                    ? 'border-[#262626] text-[#333] cursor-not-allowed'
                    : 'border-[#262626] text-[#A1A1A1] hover:border-[#F5F5F5] hover:text-[#F5F5F5]'
              }`}
            >
              {v.size}
              {isUnavailable && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="absolute w-full h-px bg-[#333] rotate-45" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}