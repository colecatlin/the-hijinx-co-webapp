import React from 'react';
import ProductCard from './ProductCard';

export default function RelatedProducts({ products = [], title = 'You May Also Like' }) {
  if (products.length === 0) return null;

  return (
    <div className="py-16 border-t border-[#1a1a1a]">
      <div className="max-w-7xl mx-auto px-6">
        <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-2">{title}</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          {products.slice(0, 4).map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}