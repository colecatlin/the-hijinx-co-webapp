import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Instagram } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const GRID_IMAGES = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=90&fit=crop',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=90&fit=crop',
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=90&fit=crop',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=90&fit=crop',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=90&fit=crop',
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&q=90&fit=crop',
];

const SOCIAL_LABELS = [
  { key: 'social_instagram_url', label: 'Instagram' },
  { key: 'social_x_url', label: 'X' },
  { key: 'social_tiktok_url', label: 'TikTok' },
  { key: 'social_youtube_url', label: 'YouTube' },
  { key: 'social_facebook_url', label: 'Facebook' },
  { key: 'social_threads_url', label: 'Threads' },
];

export default function SocialsSection({ media = [] }) {
  const { data: allSettings = [] } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: () => base44.entities.HomepageSettings.list(),
    staleTime: 10 * 60 * 1000,
  });
  const singleton = allSettings.find(s => s.active) || {};
  const socialLinks = SOCIAL_LABELS.filter(s => singleton[s.key]);
  const instagramUrl = singleton.social_instagram_url || 'https://instagram.com';
  const primarySocial = socialLinks[0] || { key: 'social_instagram_url', label: 'Instagram', url: instagramUrl };

  // Use uploaded media URLs if available, else fall back to placeholder grid
  const gridItems = media.length >= 4
    ? media.slice(0, 6).map(m => m.url || m.file_url || null).filter(Boolean)
    : GRID_IMAGES;

  return (
    <section className="bg-[#0A0A0A] py-16 md:py-24 border-t border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-[2px] bg-[#FF6B35]" />
              <span className="font-mono text-[10px] tracking-[0.45em] text-[#FF6B35] uppercase font-bold">
                Community
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Follow the chaos.
            </h2>
          </div>
          {socialLinks.length > 0 && (
            <div className="hidden md:flex items-center gap-4">
              {socialLinks.slice(0, 3).map(({ key, label }) => (
                <a
                  key={key}
                  href={singleton[key]}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[9px] tracking-[0.3em] text-white/30 hover:text-[#FF6B35] transition-colors uppercase font-bold"
                >
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Image grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {gridItems.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              whileHover={{ scale: 1.04, zIndex: 10 }}
              className={`relative overflow-hidden group cursor-pointer ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
              style={{ aspectRatio: i === 0 ? '1/1' : '1/1', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500"
                style={{ filter: 'contrast(1.1) saturate(0.85) brightness(0.9)' }}
              />
              <div className="absolute inset-0 bg-black/15 group-hover:bg-black/5 transition-all duration-300" />
              {i === 0 && (
                <div className="absolute bottom-4 left-4">
                  <div className="flex items-center gap-2 px-3 py-1.5"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Instagram className="w-3 h-3 text-[#FF6B35]" />
                    <span className="font-mono text-[8px] tracking-[0.3em] text-white/60 uppercase">@hijinxco</span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center">
          <a
            href={singleton[primarySocial.key] || instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 py-3 px-6 font-mono text-[9px] tracking-[0.3em] text-white/30 hover:text-[#FF6B35] transition-colors uppercase"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Instagram className="w-3 h-3" /> Follow HIJINX <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </section>
  );
}