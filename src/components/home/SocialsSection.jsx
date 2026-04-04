import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Instagram, Youtube, Linkedin, Facebook, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  <svg className={className} style={style} viewBox="0 0 192 192" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.141-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C28.351 139.557 22.807 120.33 22.605 96c.202-24.33 5.746-43.557 16.472-57.142C50.292 24.742 67.543 17.427 90.352 17.258c22.974.17 40.557 7.52 52.26 21.858 5.765 7.045 10.093 15.94 12.918 26.395l16.253-4.333c-3.412-12.757-8.836-23.683-16.253-32.678C139.905 10.331 118.022.408 90.478.187h-.238C62.69.408 41.11 10.36 26.3 29.539 13.428 46.51 6.9 70.478 6.666 96c.234 25.522 6.762 49.492 19.632 66.461C41.11 181.64 62.69 191.592 90.24 191.813h.238c24.631-.186 42.062-6.616 56.37-20.912 18.724-18.699 18.131-42.231 11.993-56.683-4.554-10.629-13.222-19.268-17.304-25.23zm-40.58 30.427c-10.461.571-21.327-4.109-21.868-14.15-.412-7.714 5.523-16.307 23.553-17.332 2.059-.119 4.07-.176 6.033-.176 6.312 0 12.216.61 17.587 1.774-2.001 24.975-15.048 29.412-25.305 29.884z"/>
  </svg>
);

const HASHTAG_THEMES = [
  {
    title: 'HIJINX Associated',
    hashtags: ['#hijinx', '#inmotionwithpurpose', '#thehijinxco', '#inmotion', '#withpurpose'],
  },
  {
    title: 'Motorsports Culture',
    hashtags: ['#motorsports', '#racinglife', '#grassrootsracing', '#racingcommunity', '#itsracingtime'],
  },
  {
    title: 'INDEX46 Directory',
    hashtags: ['#index46', '#drivers', '#teams', '#tracks', '#series'],
  },
  {
    title: 'The Outlet',
    hashtags: ['#theoutlet', '#motorsportsmedia', '#racingstories', '#racingculture', '#pitlanelive'],
  },
  {
    title: 'Apparel & Lifestyle',
    hashtags: ['#hijinxapparel', '#weartheculture', '#racingstyle', '#paddocklife', '#garagestyle'],
  },
  {
    title: 'Race Day',
    hashtags: ['#raceday', '#flagtoflag', '#chaosonthetracks', '#greenwhitecheckered', '#postrace'],
  },
];

const SOCIAL_CONFIG = [
  { key: 'social_instagram_url', handleKey: 'social_instagram_handle', label: 'Instagram', icon: Instagram, color: '#E1306C' },
  { key: 'social_x_url', handleKey: 'social_x_handle', label: 'X / Twitter', icon: Twitter, color: '#1DA1F2' },
  { key: 'social_tiktok_url', handleKey: 'social_tiktok_handle', label: 'TikTok', icon: TikTokIcon, color: '#69C9D0' },
  { key: 'social_youtube_url', handleKey: 'social_youtube_handle', label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { key: 'social_facebook_url', handleKey: 'social_facebook_handle', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { key: 'social_discord_url', handleKey: 'social_discord_handle', label: 'Discord', icon: DiscordIcon, color: '#5865F2' },
  { key: 'social_threads_url', handleKey: 'social_threads_handle', label: 'Threads', icon: ThreadsIcon, color: '#AAAAAA' },
  { key: 'social_linkedin_url', handleKey: 'social_linkedin_handle', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { key: 'social_snapchat_url', handleKey: 'social_snapchat_handle', label: 'Snapchat', icon: null, label2: '👻', color: '#FFFC00' },
];

export default function SocialsSection() {
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState([]);

  const { data: allSettings = [] } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: () => base44.entities.HomepageSettings.list(),
    staleTime: 10 * 60 * 1000,
  });

  const singleton = allSettings.find(s => s.active) || {};
  const activeSocials = SOCIAL_CONFIG.filter(s => singleton[s.key]);

  const toggleHashtag = (tag) => {
    setSelected(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleCopySelected = () => {
    if (selected.length === 0) return;
    navigator.clipboard.writeText(selected.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


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
        {activeSocials.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activeSocials.map(({ key, handleKey, label, icon: Icon, label2, color }, i) => (
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
                {singleton[handleKey] ? (
                  <p className="font-mono text-[9px] tracking-[0.15em] text-white/50 truncate">{singleton[handleKey]}</p>
                ) : (
                  <p className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase truncate">
                    {singleton[key].replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                  </p>
                )}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 ml-auto flex-shrink-0 transition-colors" />
            </motion.a>
          ))}
        </div>
        )}

        {/* Hashtag glimpse */}
        <div className="mt-10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <p className="font-mono text-[9px] tracking-[0.45em] text-[#FF6B35] uppercase font-bold mb-2">Tag Us In Your Posts</p>
            <div className="flex flex-wrap gap-2">
              {['#hijinx', '#motorsports', '#raceday', '#grassrootsracing', '#weartheculture', '#index46'].map(tag => (
                <span key={tag} className="font-mono text-sm text-white/50">{tag}</span>
              ))}
              <span className="font-mono text-sm text-white/20">+ more</span>
            </div>
          </div>
          <Link
            to="/hashtag-library"
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 border border-[#FF6B35] text-[#FF6B35] text-xs font-bold hover:bg-[#FF6B35]/10 transition-colors"
          >
            Browse Hashtag Library <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </section>
  );
}