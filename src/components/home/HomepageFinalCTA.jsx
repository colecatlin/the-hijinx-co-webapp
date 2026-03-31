import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Instagram, Youtube, ArrowRight, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';

function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email.'); return; }
    setError('');
    setSent(true);
  };

  if (sent) {
    return <p className="font-mono text-[10px] tracking-[0.35em] text-[#00FFDA] uppercase">You're in. We'll be in touch.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          placeholder="your@email.com"
          className="bg-white/8 border border-white/20 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FFDA]/60 w-56 transition-colors"
        />
        <button type="submit"
          className="flex items-center gap-1.5 px-5 py-3 bg-[#00FFDA] text-[#050A0A] text-xs font-black tracking-wider uppercase hover:bg-white transition-colors"
        >
          Join <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      {error && <p className="text-[10px] text-red-400 font-mono">{error}</p>}
    </form>
  );
}

export default function HomepageFinalCTA() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#001F1F] via-[#001233] to-[#000D20]" />
      <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-[#00FFDA]/8 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#2563EB]/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00FFDA]/60 to-transparent" />
      <div className="absolute inset-0 grid-bg opacity-[0.04]" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-10 h-px bg-[#00FFDA]/60" />
            <span className="font-mono text-[9px] tracking-[0.45em] text-[#00FFDA] uppercase font-bold">Stay Connected</span>
            <div className="w-10 h-px bg-[#00FFDA]/60" />
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            Stay in it.
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-sm mx-auto">
            Get race results, editorial drops, and platform updates — straight to your inbox.
          </p>

          <SubscribeForm />

          {/* Follow */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mt-10 flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-5">
              <span className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase">Follow along</span>
              <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer"
                className="p-2 text-white/30 hover:text-[#00FFDA] transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer"
                className="p-2 text-white/30 hover:text-[#00FFDA] transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>

            <Link
              to={createPageUrl('MotorsportsHome')}
              className="group inline-flex items-center gap-2 mt-2 font-mono text-[9px] tracking-[0.3em] text-white/30 hover:text-[#00FFDA] uppercase transition-colors"
            >
              Explore the Platform <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, duration: 1 }}
            className="mt-14"
          >
            <p className="font-mono text-[9px] tracking-[0.45em] text-white/20 uppercase">
              HIJINX CO · Motorsports · Culture · Movement · {new Date().getFullYear()}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}