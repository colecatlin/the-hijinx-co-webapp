import React, { useEffect } from 'react';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { ExternalLink } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import { motion } from 'framer-motion';
import NewsletterSignup from '@/components/shared/NewsletterSignup';

const DEFAULT_SHOPIFY = 'https://www.hijinxco.com';
const APPAREL_BG = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/d5e66ab94_Screenshot2026-07-28at94143AM.png';

export default function ApparelHome() {
  useEffect(() => { Analytics.pageView('ApparelHome'); }, []);

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh' }}>
      <SeoMeta
        title="Apparel | Coming Soon"
        description="New HIJINX apparel shop coming soon."
      />

      {/* Coming Soon with background image */}
      <div className="min-h-[60vh] md:min-h-[70vh] flex items-center justify-center relative overflow-hidden">
        <img
          src={APPAREL_BG}
          alt="HIJINX Apparel"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.45, filter: 'contrast(1.12) saturate(0.85)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-black/85" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative flex flex-col items-center text-center px-6 py-24"
        >
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-6">Hijinx Apparel</span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-5 text-[#F5F5F5] leading-[0.95]">New Shop Coming Soon</h1>
          <p className="text-white/50 text-sm md:text-base max-w-md mx-auto mb-10">
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
      </div>

      {/* Newsletter */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="border border-[#1a1a1a] bg-[#0D0D0D] p-8 md:p-12">
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-3">Stay Connected</span>
          <h2 className="text-2xl font-black tracking-tight mb-2 text-[#F5F5F5]">New Drops & Releases</h2>
          <p className="text-sm text-[#555] mb-6">Be the first to know when the new shop drops.</p>
          <NewsletterSignup source="apparel" />
        </div>
      </div>
    </PageShell>
  );
}