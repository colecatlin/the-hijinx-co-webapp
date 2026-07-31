import React, { useEffect } from 'react';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { ExternalLink } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import { motion } from 'framer-motion';
import ApparelStayConnected from '@/components/apparel/ApparelStayConnected';

const DEFAULT_SHOPIFY = 'https://www.hijinxco.com';
const APPAREL_BG = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/d5e66ab94_Screenshot2026-07-28at94143AM.png';

const ACCENT = 'hsl(var(--motion))';
const FG = 'hsl(var(--foreground))';
const FG_SEC = 'hsl(var(--foreground-secondary))';
const FG_QUIET = 'hsl(var(--foreground-quiet))';
const SURF = 'hsl(var(--surface-elevated))';
const DIV = 'hsl(var(--divider))';

export default function ApparelHome() {
  useEffect(() => { Analytics.pageView('ApparelHome'); }, []);

  return (
    <PageShell style={{ background: 'hsl(var(--canvas))', color: FG, minHeight: '100vh' }}>
      <SeoMeta
        title="Apparel | Coming Soon"
        description="New HIJINX apparel shop coming soon."
      />

      {/* Coming Soon with background image — image hero keeps dark overlay for legible light text */}
      <div className="min-h-[60vh] md:min-h-[70vh] flex items-center justify-center relative overflow-hidden">
        <img
          src={APPAREL_BG}
          alt="HIJINX Apparel"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.5, filter: 'contrast(1.12) saturate(0.85)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/72 to-black/85" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative flex flex-col items-center text-center px-6 py-24"
        >
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase block mb-6" style={{ color: '#7FE9E0' }}>Hijinx Apparel</span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-5 leading-[0.95] text-white">New Shop Coming Soon</h1>
          <p className="text-white/60 text-sm md:text-base max-w-md mx-auto mb-10">
            In the meantime, check out our old one.
          </p>
          <a
            href={DEFAULT_SHOPIFY}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 text-sm font-black tracking-[0.1em] uppercase transition-colors"
            style={{ background: ACCENT, color: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--motion-hover))'; }}
            onMouseLeave={e => { e.currentTarget.style.background = ACCENT; }}
          >
            Visit Hijinx.com <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>
      </div>

      {/* Stay Connected */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="p-8 md:p-14 flex flex-col items-center text-center" style={{ background: SURF, border: `1px solid ${DIV}`, boxShadow: '0 1px 2px hsl(0 0% 0% / 0.04)' }}>
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase block mb-4" style={{ color: ACCENT }}>Stay Connected</span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3" style={{ color: FG }}>
            Stay connected: Be the first to know about all things HIJINX apparel.
          </h2>
          <p className="text-sm mb-8 max-w-xl" style={{ color: FG_SEC }}>
            Pick what you want to hear about and we'll keep you in the loop.
          </p>
          <ApparelStayConnected />
        </div>
      </div>
    </PageShell>
  );
}