import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GetInvolvedCTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <section className="py-12 md:py-16 overflow-hidden" style={{ background: 'transparent' }}>
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-surface-elevated border border-motion/30"
        >
          {/* Ambient glow */}
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full blur-[100px] pointer-events-none" style={{ background: 'hsl(var(--motion) / 0.10)' }} />
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--motion) / 0.5), transparent)' }} />

          <div className="relative px-8 py-10 md:px-14 md:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">

            {/* Left — copy */}
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[9px] tracking-[0.5em] text-motion uppercase font-bold block mb-3">
                Join the Movement
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight leading-[1.0] mb-2">
                Get inside.<br />
                <span className="text-motion">Be part of it.</span>
              </h2>
              <p className="text-foreground-quiet text-sm leading-relaxed max-w-xs">
                Race, shoot, create, or follow. Access the INDEX46 Race Core, editorial network, and community — when you join.
              </p>
            </div>

            {/* Right — email capture + join */}
            <div className="flex-shrink-0 w-full md:w-auto md:min-w-[340px]">
              {submitted ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-2 h-2 rounded-full bg-motion" />
                  <span className="font-mono text-sm text-motion tracking-wide">You're in. See you inside.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 min-w-0 px-4 py-3 text-sm text-foreground bg-surface-interactive border border-divider focus:outline-none focus:border-motion/60 placeholder:text-foreground-quiet transition-colors"
                    style={{ borderRadius: 2 }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-shrink-0 px-5 py-3 text-xs font-black tracking-wider uppercase flex items-center gap-2 transition-all hover:brightness-110 disabled:opacity-50 bg-motion text-white"
                    style={{ borderRadius: 2 }}
                  >
                    {loading ? '...' : <><span>Join</span><ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                </form>
              )}

              {/* Secondary — create account */}
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="mt-3 font-mono text-[9px] tracking-[0.3em] text-foreground-quiet hover:text-foreground transition-colors uppercase"
              >
                Already have an account? Sign in →
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}