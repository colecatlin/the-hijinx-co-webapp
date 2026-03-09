import React, { useEffect } from 'react';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import NewsletterSignup from '@/components/shared/NewsletterSignup';

export default function ApparelHome() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ status: 'active' }),
  });

  const featuredProducts = products.filter(p => p.featured);
  const allActiveProducts = products.filter(p => !p.featured);

  const statusBadge = (status) => {
    if (status === 'coming_soon') return <span className="text-[10px] font-mono tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 uppercase">Coming Soon</span>;
    if (status === 'sold_out') return <span className="text-[10px] font-mono tracking-wider bg-red-100 text-red-600 px-2 py-0.5 uppercase">Sold Out</span>;
    return null;
  };

  return (
    <PageShell>
      {/* Hero */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase">Hijinx Apparel</span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mt-3 max-w-3xl">Wear the culture.</h1>
          <p className="text-gray-400 mt-4 max-w-lg">Apparel and essentials from the Hijinx brand.</p>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#E5FF00] via-white to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
          </div>
        ) : products.length === 0 ? (
          /* No products yet — show teaser */
          <div className="text-center py-24">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h2 className="text-2xl font-black tracking-tight mb-4">New Collection Dropping Soon</h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
                New Hijinx apparel and merchandise coming soon. Shop our current collection in the meantime.
              </p>
              <a
                href="https://www.hijinxco.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Visit Store <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featuredProducts.length > 0 && (
              <div className="mb-16">
                <p className="font-mono text-xs tracking-[0.2em] text-gray-400 uppercase mb-6">Featured</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredProducts.map((product, i) => (
                    <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                      <ProductCard product={product} statusBadge={statusBadge} featured />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* All Products */}
            {allActiveProducts.length > 0 && (
              <div>
                <p className="font-mono text-xs tracking-[0.2em] text-gray-400 uppercase mb-6">All Products</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allActiveProducts.map((product, i) => (
                    <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <ProductCard product={product} statusBadge={statusBadge} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Newsletter */}
        <div className="mt-20 bg-gray-50 p-8 md:p-12">
          <h2 className="text-xl font-black tracking-tight mb-2">New Drops & Releases</h2>
          <p className="text-sm text-gray-500 mb-6">Be the first to know when new items drop.</p>
          <NewsletterSignup source="apparel" />
        </div>
      </div>
    </PageShell>
  );
}

function ProductCard({ product, statusBadge, featured }) {
  const image = product.images?.[0];
  const isUnavailable = product.status === 'sold_out' || product.status === 'coming_soon';

  return (
    <div className={`group border border-gray-200 hover:border-[#0A0A0A] transition-all duration-300 ${featured ? 'overflow-hidden' : ''}`}>
      {image && (
        <div className={`overflow-hidden bg-gray-100 ${featured ? 'h-72' : 'h-56'}`}>
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-sm leading-tight">{product.name}</h3>
          {statusBadge(product.status)}
        </div>
        {product.description && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-4">
          {product.price ? (
            <span className="text-sm font-bold">${product.price.toFixed(2)}</span>
          ) : <span />}
          {product.external_link && !isUnavailable && (
            <a
              href={product.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-white bg-[#0A0A0A] px-3 py-1.5 hover:bg-gray-800 transition-colors"
            >
              Shop <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}