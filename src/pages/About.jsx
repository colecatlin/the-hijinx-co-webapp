import React from 'react';
import PageShell from '@/components/shared/PageShell';
import { motion } from 'framer-motion';

export default function About() {
  return (
    <PageShell>
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase">About</span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mt-3 max-w-4xl leading-[0.95]">
            We build at the intersection of media, motorsports, and culture.
          </h1>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#E5FF00] via-white to-transparent" />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h2 className="text-xl font-black tracking-tight mb-3">The Company</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              The Hijinx Co LLC is a multi-vertical platform company. We operate across editorial publishing, 
              competitive motorsports, apparel, creative services, technology, education, hospitality, and food and beverage. 
              Each vertical is designed to stand on its own while connecting to the larger ecosystem.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight mb-3">The Approach</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We don't believe in doing one thing. We believe in doing many things well, with intention and craft. 
              Every product, story, and service we produce reflects a commitment to quality and a refusal to settle for average.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight mb-3">The Verticals</h2>
            <ul className="space-y-2">
              {[
                'The Outlet — Editorial publishing and journalism',
                'Motorsports — Competition, data, and community',
                'Apparel & Lifestyle — Goods and essentials',
                'Creative Services — Writing, design, and production',
                'Tech — Products and tools for creators',
                'Hijinx U — Education and growth',
                'Hospitality — Service and staffing',
                'Food & Beverage — Coffee, pizza, and concepts',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-[#0A0A0A] rounded-full mt-2 shrink-0" />
                  <span className="text-sm text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-8 border-t border-gray-200">
            <p className="font-mono text-xs text-gray-400 tracking-wider">BUILT ON PURPOSE.</p>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
}