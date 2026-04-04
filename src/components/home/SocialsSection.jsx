import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Instagram, Youtube, Linkedin, Facebook, Twitter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const TikTokIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
  </svg>
);

const DiscordIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const ThreadsIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.028-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.459 3.616 8.876 3.592 12c.024 3.131.712 5.55 2.057 7.185 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.583-1.312-.883-2.378-.892h-.018c-.868 0-2.167.23-2.997 1.4l-1.648-1.144C6.933 5.612 8.565 4.83 10.24 4.83h.02c2.764.023 4.565 1.67 4.996 4.543a10.5 10.5 0 0 1 .176.045c1.5.416 2.637 1.22 3.262 2.635.851 1.935.782 5.123-1.548 7.397-1.764 1.723-3.917 2.528-6.959 2.55zm.7-8.938c-.112 0-.223.003-.335.009-1.874.107-2.99.956-2.934 2.205.054 1.225 1.2 1.857 2.562 1.784 1.312-.071 2.817-.707 3.086-3.554a8.567 8.567 0 0 0-2.38-.444z"/>
  </svg>
);

const SOCIAL_CONFIG = [
  { key: 'social_instagram_url', label: 'Instagram', icon: Instagram, color: '#E1306C' },
  { key: 'social_x_url', label: 'X / Twitter', icon: Twitter, color: '#1DA1F2' },
  { key: 'social_tiktok_url', label: 'TikTok', icon: TikTokIcon, color: '#69C9D0' },
  { key: 'social_youtube_url', label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { key: 'social_facebook_url', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { key: 'social_discord_url', label: 'Discord', icon: DiscordIcon, color: '#5865F2' },
  { key: 'social_threads_url', label: 'Threads', icon: ThreadsIcon, color: '#fff' },
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