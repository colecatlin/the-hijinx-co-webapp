import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '../components/shared/PageShell';
import SectionHeader from '../components/shared/SectionHeader';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Shirt, ExternalLink } from 'lucide-react';

const categories = ['All', 'Basics', 'Lifestyle', 'Collections', 'Outdoors'];

export default function ApparelHome() {
  const [active, setActive] = useState('All');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('name', 100),
  });

  const filtered = active === 'All' ? products : products.filter(p => p.category === active);

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader
          label="Apparel & Lifestyle"
          title="The Collection"
          subtitle="Essentials and goods from Hijinx."
        />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-10">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActive(cat)}
              className={`px-4 py-2 text-xs font-medium tracking-wide whitespace-nowrap transition-all ${
                active === cat ? 'bg-[#0A0A0A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <div key={i}><Skeleton className="aspect-square w-full" /><Skeleton className="h-4 w-3/4 mt-3" /></div>)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Shirt} title="No products yet" message="Products will appear here once added." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <div key={product.id} className="group">
                <div className="aspect-square bg-gray-100 overflow-hidden mb-3">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Shirt className="w-8 h-8 text-gray-200" /></div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {product.price && <span className="text-sm font-mono">${product.price}</span>}
                      {product.status === 'coming_soon' && <span className="text-[10px] font-mono text-gray-400 uppercase">Coming Soon</span>}
                      {product.status === 'sold_out' && <span className="text-[10px] font-mono text-red-400 uppercase">Sold Out</span>}
                    </div>
                  </div>
                  {product.external_link && (
                    <a href={product.external_link} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-300 hover:text-[#0A0A0A] transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}