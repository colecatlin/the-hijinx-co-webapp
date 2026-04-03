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
    <section className="bg-[#111111] py-12 md:py-16 border-t border-white/5 overflow-hidden">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="relative overflow-hidden"
          style={{
            background: 'rgba(0,255,218,0.04)',
            border: '1px solid rgba(0,255,218,0.12)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Ambient glow */}
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full blur-[100px] pointer-events-none"
            style={{ background: 'rgba(0,255,218,0.1)' }} />
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, #00FFDA70, transparent)' }} />

          <div className="relative px-8 py-10 md:px-14 md:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">

            {/* Left — copy */}
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[9px] tracking-[0.5em] text-[#00FFDA] uppercase font-bold block mb-3">
                Get Involved
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.0] mb-2">
                Your world.<br />
                <span className="text-[#00FFDA]">Welcome in.</span>
              </h2>
              <p className="text-white/35 text-sm leading-relaxed max-w-xs">
                Race, shoot, create, or follow — get inside access when you join.
              </p>
            </div>

            {/* Right — email capture + join */}
            <div className="flex-shrink-0 w-full md:w-auto md:min-w-[340px]">
              {submitted ? (
                <div className="flex items-center gap-3 py-4">
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
                    className="flex-1 min-w-0 px-4 py-3 text-sm text-white bg-white/[0.06] border border-white/10 focus:outline-none focus:border-[#00FFDA]/50 placeholder:text-white/20 transition-colors"
                    style={{ borderRadius: 2 }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-shrink-0 px-5 py-3 text-xs font-black tracking-wider uppercase flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: '#00FFDA', color: '#0A0A0A', borderRadius: 2 }}
                  >
                    {loading ? '...' : <><span>Join</span><ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                </form>
              )}

              {/* Secondary — create account */}
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="mt-3 font-mono text-[9px] tracking-[0.3em] text-white/25 hover:text-white/60 transition-colors uppercase"
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