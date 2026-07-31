import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Shirt, Wrench, Trophy, Tag } from 'lucide-react';
import SeoMeta from '@/components/system/seoMeta';
import MarketplaceStayConnected from '@/components/marketplace/MarketplaceStayConnected';

const CATEGORIES = [
  { name: 'Apparel', icon: Shirt, description: 'Team kits, tees, and race-day essentials.' },
  { name: 'Parts & Hardware', icon: Wrench, description: 'Performance and replacement components.' },
  { name: 'Memorabilia', icon: Trophy, description: 'Autographed hero cards, panels, and keepsakes.' },
  { name: 'Accessories', icon: Tag, description: 'Stickers, banners, and paddock gear.' },
];

const ACCENT = 'hsl(var(--motion))';
const ACCENT_MUTED = 'hsl(var(--motion-muted))';
const FG = 'hsl(var(--foreground))';
const FG_SEC = 'hsl(var(--foreground-secondary))';
const FG_QUIET = 'hsl(var(--foreground-quiet))';
const SURF = 'hsl(var(--surface-elevated))';
const DIV = 'hsl(var(--divider))';

export default function MarketplaceHome() {
  return (
    <div className="relative min-h-screen pb-24" style={{ background: 'hsl(var(--canvas))' }}>
      <SeoMeta title="Marketplace" description="The HIJINX Marketplace — motorsports apparel, parts, memorabilia, and gear." />

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 30%, hsl(var(--motion) / 0.10) 0%, transparent 70%)' }} />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* ── MASTHEAD ── */}
        <div className="pt-24 md:pt-32 pb-10 relative flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingBag className="w-5 h-5" style={{ color: ACCENT }} />
            <span className="font-mono text-[10px] tracking-[0.5em] uppercase font-bold" style={{ color: ACCENT }}>
              HIJINX Marketplace
            </span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-black tracking-tight uppercase leading-[0.92] mb-6"
            style={{ color: FG }}
          >
            The Marketplace
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-base md:text-lg max-w-xl leading-relaxed font-light mb-10"
            style={{ color: FG_SEC }}
          >
            A curated home for motorsports commerce — apparel, parts, memorabilia, and paddock gear from the teams, series, and builders that drive the sport.
          </motion.p>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2.5 px-8 py-4 text-xs font-bold tracking-[0.2em] uppercase cursor-not-allowed"
            style={{ background: ACCENT_MUTED, color: ACCENT, border: `1px solid ${ACCENT}40` }}
          >
            Coming Soon
          </button>
        </div>

        <div className="h-px mb-16" style={{ background: DIV }} />

        {/* ── CATEGORY GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="group relative rounded-2xl p-6 transition-all duration-300"
                style={{
                  background: SURF,
                  border: `1px solid ${DIV}`,
                  boxShadow: '0 1px 2px hsl(0 0% 0% / 0.04)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${ACCENT}66`; e.currentTarget.style.boxShadow = '0 8px 24px hsl(var(--motion) / 0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = DIV; e.currentTarget.style.boxShadow = '0 1px 2px hsl(0 0% 0% / 0.04)'; }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: ACCENT_MUTED, border: `1px solid ${ACCENT}40` }}>
                  <Icon className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <h3 className="text-lg font-black tracking-tight uppercase mb-2 transition-opacity" style={{ color: FG }}>
                  {cat.name}
                </h3>
                <p className="text-sm leading-relaxed font-light" style={{ color: FG_SEC }}>
                  {cat.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* ── SELLER CALLOUT ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-16 rounded-2xl p-10 md:p-14 text-center"
          style={{ background: SURF, border: `1px solid ${DIV}`, boxShadow: '0 1px 2px hsl(0 0% 0% / 0.04)' }}
        >
          <span className="font-mono text-[10px] tracking-[0.5em] uppercase font-bold mb-4 block" style={{ color: ACCENT }}>
            For Teams & Builders
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4" style={{ color: FG }}>
            Sell In The Marketplace
          </h2>
          <p className="text-base max-w-2xl mx-auto leading-relaxed font-light mb-8" style={{ color: FG_SEC }}>
            List your team kits, parts, and memorabilia alongside the rest of the paddock. The Marketplace connects your products to the fans and crews who already live here.
          </p>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.35em] uppercase font-bold cursor-not-allowed pb-0.5"
            style={{ color: ACCENT, borderBottom: `1px solid ${ACCENT}66` }}
          >
            Coming Soon
          </button>
        </motion.div>

        {/* ── STAY CONNECTED ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-12 rounded-2xl p-10 md:p-14 text-center"
          style={{ background: SURF, border: `1px solid ${DIV}`, boxShadow: '0 1px 2px hsl(0 0% 0% / 0.04)' }}
        >
          <span className="font-mono text-[10px] tracking-[0.5em] uppercase font-bold mb-4 block" style={{ color: ACCENT }}>
            Stay Connected
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase mb-3" style={{ color: FG }}>
            Be the first to know when the Marketplace opens.
          </h2>
          <p className="text-sm max-w-xl mx-auto leading-relaxed font-light mb-8" style={{ color: FG_SEC }}>
            Pick what you want to hear about and we'll keep you in the loop as the Marketplace comes online.
          </p>
          <MarketplaceStayConnected />
        </motion.div>
      </div>
    </div>
  );
}