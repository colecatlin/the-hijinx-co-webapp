import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import SeoMeta from '@/components/system/seoMeta';
import ProductCard from '@/components/storefront/ProductCard';
import NewsletterSignup from '@/components/shared/NewsletterSignup';

function HeroCarousel({ slides }) {
  const [active, setActive] = useState(0);
  if (!slides || slides.length === 0) return null;
  const slide = slides[active];

  return (
    <div className="relative h-[85vh] min-h-[600px] overflow-hidden bg-[#0D0D0D]">
      {/* BG image */}
      {slide.image_url && (
        <img
          src={slide.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.5 }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent" />

      {/* Content */}
      <div className={`absolute inset-0 flex items-center px-8 md:px-16 lg:px-24 ${
        slide.text_position === 'center' ? 'justify-center text-center' :
        slide.text_position === 'right' ? 'justify-end text-right' : 'justify-start'
      }`}>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          {slide.eyebrow && (
            <span className="font-mono text-[11px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-4">
              {slide.eyebrow}
            </span>
          )}
          <h2 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[0.95] mb-6">
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="text-lg text-white/65 mb-8 max-w-xl leading-relaxed">{slide.subtitle}</p>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            {slide.cta_label && slide.cta_url && (
              <Link
                to={slide.cta_url}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#00FFDA] text-[#050505] text-sm font-bold tracking-[0.1em] uppercase hover:bg-white transition-colors"
              >
                {slide.cta_label} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {slide.cta_secondary_label && slide.cta_secondary_url && (
              <Link
                to={slide.cta_secondary_url}
                className="inline-flex items-center gap-2 px-8 py-4 border border-white/40 text-white text-sm font-bold tracking-[0.1em] uppercase hover:border-white transition-colors"
              >
                {slide.cta_secondary_label}
              </Link>
            )}
          </div>
        </motion.div>
      </div>

      {/* Nav */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setActive(i => (i - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setActive(i => (i + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-0.5 transition-all duration-300 ${i === active ? 'bg-[#00FFDA] w-8' : 'bg-white/30 w-4'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function StorefrontHome() {
  const { data: slides = [] } = useQuery({
    queryKey: ['heroSlides'],
    queryFn: () => base44.entities.HeroSlide.filter({ active: true }, 'sort_order', 10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['activeProducts'],
    queryFn: () => base44.entities.Product.filter({ status: 'active' }, 'sort_order', 50),
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['activeCollections'],
    queryFn: () => base44.entities.Collection.filter({ active: true }, 'sort_order', 20),
  });

  const featured = allProducts.filter(p => p.featured);
  const rest = allProducts.filter(p => !p.featured);

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <SeoMeta title="HIJINX Apparel — Wear the Culture" description="Premium motorsports lifestyle apparel." />

      <HeroCarousel slides={slides} />

      {/* Collections rail */}
      {collections.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase">Collections</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {collections.slice(0, 4).map((col, i) => (
              <Link
                key={col.id}
                to={`/collection/${col.slug || col.id}`}
                className="group relative aspect-[3/4] overflow-hidden bg-[#111111] block"
              >
                {col.cover_image_url && (
                  <img
                    src={col.cover_image_url}
                    alt={col.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-sm font-bold text-white">{col.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-16 border-t border-[#1a1a1a]">
          <div className="flex items-center justify-between mb-8">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase">Featured</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </div>
      )}

      {/* All products */}
      {rest.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-16 border-t border-[#1a1a1a]">
          <div className="flex items-center justify-between mb-8">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase">All Products</span>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-[#111111] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {rest.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </div>
      )}

      {/* Newsletter */}
      <div className="border-t border-[#1a1a1a] py-20 px-6">
        <div className="max-w-xl mx-auto text-center">
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-4">Stay Connected</span>
          <h2 className="text-3xl font-black text-[#F5F5F5] tracking-tight mb-3">New Drops & Releases</h2>
          <p className="text-sm text-[#555] mb-8">Be the first to know when new pieces drop.</p>
          <NewsletterSignup source="storefront" />
        </div>
      </div>
    </PageShell>
  );
}