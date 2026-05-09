import React from 'react';

export default function VariantSelector({ colors = [], selectedColor, onColorChange }) {
  if (colors.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono tracking-[0.15em] text-[#A1A1A1] uppercase">Color</span>
        <span className="text-sm text-[#F5F5F5]">{selectedColor || '—'}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c.color}
            title={c.color}
            onClick={() => onColorChange(c.color)}
            className={`relative w-8 h-8 rounded-full border-2 transition-all duration-150 ${
              selectedColor === c.color
                ? 'border-[#00FFDA] scale-110'
                : 'border-[#262626] hover:border-[#404040]'
            }`}
            style={{ backgroundColor: c.color_hex || '#333' }}
          >
            {selectedColor === c.color && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}