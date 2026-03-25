import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

function ProductCard({ product }) {
  return (
    <div
      className="group relative overflow-hidden"
      style={{ background: '#1A3249', border: '1px solid rgba(255,248,245,0.06)' }}
    >
      <div className="aspect-square overflow-hidden" style={{ background: '#232323' }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ filter: 'contrast(1.05)' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-black text-5xl" style={{ color: 'rgba(255,248,245,0.06)' }}>H</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #1A3249 15%, transparent 60%)' }} />
      </div>
      <div className="p-4">
        <div className="font-bold text-sm leading-tight" style={{ color: '#FFF8F5' }}>{product.name}</div>
        {product.price != null && (
          <div className="font-black text-base mt-1" style={{ color: '#00FFDA' }}>${product.price}</div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" style={{ background: '#00FFDA' }} />
    </div>
  );
}

export default function ApparelSection({ products = [] }) {
  return (
    <section style={{ background: '#232323', borderBottom: '1px solid rgba(255,248,245,0.06)' }} className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
              <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Apparel</span>
            </div>
            <h2 className="font-black text-3xl leading-none" style={{ color: '#FFF8F5' }}>
              Wear the Culture.
            </h2>
          </div>
          <Link
            to={createPageUrl('ApparelHome')}
            className="font-bold text-xs tracking-wide uppercase transition-colors hidden md:block"
            style={{ color: 'rgba(255,248,245,0.4)' }}
          >
            Shop All →
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.slice(0, 4).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div
            className="flex items-center justify-center py-16"
            style={{ border: '1px solid rgba(255,248,245,0.06)', background: '#1A3249' }}
          >
            <div className="text-center">
              <div className="font-black text-4xl mb-2" style={{ color: 'rgba(255,248,245,0.08)' }}>HIJINX</div>
              <div className="text-xs" style={{ color: 'rgba(255,248,245,0.3)' }}>Apparel coming soon</div>
            </div>
          </div>
        )}

        <div className="mt-6 md:hidden">
          <Link
            to={createPageUrl('ApparelHome')}
            className="block text-center py-3 font-bold text-sm tracking-wide uppercase"
            style={{ border: '1px solid rgba(0,255,218,0.3)', color: '#00FFDA' }}
          >
            Shop All
          </Link>
        </div>
      </div>
    </section>
  );
}