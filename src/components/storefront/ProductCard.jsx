import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ProductCard({ product, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const primaryImage = product.cover_image_url || product.gallery_images?.[0];
  const hoverImage = product.gallery_images?.[1] || product.lifestyle_images?.[0];
  const isSale = product.compare_at_price && product.compare_at_price > product.price;

  const statusTag = () => {
    if (product.status === 'sold_out') return 'Sold Out';
    if (product.status === 'coming_soon') return 'Coming Soon';
    if (isSale) return 'Sale';
    if (product.featured) return 'Featured';
    return null;
  };
  const tag = statusTag();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to={`/product/${product.slug || product.id}`}
        className="group block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-[#111111] mb-4">
          {primaryImage ? (
            <>
              <img
                src={primaryImage}
                alt={product.name}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                  hovered && hoverImage ? 'opacity-0' : 'opacity-100'
                }`}
              />
              {hoverImage && (
                <img
                  src={hoverImage}
                  alt=""
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    hovered ? 'opacity-100' : 'opacity-0'
                  }`}
                  loading="lazy"
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-mono text-xs text-[#333] tracking-widest uppercase">No Image</span>
            </div>
          )}

          {/* Tag */}
          {tag && (
            <div className="absolute top-3 left-3">
              <span className={`text-[10px] font-mono tracking-[0.2em] uppercase px-2 py-1 ${
                tag === 'Sold Out' ? 'bg-[#1a1a1a] text-[#555]'
                : tag === 'Sale' ? 'bg-red-500/90 text-white'
                : 'bg-[#00FFDA] text-[#050505]'
              }`}>
                {tag}
              </span>
            </div>
          )}

          {/* Quick view overlay */}
          <div className={`absolute inset-x-0 bottom-0 py-3 bg-black/80 backdrop-blur-sm text-center transition-all duration-300 ${
            hovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}>
            <span className="text-xs font-mono tracking-[0.2em] text-[#F5F5F5] uppercase">View Product</span>
          </div>
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#555] uppercase">{product.category}</span>
          )}
          <h3 className="text-sm font-bold text-[#F5F5F5] mt-1 group-hover:text-[#00FFDA] transition-colors leading-tight">
            {product.name}
          </h3>
          {product.tagline && (
            <p className="text-xs text-[#555] mt-0.5">{product.tagline}</p>
          )}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-sm font-bold text-[#F5F5F5]">${(product.price || 0).toFixed(2)}</span>
            {isSale && (
              <span className="text-xs text-[#555] line-through">${product.compare_at_price.toFixed(2)}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}