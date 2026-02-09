import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Monitor, Cpu, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const products = [
  {
    name: 'Marble App',
    tagline: 'Organize everything.',
    description: 'A productivity and workflow tool designed for creators and small teams. Streamline projects, manage tasks, and keep everything in one place.',
    status: 'In Development',
    icon: Monitor,
  },
  {
    name: 'Forge MNFCTR',
    tagline: 'Build what matters.',
    description: 'A manufacturing and production management platform for small-batch makers. Track inventory, manage orders, and scale operations.',
    status: 'Coming Soon',
    icon: Cpu,
  },
];

export default function TechHome() {
  return (
    <PageShell>
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase">Hijinx Tech</span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mt-3 max-w-3xl">Products & Tools</h1>
          <p className="text-gray-400 mt-4 max-w-lg">Software built by Hijinx for creators, teams, and makers.</p>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#E5FF00] via-white to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="space-y-6">
          {products.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="border border-gray-200 p-8 md:p-12 hover:border-[#0A0A0A] transition-colors"
            >
              <div className="flex items-start gap-4">
                <p.icon className="w-6 h-6 text-gray-400 mt-1 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-black tracking-tight">{p.name}</h2>
                    <span className="px-3 py-1 text-[10px] font-mono tracking-wider bg-gray-100 text-gray-500 uppercase">{p.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 italic mb-3">{p.tagline}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{p.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}