import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import DriverCard from '@/components/drivers/DriverCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function FeaturedDrivers() {
  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['featuredDrivers'],
    queryFn: async () => {
      const allDrivers = await base44.entities.Driver.filter({
        featured: true,
        profile_status: 'live'
      });
      return allDrivers.slice(0, 6);
    },
  });

  const { data: allPrograms = [] } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list(),
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: allMedia = [] } = useQuery({
    queryKey: ['driverMedia'],
    queryFn: () => base44.entities.DriverMedia.list(),
  });

  const isLoading = driversLoading;

  const programsByDriver = React.useMemo(() => {
    const map = {};
    allPrograms.forEach(p => {
      if (!map[p.driver_id]) map[p.driver_id] = [];
      map[p.driver_id].push(p);
    });
    return map;
  }, [allPrograms]);

  const mediaByDriver = React.useMemo(() => {
    const map = {};
    allMedia.forEach(m => {
      map[m.driver_id] = m;
    });
    return map;
  }, [allMedia]);

  if (isLoading) {
    return (
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-black text-[#232323] mb-12">Featured Drivers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[480px]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (drivers.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-12">
          <h2 className="text-3xl font-black text-[#232323]">Featured Drivers</h2>
          <Link
            to={createPageUrl('DriverDirectory')}
            className="text-sm font-medium text-[#232323] hover:text-[#00FFDA] transition-colors"
          >
            View all drivers →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map(driver => (
            <DriverCard 
              key={driver.id} 
              driver={driver}
              programs={programsByDriver[driver.id] || []}
              media={mediaByDriver[driver.id]}
              allSeries={allSeries}
            />
          ))}
        </div>
      </div>
    </section>
  );
}