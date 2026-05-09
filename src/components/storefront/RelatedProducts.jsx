import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';

export default function RelatedProducts({ products = [], title = 'You Might Also Like' }) {
  if (!products || products.length === 0) return null;

  return (
    <section style={{ background: '#050505', borderTop: '1px solid #111' }}>
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-5 h-px bg-[#00FFDA]" />
            <span className="font-mono text-[10px] tracking-[0.45em] text-[#00FFDA] uppercase">{title}</span>
          </div>
          <Link
            to="/store"
            className="font-mono text-[10px] tracking-[0.2em] text-[#555] uppercase flex items-center gap-1.5 transition-colors duration-200 hover:text-[#00FFDA]"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-7">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}