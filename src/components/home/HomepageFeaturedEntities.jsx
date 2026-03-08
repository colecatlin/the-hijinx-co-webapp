import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import DriverCard from '@/components/drivers/DriverCard';

export default function HomepageFeaturedEntities() {
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['featuredDriversHome'],
    queryFn: () => base44.entities.Driver.filter({ featured: true, profile_status: 'live' }),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.slice(0, 4),
  });

  const { data: allPrograms = [] } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: allMedia = [] } = useQuery({
    queryKey: ['driverMedia'],
    queryFn: () => base44.entities.DriverMedia.list(),
    staleTime: 5 * 60 * 1000,
  });

  const programsByDriver = useMemo(() => {
    const map = {};
    allPrograms.forEach(p => {
      if (!map[p.driver_id]) map[p.driver_id] = [];
      map[p.driver_id].push(p);
    });
    return map;
  }, [allPrograms]);

  const mediaByDriver = useMemo(() => {
    const map = {};
    allMedia.forEach(m => { map[m.driver_id] = m; });
    return map;
  }, [allMedia]);

  if (!isLoading && drivers.length === 0) return null;

  return (
    <section className="bg-white py-20 md:py-28 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-[#232323]" />
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#232323]/40 uppercase">Featured</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#232323] tracking-tight">
              Featured Drivers
            </h2>
          </div>
          <Link
            to={createPageUrl('DriverDirectory')}
            className="hidden md:flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-[#232323]/35 hover:text-[#00FFDA] transition-colors uppercase"
          >
            All Drivers <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[380px]" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {drivers.map((driver, i) => (
                <motion.div
                  key={driver.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <DriverCard
                    driver={driver}
                    programs={programsByDriver[driver.id] || []}
                    media={mediaByDriver[driver.id]}
                    allSeries={allSeries}
                  />
                </motion.div>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Link
                to={createPageUrl('DriverDirectory')}
                className="flex items-center gap-2 border border-[#232323]/10 hover:border-[#00FFDA] px-7 py-3 text-xs font-bold tracking-wider uppercase text-[#232323]/50 hover:text-[#00FFDA] transition-all"
              >
                <Users className="w-3.5 h-3.5" />
                View All Drivers
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}