import React from 'react';
import { motion } from 'framer-motion';
import PageShell from '@/components/shared/PageShell';
import NewsletterSignup from '@/components/shared/NewsletterSignup';
import { Coffee, UtensilsCrossed, Sparkles } from 'lucide-react';

const concepts = [
  { icon: Coffee, name: 'Coffee', desc: 'Small-batch, thoughtfully sourced coffee. Roasted with intention.', status: 'Active' },
  { icon: UtensilsCrossed, name: 'Pizza', desc: 'Handmade pies, simple ingredients, good vibes.', status: 'Active' },
  { icon: Sparkles, name: 'More Coming', desc: 'New food and beverage concepts in development.', status: 'Coming Soon' },
];

export default function FoodBeverage() {
  return (
    <PageShell>
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase">Food & Beverage</span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mt-3 max-w-3xl">Feed the Culture.</h1>
          <p className="text-gray-400 mt-4 max-w-lg">Coffee, pizza, and concepts from the Hijinx kitchen.</p>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#E5FF00] via-white to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {concepts.map((c, i) => (
            <motion.div key={c.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="border border-gray-200 p-8 hover:border-[#0A0A0A] transition-colors">
              <c.icon className="w-5 h-5 text-gray-400 mb-6" />
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold">{c.name}</h3>
                <span className={`px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase ${
                  c.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>{c.status}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{c.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-gray-50 p-8 md:p-12">
          <h2 className="text-xl font-black tracking-tight mb-2">Stay Updated</h2>
          <p className="text-sm text-gray-500 mb-6">Get notified about new drops, pop-ups, and menu launches.</p>
          <NewsletterSignup source="food_bev" />
        </div>
      </div>
    </PageShell>
  );
}