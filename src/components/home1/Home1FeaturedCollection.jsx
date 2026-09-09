import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Truck, Wrench, Globe } from 'lucide-react';

const BONE = '#FFF8F5';
const OIL = '#232323';
const TEAL = '#00AAB5';
const RED = '#D9332D';

const LIFESTYLE_IMG =
  'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/627c0f160_generated_image.png';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=800&q=80';

const SHOP_URL = 'https://hijinx.com';

const USE_CASES = ['TRACKSIDE', 'TRAVEL', 'WORKSHOP', 'EVERYDAY'];
const DECOR_STACK = ['PEOPLE', 'PLACES', 'PROGRESS', 'NO LIMITS'];
const VALUE_PROPS = [
  { icon: Truck, label: 'RACE INSPIRED' },
  { icon: Wrench, label: 'EVERYDAY READY' },
  { icon: Globe, label: 'BUILT DIFFERENT' },
];

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
      style={{ background: BONE, paddingTop: '28px', paddingBottom: '32px' }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Main layout — 55/45 desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6 lg:gap-8">
          {/* ── LEFT — lifestyle / lookbook image with editorial overlays ── */}
          <div className="relative w-full overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-full">
            <img
              src={LIFESTYLE_IMG}
              alt="HIJINX apparel worn in a motorsports paddock"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Subtle bottom gradient for legibility */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
              }}
            />

            {/* Top-left vertical use-case list */}
            <ul className="absolute top-5 left-5 hidden sm:flex flex-col gap-1.5">
              {USE_CASES.map((u) => (
                <li
                  key={u}
                  className="font-mono text-[9px] tracking-[0.28em] uppercase font-bold"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {u}
                </li>
              ))}
            </ul>

            {/* Bottom-left brand block */}
            <div className="absolute bottom-5 left-5 right-5">
              <h2
                className="font-black uppercase leading-[0.9] tracking-[-0.02em]"
                style={{ color: '#FFFFFF', fontSize: 'clamp(1.6rem, 2.4vw, 2.4rem)' }}
              >
                Hijinx Apparel
              </h2>
              <p
                className="mt-1.5 font-mono text-[10px] tracking-[0.22em] uppercase"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                Made for wherever you end up.
              </p>
              <div className="mt-3 h-px w-14" style={{ background: TEAL }} />
            </div>
          </div>

          {/* ── RIGHT — header + product grid + footer ── */}
          <div className="flex flex-col">
            {/* Header row: eyebrow + headline + subline (left), decor stack (right) */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className="font-mono text-[10px] tracking-[0.35em] uppercase font-bold"
                  style={{ color: 'rgba(35,35,35,0.6)' }}
                >
                  Current Drop
                </span>
                <h2
                  className="mt-2 font-black uppercase leading-[0.9] tracking-[-0.02em]"
                  style={{ color: OIL, fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}
                >
                  Featured Products
                </h2>
                <p
                  className="mt-2 font-mono text-[10px] tracking-[0.22em] uppercase"
                  style={{ color: 'rgba(35,35,35,0.6)' }}
                >
                  Tees. Hoodies. Headwear. More.
                </p>
              </div>
              {/* Right-side vertical decor stack */}
              <ul className="hidden md:flex flex-col items-end gap-1 pt-1">
                {DECOR_STACK.map((d, i) => (
                  <li
                    key={d}
                    className="font-mono text-[9px] tracking-[0.28em] uppercase font-bold"
                    style={{
                      color: i === DECOR_STACK.length - 1 ? TEAL : 'rgba(35,35,35,0.35)',
                    }}
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            {/* Product grid — 3 across desktop, 2 on mobile */}
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
                      {/* Product image — light editorial box */}
                      <div
                        className="relative aspect-square overflow-hidden"
                        style={{ background: '#f0ece6' }}
                      >
                        <img
                          src={p.image_url || FALLBACK_IMG}
                          alt={p.image_alt || p.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        />
                      </div>
                      {/* Name (bold) + price (thin) */}
                      <div className="pt-2 flex items-baseline justify-between gap-2">
                        <h3
                          className="font-bold leading-tight tracking-[-0.01em] line-clamp-1 transition-colors group-hover:underline"
                          style={{ color: OIL, fontSize: 'clamp(0.72rem, 0.9vw, 0.82rem)' }}
                        >
                          {p.name}
                        </h3>
                        {p.price != null && (
                          <span
                            className="font-mono text-[11px] shrink-0"
                            style={{ color: 'rgba(35,35,35,0.7)' }}
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

            {/* Footer row — CTA (left) + value props (right) */}
            <div className="mt-6 md:mt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <a
                href={SHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-5 py-3 transition-all w-fit"
                style={{ background: OIL, color: '#FFFFFF' }}
              >
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
                  Shop the Collection
                </span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>

              <ul className="flex items-center gap-4 sm:gap-5">
                {VALUE_PROPS.map(({ icon: Icon, label }, i) => (
                  <li key={label} className="flex items-center gap-4 sm:gap-5">
                    {i > 0 && (
                      <span
                        className="hidden sm:block h-8 w-px"
                        style={{ background: 'rgba(35,35,35,0.18)' }}
                      />
                    )}
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: OIL }} />
                      <span
                        className="font-mono text-[9px] tracking-[0.2em] uppercase font-bold"
                        style={{ color: OIL }}
                      >
                        {label}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}