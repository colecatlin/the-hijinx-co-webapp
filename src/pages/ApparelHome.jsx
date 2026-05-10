import React, { useEffect } from 'react';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowRight } from 'lucide-react';
import NewsletterSignup from '@/components/shared/NewsletterSignup';
import ProductCard from '@/components/storefront/ProductCard';

const DEFAULT_SHOPIFY = 'https://www.hijinxco.com';

export default function ApparelHome() {
  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ status: 'active' }),
    enabled: user?.role === 'admin',
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: () => base44.entities.HomepageSettings.list(),
    staleTime: 5 * 60 * 1000,
    enabled: user?.role === 'admin',
  });
  const settings = settingsList.find(s => s.active) || {};
  const shopifyUrl = settings.apparel_shopify_url || DEFAULT_SHOPIFY;

  const featuredProducts = products.filter(p => p.featured);
  const allActiveProducts = products.filter(p => !p.featured);

  useEffect(() => { Analytics.pageView('ApparelHome'); }, []);

  // Non-admin: show only the redirect landing
  if (!authLoading && user?.role !== 'admin') {
    return (
      <PageShell style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SeoMeta title="Apparel | Wear the Culture" description="HIJINX apparel and essentials." />
        <div className="text-center px-6">
          <span className="font-mono text-xs tracking-[0.3em] text-[#00FFDA] uppercase block mb-4">Hijinx Apparel</span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 text-[#F5F5F5] leading-[0.95]">Wear the<br />culture.</h1>
          <p className="text-[#555] mb-10 max-w-md mx-auto">Apparel and essentials from the Hijinx brand. Built for people who live in the pits.</p>
          <a
            href={DEFAULT_SHOPIFY}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#00FFDA] text-[#050505] text-sm font-black tracking-[0.1em] uppercase hover:bg-white transition-colors"
          >
            Shop Hijinx.com <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </PageShell>
    );
  }

  if (authLoading) {
    return <div className="min-h-screen" style={{ background: '#050505' }} />;
  }

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <SeoMeta
        title="Apparel | Wear the Culture"
        description="HIJINX apparel and essentials. Wear the culture."
      />

      {/* Hero */}
      <div style={{ background: '#050505' }}>
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-[#00FFDA] uppercase">Hijinx Apparel</span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mt-3 max-w-3xl text-[#F5F5F5] leading-[0.95]">Wear the<br />culture.</h1>
          <p className="text-[#555] mt-5 max-w-lg text-base">Apparel and essentials from the Hijinx brand. Built for people who live in the pits.</p>
          <div className="flex gap-4 mt-8">
            <Link to="/store" className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#00FFDA] text-[#050505] text-xs font-bold tracking-[0.1em] uppercase hover:bg-white transition-colors">
              Shop All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a href={shopifyUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-[#262626] text-[#A1A1A1] text-xs font-bold tracking-[0.1em] uppercase hover:border-[#F5F5F5] hover:text-[#F5F5F5] transition-colors">
              Visit Hijinx.com <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-[#00FFDA]/60 via-[#00FFDA]/20 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <div key={i} className="aspect-[3/4] bg-[#111] animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-4">Coming Soon</span>
              <h2 className="text-3xl font-black tracking-tight mb-4 text-[#F5F5F5]">New Collection Dropping Soon</h2>
              <p className="text-[#555] text-sm max-w-md mx-auto mb-8">New HIJINX apparel incoming. Visit our current collection in the meantime.</p>
              <a href={shopifyUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#00FFDA] text-[#050505] text-xs font-bold uppercase hover:bg-white transition-colors">
                Visit Store <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        ) : (
          <>
            {featuredProducts.length > 0 && (
              <div className="mb-16">
                <p className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase mb-8">Featured</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {featuredProducts.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
                </div>
              </div>
            )}
            {allActiveProducts.length > 0 && (
              <div>
                <p className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase mb-8">All Products</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {allActiveProducts.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Newsletter */}
        <div className="mt-20 border border-[#1a1a1a] bg-[#0D0D0D] p-8 md:p-12">
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-3">Stay Connected</span>
          <h2 className="text-2xl font-black tracking-tight mb-2 text-[#F5F5F5]">New Drops & Releases</h2>
          <p className="text-sm text-[#555] mb-6">Be the first to know when new items drop.</p>
          <NewsletterSignup source="apparel" />
        </div>
      </div>
    </PageShell>
  );
}