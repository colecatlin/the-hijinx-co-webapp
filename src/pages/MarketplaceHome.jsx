import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShoppingBag, Shirt, Wrench, Trophy, Tag } from 'lucide-react';
import SeoMeta from '@/components/system/seoMeta';

const CATEGORIES = [
  { name: 'Apparel', icon: Shirt, description: 'Team kits, tees, and race-day essentials.' },
  { name: 'Parts & Hardware', icon: Wrench, description: 'Performance and replacement components.' },
  { name: 'Memorabilia', icon: Trophy, description: 'Autographed hero cards, panels, and keepsakes.' },
  { name: 'Accessories', icon: Tag, description: 'Stickers, banners, and paddock gear.' },
];

export default function MarketplaceHome() {
  return (
    <div className="relative min-h-screen pb-24">
      <SeoMeta title="Marketplace" description="The HIJINX Marketplace — motorsports apparel, parts, memorabilia, and gear." />

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(29,161,161,0.08) 0%, transparent 70%)' }} />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* ── MASTHEAD ── */}
        <div className="pt-24 md:pt-32 pb-10 relative flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingBag className="w-5 h-5" style={{ color: '#1DA1A1' }} />
            <span className="font-mono text-[10px] tracking-[0.5em] uppercase font-bold" style={{ color: '#1DA1A1' }}>
              HIJINX Marketplace
            </span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-black tracking-tight uppercase text-white leading-[0.92] mb-6"
          >
            The Marketplace
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-white/55 text-base md:text-lg max-w-xl leading-relaxed font-light mb-10"
          >
            A curated home for motorsports commerce — apparel, parts, memorabilia, and paddock gear from the teams, series, and builders that drive the sport.
          </motion.p>
          <Link
            to="/store"
            className="inline-flex items-center gap-2.5 px-8 py-4 text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300"
            style={{ background: '#1DA1A1', color: '#050A0A' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1DA1A1'; }}
          >
            Browse The Store <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="h-px mb-16" style={{ background: 'rgba(26,26,26,1)' }} />

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
                  background: 'rgba(8, 12, 14, 0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(29,161,161,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(29,161,161,0.1)', border: '1px solid rgba(29,161,161,0.25)' }}>
                  <Icon className="w-5 h-5" style={{ color: '#1DA1A1' }} />
                </div>
                <h3 className="text-white text-lg font-black tracking-tight uppercase mb-2 group-hover:opacity-70 transition-opacity">
                  {cat.name}
                </h3>
                <p className="text-white/45 text-sm leading-relaxed font-light">
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
          style={{
            background: 'rgba(8, 12, 14, 0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <span className="font-mono text-[10px] tracking-[0.5em] uppercase font-bold mb-4 block" style={{ color: '#1DA1A1' }}>
            For Teams & Builders
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase text-white mb-4">
            Sell In The Marketplace
          </h2>
          <p className="text-white/55 text-base max-w-2xl mx-auto leading-relaxed font-light mb-8">
            List your team kits, parts, and memorabilia alongside the rest of the paddock. The Marketplace connects your products to the fans and crews who already live here.
          </p>
          <Link
            to="/store"
            className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.35em] uppercase font-bold text-white/80 hover:text-white border-b border-white/40 hover:border-white pb-0.5 transition-all"
          >
            Visit The Store <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}