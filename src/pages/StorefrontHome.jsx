import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import SeoMeta from '@/components/system/seoMeta';
import ProductCard from '@/components/storefront/ProductCard';
import NewsletterSignup from '@/components/shared/NewsletterSignup';

function HeroCarousel({ slides }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setActive(i => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides || slides.length === 0) return null;
  const slide = slides[active];

  return (
    <div className="relative h-[90vh] min-h-[640px] overflow-hidden" style={{ background: '#050505' }}>
      <AnimatePresence mode="sync">
        {slide.image_url && (
          <motion.img
            key={`bg-${active}`}
            src={slide.image_url}
            alt=""
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 0.55, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center px-8 md:px-16 lg:px-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${active}`}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            {slide.eyebrow && (
              <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-px bg-[#00FFDA]" />
                <span className="font-mono text-[10px] tracking-[0.45em] text-[#00FFDA] uppercase">
                  {slide.eyebrow}
                </span>
              </div>
            )}
            <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-[0.92] mb-7">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-base md:text-lg text-white/55 mb-10 max-w-lg leading-relaxed font-light">
                {slide.subtitle}
              </p>
            )}
            <div className="flex items-center gap-4 flex-wrap">
              {slide.cta_label && slide.cta_url && (
                <Link
                  to={slide.cta_url}
                  className="inline-flex items-center gap-2.5 px-8 py-4 text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300"
                  style={{ background: '#00FFDA', color: '#050505' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#00FFDA'; }}
                >
                  {slide.cta_label} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              {slide.cta_secondary_label && slide.cta_secondary_url && (
                <Link
                  to={slide.cta_secondary_url}
                  className="inline-flex items-center gap-2 px-8 py-4 text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300"
                  style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                >
                  {slide.cta_secondary_label}
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setActive(i => (i - 1 + slides.length) % slides.length)}
            className="absolute left-5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center transition-all duration-200"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,255,218,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => setActive(i => (i + 1) % slides.length)}
            className="absolute right-5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center transition-all duration-200"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,255,218,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>

          {/* Progress indicators */}
          <div className="absolute bottom-8 left-8 md:left-16 lg:left-24 flex gap-3 items-center">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="transition-all duration-500"
                style={{
                  height: '2px',
                  width: i === active ? '32px' : '12px',
                  background: i === active ? '#00FFDA' : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CollectionCard({ col }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={`/collection/${col.slug || col.id}`}
      className="group relative aspect-[3/4] overflow-hidden block"
      style={{
        background: '#0D0D0D',
        boxShadow: hovered ? '0 0 0 1px rgba(0,255,218,0.2)' : '0 0 0 1px #1a1a1a',
        transition: 'box-shadow 0.4s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {col.cover_image_url && (
        <img
          src={col.cover_image_url}
          alt={col.name}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
          style={{
            opacity: hovered ? 0.75 : 0.5,
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      {hovered && (
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center bottom, rgba(0,255,218,0.06) 0%, transparent 70%)' }}
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-px transition-all duration-300"
            style={{ background: '#00FFDA', width: hovered ? '20px' : '12px' }}
          />
          <span className="font-mono text-[9px] tracking-[0.35em] text-[#00FFDA]/70 uppercase">Collection</span>
        </div>
        <h3 className="text-sm font-bold text-white tracking-wide">{col.name}</h3>
        {col.description && (
          <p
            className="text-xs text-white/50 mt-1 line-clamp-1 transition-all duration-300"
            style={{ opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(4px)' }}
          >
            {col.description}
          </p>
        )}
      </div>
    </Link>
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
        <section style={{ background: '#050505', borderTop: '1px solid #111' }}>
          <div className="max-w-7xl mx-auto px-6 py-20">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-5 h-px bg-[#00FFDA]" />
              <span className="font-mono text-[10px] tracking-[0.45em] text-[#00FFDA] uppercase">Collections</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {collections.slice(0, 4).map((col, i) => (
                <motion.div
                  key={col.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CollectionCard col={col} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <section style={{ background: '#050505', borderTop: '1px solid #111' }}>
          <div className="max-w-7xl mx-auto px-6 py-20">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-5 h-px bg-[#00FFDA]" />
                <span className="font-mono text-[10px] tracking-[0.45em] text-[#00FFDA] uppercase">Featured</span>
              </div>
              <Link
                to="/store"
                className="font-mono text-[10px] tracking-[0.2em] text-[#555] uppercase hover:text-[#00FFDA] transition-colors flex items-center gap-1.5"
              >
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* All products */}
      {rest.length > 0 && (
        <section style={{ background: '#050505', borderTop: '1px solid #111' }}>
          <div className="max-w-7xl mx-auto px-6 py-20">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-5 h-px bg-[#00FFDA]" />
              <span className="font-mono text-[10px] tracking-[0.45em] text-[#00FFDA] uppercase">All Products</span>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] animate-pulse" style={{ background: '#0D0D0D' }} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
                {rest.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section style={{ background: '#0A0A0A', borderTop: '1px solid #111' }}>
        <div className="max-w-xl mx-auto px-6 py-24 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-px bg-[#00FFDA]/40" />
            <span className="font-mono text-[10px] tracking-[0.45em] text-[#00FFDA] uppercase">Stay Connected</span>
            <div className="w-8 h-px bg-[#00FFDA]/40" />
          </div>
          <h2 className="text-3xl font-black text-[#F5F5F5] tracking-tight mb-3 leading-tight">New Drops & Releases</h2>
          <p className="text-sm text-[#555] mb-10 leading-relaxed">Be the first to know when new pieces hit the floor.</p>
          <NewsletterSignup source="storefront" />
        </div>
      </section>
    </PageShell>
  );
}