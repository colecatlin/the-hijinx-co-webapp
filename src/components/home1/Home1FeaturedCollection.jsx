import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRight, ChevronRight } from 'lucide-react';

const BONE = '#FFF8F5';
const OIL = '#232323';
const TEAL = '#00FFDA';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=800&q=80';

function formatPrice(p) {
  if (p == null) return null;
  return `$${Number(p).toFixed(0)}`;
}

export default function Home1FeaturedCollection() {
  const scrollerRef = useRef(null);

  const { data: products = [] } = useQuery({
    queryKey: ['home1FeaturedProducts'],
    queryFn: () => base44.entities.Product.list('-created_date', 20),
    staleTime: 5 * 60 * 1000,
  });

  // Prefer featured, then active; exclude unavailable
  const featured = products.filter(
    (p) => p.status === 'active' && p.featured
  );
  const active = products.filter(
    (p) => p.status === 'active' && !p.featured
  );
  const items = [...featured, ...active].slice(0, 6);

  const scrollByCards = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]');
    const step = card ? card.offsetWidth + 14 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section
      className="w-full"
      style={{ background: BONE, paddingTop: '26px', paddingBottom: '30px' }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-4">
          <div className="flex items-end gap-3 md:gap-5 flex-wrap">
            <h2
              className="font-black uppercase leading-[0.92] tracking-[-0.02em]"
              style={{ color: OIL, fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}
            >
              Featured Collection
            </h2>
            <p
              className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] uppercase pb-1.5"
              style={{ color: 'rgba(35,35,35,0.55)' }}
            >
              Gear For What Moves You.
            </p>
          </div>
          <Link
            to="/ApparelHome"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.25em] uppercase font-bold border-b-2 pb-1 transition-colors hover:text-[#00B8A0]"
            style={{ color: OIL, borderColor: OIL }}
          >
            Shop All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Products */}
        {items.length === 0 ? (
          <div
            className="flex items-center justify-center py-12 border"
            style={{ borderColor: 'rgba(35,35,35,0.15)' }}
          >
            <p
              className="font-mono text-[10px] tracking-[0.3em] uppercase"
              style={{ color: 'rgba(35,35,35,0.5)' }}
            >
              Collection coming soon.
            </p>
          </div>
        ) : (
          <div className="relative" style={{ marginTop: '16px' }}>
            <div
              ref={scrollerRef}
              className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-6 px-6 sm:mx-0 sm:px-0 pb-2"
            >
              {items.map((p, i) => (
                <Link
                  key={p.id}
                  to={p.slug ? `/product/${p.slug}` : '/ApparelHome'}
                  data-card
                  className="group snap-start shrink-0 w-[44%] sm:w-[31%] lg:w-[15.8%] block"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-[#f0ece6]">
                    <img
                      src={p.cover_image_url || FALLBACK_IMG}
                      alt={p.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                    {p.compare_at_price && p.compare_at_price > p.price && (
                      <span
                        className="absolute top-2 left-2 px-1.5 py-0.5 font-mono text-[8px] tracking-[0.15em] uppercase font-bold"
                        style={{ background: OIL, color: BONE }}
                      >
                        Sale
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="pt-2.5 flex items-start justify-between gap-2">
                    <h3
                      className="font-bold leading-tight tracking-[-0.01em] line-clamp-1"
                      style={{ color: OIL, fontSize: 'clamp(0.78rem, 1vw, 0.9rem)' }}
                    >
                      {p.name}
                    </h3>
                    {p.price != null && (
                      <span
                        className="font-mono text-[12px] font-bold shrink-0"
                        style={{ color: OIL }}
                      >
                        {formatPrice(p.price)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            {items.length > 5 && (
              <button
                onClick={() => scrollByCards(1)}
                className="hidden md:flex absolute right-0 top-[42%] -translate-y-1/2 w-9 h-9 rounded-full items-center justify-center shadow-sm transition-transform hover:scale-105"
                style={{ background: OIL, color: BONE }}
                aria-label="More products"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}