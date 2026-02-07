import React from 'react';
import { motion } from 'framer-motion';
import PageShell from '@/components/shared/PageShell';
import NewsletterSignup from '@/components/shared/NewsletterSignup';
import { GraduationCap, BookOpen, Wrench, TrendingUp } from 'lucide-react';

const modules = [
  { icon: BookOpen, title: 'Foundations', desc: 'Core principles of business, branding, and creative work.' },
  { icon: Wrench, title: 'Technical Skills', desc: 'Hands-on workshops in design, writing, and production.' },
  { icon: TrendingUp, title: 'Growth', desc: 'Marketing, audience building, and revenue strategies.' },
];

export default function Learning() {
  return (
    <PageShell>
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase">Hijinx U</span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mt-3 max-w-3xl">Learn. Build. Grow.</h1>
          <p className="text-gray-400 mt-4 max-w-lg">Educational resources and courses for creators and entrepreneurs.</p>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#E5FF00] via-white to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {modules.map((m, i) => (
            <motion.div key={m.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="border border-gray-200 p-8 hover:border-[#0A0A0A] transition-colors">
              <m.icon className="w-5 h-5 text-gray-400 mb-6" />
              <h3 className="font-bold">{m.title}</h3>
              <p className="text-sm text-gray-500 mt-2">{m.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gray-50 p-8 md:p-12 text-center">
          <GraduationCap className="w-8 h-8 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-black tracking-tight">Coming Soon</h2>
          <p className="text-sm text-gray-500 mt-2 mb-6 max-w-md mx-auto">
            Hijinx U is currently in development. Sign up to get notified when courses launch.
          </p>
          <div className="flex justify-center">
            <NewsletterSignup source="learning" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}