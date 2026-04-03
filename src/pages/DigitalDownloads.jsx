import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';

export default function DigitalDownloads() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['digital_products'],
    queryFn: () => base44.entities.Product.filter({ product_type: 'digital', status: 'active' }, '-created_date', 100),
  });

  const featured = products.filter(p => p.featured);
  const rest = products.filter(p => !p.featured);

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        <div className="mb-10">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Downloads</p>
          <h1 className="text-4xl font-bold text-gray-900">Digital Downloads</h1>
          <p className="text-gray-500 mt-2">Exclusive digital content — available instantly.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Download className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No digital products available yet.</p>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mb-10">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Featured</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {featured.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}
            {rest.length > 0 && (
              <div>
                {featured.length > 0 && <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">All Downloads</h2>}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {rest.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}