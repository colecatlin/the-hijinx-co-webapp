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
        title="Apparel | Coming Soon"
        description="New HIJINX apparel shop coming soon."
      />

      {/* Coming Soon */}
      <div className="max-w-7xl mx-auto px-6 py-24 md:py-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-6">Hijinx Apparel</span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-5 text-[#F5F5F5] leading-[0.95]">New Shop Coming Soon</h1>
          <p className="text-[#555] text-sm md:text-base max-w-md mx-auto mb-10">
            In the meantime, check out our old one.
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
          <p className="text-sm text-[#555] mb-6">Be the first to know when the new shop drops.</p>
          <NewsletterSignup source="apparel" />
        </div>
      </div>
    </PageShell>
  );
}