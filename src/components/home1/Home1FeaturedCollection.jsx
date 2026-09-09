import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRight } from 'lucide-react';

const BONE = '#FFF8F5';
const OIL = '#232323';
const TEAL = '#00FFDA';

const LIFESTYLE_IMG =
  'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/627c0f160_generated_image.png';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=800&q=80';

const SHOP_URL = 'https://hijinx.com';

function formatPrice(p, currency = 'USD') {
  if (p == null) return null;
  const symbol = currency === 'USD' ? '$' : '';
  return `${symbol}${Number(p).toFixed(0)}`;
}

export default function Home1FeaturedCollection() {
  const { data, isLoading } = useQuery({
    queryKey: ['home1ShopifyFeatured'],
    queryFn: () => base44.functions.invoke('getShopifyFeaturedProducts'),
    staleTime: 5 * 60 * 1000,
  });

  const items = (data?.data?.products || []).slice(0, 6);

  return (
    <section
      className="w-full"
      style={{ background: BONE, paddingTop: '28px', paddingBottom: '30px' }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Top editorial header — small, with rule */}
        <div className="flex items-center gap-4 mb-4 md:mb-5">
          <span
            className="font-mono text-[10px] md:text-[11px] tracking-[0.3em] uppercase font-bold whitespace-nowrap"
            style={{ color: OIL }}
          >
            Featured Products
          </span>
          <span
            className="flex-1 h-px"
            style={{ background: 'rgba(35,35,35,0.18)' }}
          />
          <a
            href={SHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.25em] uppercase font-bold transition-colors hover:text-[#00B8A0] whitespace-nowrap"
            style={{ color: OIL }}
          >
            Shop All <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Main layout — 55/45 desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6 lg:gap-8">
          {/* LEFT — lifestyle / lookbook image.
              Mobile keeps 4/5; desktop stretches to match the right column's height. */}
          <div className="relative w-full overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-full">
            <img
              src={LIFESTYLE_IMG}
              alt="HIJINX apparel worn in a motorsports paddock"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* RIGHT — commerce / editorial */}
          <div className="flex flex-col">
            {/* Eyebrow */}
            <span
              className="font-mono text-[10px] tracking-[0.35em] uppercase font-bold"
              style={{ color: 'rgba(35,35,35,0.6)' }}
            >
              Current Drop
            </span>

            {/* Headline */}
            <h2
              className="mt-2 font-black uppercase leading-[0.9] tracking-[-0.02em]"
              style={{ color: OIL, fontSize: 'clamp(2rem, 3.6vw, 3rem)' }}
            >
              Featured Products
            </h2>

            {/* Short supporting line */}
            <p
              className="mt-2 text-sm md:text-base"
              style={{ color: 'rgba(35,35,35,0.7)' }}
            >
              Apparel for life in motion.
            </p>

            {/* Products — 3 across desktop, horizontal swipe on mobile */}
            <div className="mt-5 md:mt-6">
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-3.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i}>
                      <div
                        className="aspect-square animate-pulse"
                        style={{ background: 'rgba(35,35,35,0.06)' }}
                      />
                      <div
                        className="h-3 mt-2 w-3/4 animate-pulse"
                        style={{ background: 'rgba(35,35,35,0.06)' }}
                      />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div
                  className="flex items-center justify-center py-10 border"
                  style={{ borderColor: 'rgba(35,35,35,0.15)' }}
                >
                  <p
                    className="font-mono text-[10px] tracking-[0.3em] uppercase"
                    style={{ color: 'rgba(35,35,35,0.5)' }}
                  >
                    Products coming soon.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-3.5">
                  {items.map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      {/* Product image */}
                      <div className="relative aspect-square overflow-hidden" style={{ background: '#f0ece6' }}>
                        <img
                          src={p.image_url || FALLBACK_IMG}
                          alt={p.image_alt || p.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        />
                      </div>
                      {/* Name + price only */}
                      <div className="pt-2 flex items-baseline justify-between gap-2">
                        <h3
                          className="font-bold leading-tight tracking-[-0.01em] line-clamp-1 transition-colors group-hover:underline"
                          style={{ color: OIL, fontSize: 'clamp(0.72rem, 0.9vw, 0.82rem)' }}
                        >
                          {p.name}
                        </h3>
                        {p.price != null && (
                          <span
                            className="font-mono text-[11px] font-bold shrink-0"
                            style={{ color: OIL }}
                          >
                            {formatPrice(p.price, p.currency)}
                          </span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Primary CTA */}
            <a
              href={SHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 mt-6 md:mt-7 px-5 py-2.5 transition-all w-fit"
              style={{ border: `1px solid ${OIL}`, color: OIL, background: 'transparent' }}
            >
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
                Shop the Collection
              </span>
              <ArrowRight
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                style={{ color: OIL }}
              />
            </a>

            {/* Optional editorial detail — lower right */}
            <p
              className="mt-4 font-mono text-[9px] tracking-[0.3em] uppercase self-end"
              style={{ color: 'rgba(35,35,35,0.4)' }}
            >
              More styles. Same mindset.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}