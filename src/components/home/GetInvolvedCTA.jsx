import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const AUDIENCE = [
  { label: 'Drivers', desc: 'Claim your profile. Own your story.' },
  { label: 'Media',   desc: 'Get credentialed. Tell the story.' },
  { label: 'Creators', desc: 'Build with the culture.' },
  { label: 'Fans',    desc: 'Follow the action.' },
];

export default function GetInvolvedCTA() {
  return (
    <section className="bg-[#111111] py-20 md:py-32 border-t border-white/5 overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 text-center">

        <motion.div
          initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="relative p-10 md:p-16 overflow-hidden"
          style={{
            background: 'rgba(0,255,218,0.04)',
            border: '1px solid rgba(0,255,218,0.12)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full blur-[80px]"
              style={{ background: 'rgba(0,255,218,0.12)' }} />
            <div className="absolute bottom-[-40px] right-0 w-[300px] h-[200px] rounded-full blur-[80px]"
              style={{ background: 'rgba(255,107,53,0.08)' }} />
          </div>
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, #00FFDA80, transparent)' }} />

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 flex items-center justify-center"
              style={{ background: 'rgba(0,255,218,0.1)', border: '1px solid rgba(0,255,218,0.2)' }}>
              <Zap className="w-5 h-5 text-[#00FFDA]" />
            </div>
          </div>

          {/* Headline */}
          <div className="relative">
            <span className="font-mono text-[9px] tracking-[0.45em] text-[#00FFDA] uppercase font-bold block mb-5">
              Get Involved
            </span>
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[0.9] mb-6">
              Your world.
              <br />
              <span className="text-[#00FFDA]">Welcome in.</span>
            </h2>
            <p className="text-white/40 text-base md:text-lg leading-relaxed max-w-md mx-auto mb-10">
              Whether you race, shoot, create, or follow — HIJINX is built for you.
            </p>

            {/* Audience pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {AUDIENCE.map(a => (
                <div key={a.label} className="px-4 py-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-xs font-bold text-white tracking-wide">{a.label}</div>
                  <div className="text-[10px] text-white/30 mt-0.5">{a.desc}</div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="group inline-flex items-center gap-2 px-8 py-4 text-sm font-black tracking-wider uppercase transition-all duration-200 hover:gap-3"
                style={{ background: '#00FFDA', color: '#0A0A0A' }}
              >
                Join HIJINX <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <Link
                to={createPageUrl('MotorsportsHome')}
                className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold tracking-wide uppercase border border-white/15 text-white/60 hover:border-white/30 hover:text-white transition-all duration-200"
              >
                Explore First
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}