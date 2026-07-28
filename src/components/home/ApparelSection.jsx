import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const APPAREL_BG = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/d5e66ab94_Screenshot2026-07-28at94143AM.png';
const DEFAULT_SHOPIFY = 'https://www.hijinxco.com';

export default function ApparelSection({ products = [] }) {
  const { data: settingsList = [] } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: () => base44.entities.HomepageSettings.list(),
    staleTime: 0,
  });
  const settings = settingsList.find(s => s.active) || {};
  const shopifyUrl = settings.apparel_shopify_url || DEFAULT_SHOPIFY;

  return (
    <section className="py-16 md:py-24 overflow-hidden" style={{ background: 'transparent' }}>
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex items-center gap-3 mb-10">
          <div className="w-6 h-[2px] bg-[#E5FF00]" />
          <span className="font-mono text-[10px] tracking-[0.45em] text-[#E5FF00] uppercase font-bold">
            HIJINX CO. · Apparel
          </span>
        </div>

        <motion.div
          initial={{ y: 24 }} whileInView={{ y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.65 }}
          className="relative flex min-h-[420px] md:min-h-[500px] flex-col items-center justify-center text-center overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <img
            src={APPAREL_BG}
            alt="HIJINX Apparel"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
            style={{ filter: 'contrast(1.12) saturate(0.85)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/70" />
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, #E5FF0099 0%, transparent 60%)' }} />
          <div className="absolute top-0 left-0 bottom-0 w-[2px]"
            style={{ background: 'linear-gradient(180deg, #E5FF0060 0%, transparent 60%)' }} />

          <div className="relative p-8 md:p-12">
            <p className="font-mono text-[9px] tracking-[0.45em] text-[#E5FF00] uppercase font-bold mb-4">
              Coming Soon
            </p>
            <h3 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none mb-3">
              NEW SHOP
              <br />
              <span style={{ color: '#E5FF00' }}>COMING SOON</span>
            </h3>
            <p className="text-white/40 text-sm mt-3 mb-8 max-w-md mx-auto leading-relaxed">
              In the meantime, check out our old one.
            </p>
            <a
              href={shopifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3 text-xs font-black tracking-wider uppercase transition-all duration-200 hover:gap-4"
              style={{ background: '#E5FF00', color: '#0A0A0A' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Visit Hijinx.com
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}