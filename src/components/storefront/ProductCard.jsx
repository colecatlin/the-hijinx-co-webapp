import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ProductCard({ product, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const primaryImage = product.cover_image_url || product.gallery_images?.[0];
  const hoverImage = product.gallery_images?.[1] || product.lifestyle_images?.[0];
  const isSale = product.compare_at_price && product.compare_at_price > product.price;

  const tag = (() => {
    if (product.status === 'sold_out') return { label: 'Sold Out', style: 'bg-[#1a1a1a] text-[#555]' };
    if (product.status === 'coming_soon') return { label: 'Coming Soon', style: 'bg-[#111] text-[#00FFDA] border border-[#00FFDA]/20' };
    if (isSale) return { label: 'Sale', style: 'bg-[#00FFDA]/10 text-[#00FFDA] border border-[#00FFDA]/25' };
    if (product.featured) return { label: 'Featured', style: 'bg-[#00FFDA] text-[#050505]' };
    return null;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/product/${product.slug || product.id}`}
        className="group block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image container */}
        <div
          className="relative aspect-[3/4] overflow-hidden mb-4"
          style={{
            background: '#0D0D0D',
            boxShadow: hovered ? '0 0 0 1px rgba(0,255,218,0.2), 0 20px 40px rgba(0,0,0,0.5)' : '0 0 0 1px #1a1a1a',
            transition: 'box-shadow 0.4s ease',
          }}
        >
          {primaryImage ? (
            <>
              <img
                src={primaryImage}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  opacity: hovered && hoverImage ? 0 : 1,
                  transform: hovered ? 'scale(1.04)' : 'scale(1)',
                  transition: 'opacity 0.55s ease, transform 0.7s ease',
                }}
              />
              {hoverImage && (
                <img
                  src={hoverImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    opacity: hovered ? 1 : 0,
                    transform: hovered ? 'scale(1.04)' : 'scale(1.01)',
                    transition: 'opacity 0.55s ease, transform 0.7s ease',
                  }}
                  loading="lazy"
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-mono text-[10px] text-[#333] tracking-[0.3em] uppercase">No Image</span>
            </div>
          )}

          {/* Status tag */}
          {tag && (
            <div className="absolute top-3 left-3">
              <span className={`text-[9px] font-mono tracking-[0.25em] uppercase px-2.5 py-1 ${tag.style}`}>
                {tag.label}
              </span>
            </div>
          )}

          {/* Quick view bar */}
          <div
            className="absolute inset-x-0 bottom-0 h-11 flex items-center justify-center"
            style={{
              background: 'rgba(5,5,5,0.85)',
              backdropFilter: 'blur(8px)',
              transform: hovered ? 'translateY(0)' : 'translateY(100%)',
              opacity: hovered ? 1 : 0,
              transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease',
            }}
          >
            <span className="text-[10px] font-mono tracking-[0.3em] text-[#F5F5F5] uppercase">
              View Product →
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-0.5">
          {product.category && (
            <span className="font-mono text-[9px] tracking-[0.3em] text-[#444] uppercase">{product.category}</span>
          )}
          <h3
            className="text-sm font-bold leading-tight transition-colors duration-200"
            style={{ color: hovered ? '#00FFDA' : '#F5F5F5' }}
          >
            {product.name}
          </h3>
          {product.tagline && (
            <p className="text-xs text-[#4a4a4a] leading-snug line-clamp-1">{product.tagline}</p>
          )}
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-sm font-bold text-[#F5F5F5]">${(product.price || 0).toFixed(2)}</span>
            {isSale && (
              <span className="text-xs text-[#444] line-through">${product.compare_at_price.toFixed(2)}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}