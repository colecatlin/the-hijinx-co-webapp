import React, { useEffect } from 'react';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { ExternalLink } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import { motion } from 'framer-motion';
import NewsletterSignup from '@/components/shared/NewsletterSignup';

const DEFAULT_SHOPIFY = 'https://www.hijinxco.com';

export default function ApparelHome() {
  useEffect(() => { Analytics.pageView('ApparelHome'); }, []);

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh' }}>
      <SeoMeta
        title="Apparel | Wear the Culture"
        description="HIJINX apparel and essentials — coming soon."
      />

      {/* Hero */}
      <div style={{ background: '#050505' }}>
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-[#00FFDA] uppercase">Hijinx Apparel</span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mt-3 max-w-3xl text-[#F5F5F5] leading-[0.95]">Wear the<br />culture.</h1>
          <p className="text-[#555] mt-5 max-w-lg text-base">Apparel and essentials from the Hijinx brand. Built for people who live in the pits.</p>
        </div>
        <div className="h-px bg-gradient-to-r from-[#00FFDA]/60 via-[#00FFDA]/20 to-transparent" />
      </div>

      {/* Coming Soon */}
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-6">Coming Soon</span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-5 text-[#F5F5F5] leading-[0.95]">New Collection In The Works</h2>
          <p className="text-[#555] text-sm md:text-base max-w-md mx-auto mb-10">
            The HIJINX apparel shop is being built. In the meantime, browse our current collection over at Hijinx.com.
          </p>
          <a
            href={DEFAULT_SHOPIFY}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#00FFDA] text-[#050505] text-sm font-black tracking-[0.1em] uppercase hover:bg-white transition-colors"
          >
            Visit Hijinx.com <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Newsletter */}
        <div className="mt-24 border border-[#1a1a1a] bg-[#0D0D0D] p-8 md:p-12">
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-3">Stay Connected</span>
          <h2 className="text-2xl font-black tracking-tight mb-2 text-[#F5F5F5]">New Drops & Releases</h2>
          <p className="text-sm text-[#555] mb-6">Be the first to know when the new collection drops.</p>
          <NewsletterSignup source="apparel" />
        </div>
      </div>
    </PageShell>
  );
}