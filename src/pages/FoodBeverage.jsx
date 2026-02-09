import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import NewsletterSignup from '@/components/shared/NewsletterSignup';
import { Skeleton } from '@/components/ui/skeleton';
import { Coffee, UtensilsCrossed, Sparkles, Beer, Utensils, Glasses } from 'lucide-react';

const getIcon = (iconName) => {
  const iconMap = {
    'Coffee': Coffee,
    'Pizza': UtensilsCrossed,
    'Beer': Beer,
    'Burger': Utensils,
    'Cocktail': Glasses,
  };
  return iconMap[iconName] || Sparkles;
};

export default function FoodBeverage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['foodBeverages'],
    queryFn: () => base44.entities.FoodBeverage.list(),
  });

  const formatStatus = (status) => {
    if (status === 'coming_soon') return 'Coming Soon';
    if (status === 'in_concept') return 'In Concept';
    return 'Active';
  };

  const statusColors = {
    'coming_soon': 'bg-blue-50 text-blue-600',
    'active': 'bg-green-50 text-green-600',
    'in_concept': 'bg-gray-100 text-gray-400',
  };

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
          {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
          ) : (
            items.map((item, i) => {
              const IconComponent = getIcon(item.icon);
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="border border-gray-200 p-8 hover:border-[#0A0A0A] transition-colors">
                  <IconComponent className="w-5 h-5 text-gray-400 mb-6" />
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold">{item.title}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase ${statusColors[item.status]}`}>{formatStatus(item.status)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                </motion.div>
              );
            })
          )}
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