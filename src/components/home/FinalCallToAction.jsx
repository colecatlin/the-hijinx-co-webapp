import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Instagram, Youtube, Facebook, Twitter } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const TikTokIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
  </svg>
);

const SOCIAL_MAP = {
  social_instagram_url: { label: 'Instagram', icon: Instagram },
  social_x_url:         { label: 'X', icon: Twitter },
  social_tiktok_url:    { label: 'TikTok', icon: TikTokIcon },
  social_youtube_url:   { label: 'YouTube', icon: Youtube },
  social_facebook_url:  { label: 'Facebook', icon: Facebook },
};

export default function FinalCallToAction() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: allSettings = [] } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: () => base44.entities.HomepageSettings.list(),
    staleTime: 10 * 60 * 1000,
  });
  const settings = allSettings.find(s => s.active) || {};
  const activeSocials = Object.entries(SOCIAL_MAP).filter(([key]) => settings[key]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await base44.entities.NewsletterSubscriber.create({ email, source: 'homepage_cta' });
    } catch (_) {}
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <section className="bg-[#0A0A0A] py-16 md:py-24 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 md:px-12 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden p-8 md:p-14"
          style={{
            background: 'rgba(0,255,218,0.03)',
            border: '1px solid rgba(0,255,218,0.10)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 14,
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[500px] h-[160px] rounded-full blur-[80px] pointer-events-none"
            style={{ background: 'rgba(0,255,218,0.08)' }}
          />
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, #00FFDA55, transparent)' }}
          />

          <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-10">

            {/* Left — copy */}
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[9px] tracking-[0.5em] text-[#00FFDA] uppercase font-bold block mb-3">
                Join the Movement
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.0] mb-3">
                You know what this is now.<br />
                <span style={{ color: '#00FFDA' }}>Get inside.</span>
              </h2>
              <p className="text-white/35 text-sm leading-relaxed max-w-xs mb-6">
                Create your profile, follow the culture, and get closer to the world we are building.
              </p>

              {/* Primary CTA */}
              <Link
                to="/DriverProfileSetup"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-black tracking-widest uppercase transition-all duration-200 hover:brightness-110"
                style={{ background: '#00FFDA', color: '#0A0A0A', borderRadius: 2 }}
              >
                Create Your Profile
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="mt-3 block font-mono text-[9px] tracking-[0.3em] text-white/20 hover:text-white/50 transition-colors uppercase"
              >
                Already have an account? Sign in →
              </button>
            </div>

            {/* Right — email + socials */}
            <div className="flex-shrink-0 w-full md:w-[300px] flex flex-col gap-6">

              {/* Newsletter */}
              <div>
                <p className="font-mono text-[9px] tracking-[0.4em] text-white/30 uppercase mb-3">
                  Stay in the loop
                </p>
                {submitted ? (
                  <div className="flex items-center gap-3 py-3">
                    <div className="w-2 h-2 rounded-full bg-[#00FFDA]" />
                    <span className="font-mono text-sm text-[#00FFDA] tracking-wide">You're in. See you inside.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="flex-1 min-w-0 px-3 py-2.5 text-sm text-white bg-white/[0.05] border border-white/10 focus:outline-none focus:border-[#00FFDA]/40 placeholder:text-white/20 transition-colors"
                      style={{ borderRadius: 2 }}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-shrink-0 px-4 py-2.5 text-xs font-black tracking-wider uppercase flex items-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#00FFDA', color: '#0A0A0A', borderRadius: 2 }}
                    >
                      {loading ? '...' : 'Join'}
                    </button>
                  </form>
                )}
              </div>

              {/* Social icons — compact row only */}
              {activeSocials.length > 0 && (
                <div>
                  <p className="font-mono text-[9px] tracking-[0.4em] text-white/25 uppercase mb-3">
                    Follow the chaos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeSocials.map(([key, social]) => {
                      const SocialIcon = social.icon;
                      return (
                        <a
                          key={key}
                          href={settings[key]}
                          target="_blank"
                          rel="noreferrer"
                          title={social.label}
                          className="w-9 h-9 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                          }}
                        >
                          <SocialIcon className="w-4 h-4" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}