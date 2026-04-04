import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Instagram, Youtube, Linkedin, Facebook, Twitter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const SOCIAL_CONFIG = [
  { key: 'social_instagram_url', label: 'Instagram', icon: Instagram, color: '#E1306C' },
  { key: 'social_x_url', label: 'X / Twitter', icon: Twitter, color: '#1DA1F2' },
  { key: 'social_tiktok_url', label: 'TikTok', icon: null, label2: 'TT', color: '#69C9D0' },
  { key: 'social_youtube_url', label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { key: 'social_facebook_url', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { key: 'social_discord_url', label: 'Discord', icon: null, label2: '💬', color: '#5865F2' },
  { key: 'social_threads_url', label: 'Threads', icon: null, label2: '@', color: '#fff' },
  { key: 'social_linkedin_url', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { key: 'social_snapchat_url', label: 'Snapchat', icon: null, label2: '👻', color: '#FFFC00' },
];

export default function SocialsSection() {
  const { data: allSettings = [] } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: () => base44.entities.HomepageSettings.list(),
    staleTime: 10 * 60 * 1000,
  });

  const singleton = allSettings.find(s => s.active) || {};
  const activeSocials = SOCIAL_CONFIG.filter(s => singleton[s.key]);

  if (activeSocials.length === 0) return null;

  const primary = activeSocials[0];
  const Icon = primary.icon;

  return (
    <section className="bg-[#0A0A0A] py-16 md:py-24 border-t border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex items-end justify-between mb-12">
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
            <p className="text-white/35 text-sm mt-3 max-w-md">
              Keep up with HIJINX across all platforms — race coverage, culture, and everything in between.
            </p>
          </div>
        </div>

        {/* Social links grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activeSocials.map(({ key, label, icon: Icon, label2, color }, i) => (
            <motion.a
              key={key}
              href={singleton[key]}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="group relative flex items-center gap-4 p-5 overflow-hidden hover:border-white/20 transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* Color accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ background: color }}
              />

              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                style={{ background: `${color}22`, border: `1px solid ${color}44` }}
              >
                {Icon ? (
                  <Icon className="w-4 h-4" style={{ color }} />
                ) : (
                  <span className="text-sm font-bold" style={{ color }}>{label2}</span>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-none mb-1">{label}</p>
                <p className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase truncate">
                  {singleton[key].replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                </p>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 ml-auto flex-shrink-0 transition-colors" />
            </motion.a>
          ))}
        </div>

        {/* Primary CTA */}
        <div className="mt-8 flex items-center justify-center">
          <a
            href={singleton[primary.key]}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 py-3 px-6 font-mono text-[9px] tracking-[0.3em] text-white/30 hover:text-[#FF6B35] transition-colors uppercase"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {Icon && <Icon className="w-3 h-3" />}
            Follow HIJINX on {primary.label} <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </section>
  );
}