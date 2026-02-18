import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { ArrowRight } from 'lucide-react';
import { ICON_MAP } from '@/components/shared/IconSelector';
import { Skeleton } from '@/components/ui/skeleton';

export default function TechHome() {
  const { data: techItems = [], isLoading } = useQuery({
    queryKey: ['techItems'],
    queryFn: () => base44.entities.Tech.list('-order'),
  });
  return (
    <PageShell>
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase">Hijinx Tech</span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mt-3 max-w-3xl">Products & Tools</h1>
          <p className="text-gray-400 mt-4 max-w-lg">Software built by Hijinx for creators, teams, and makers.</p>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#E5FF00] via-white to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="space-y-6">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border border-gray-200 p-8 md:p-12">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-6 h-6 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            ))
          ) : techItems.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              No tech items found.
            </div>
          ) : (
            techItems.map((item, i) => {
              const IconComponent = ICON_MAP[item.icon];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="border border-gray-200 p-8 md:p-12 hover:border-[#0A0A0A] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {IconComponent && <IconComponent className="w-6 h-6 text-gray-400 mt-1 shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-black tracking-tight">{item.title}</h2>
                        <span className="px-3 py-1 text-[10px] font-mono tracking-wider bg-gray-100 text-gray-500 uppercase">{item.status.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </PageShell>
  );
}