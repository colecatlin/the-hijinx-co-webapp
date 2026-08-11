import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Truck, Search } from 'lucide-react';

export default function VehicleDirectory() {
  const [search, setSearch] = useState('');

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicleDirectory'],
    queryFn: () => base44.entities.Vehicle.list('-created_date', 500),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!vehicles) return [];
    const visible = vehicles.filter(v => v.visibility_status !== 'draft' && !v.is_archived);
    if (!search) return visible;
    const q = search.toLowerCase();
    return visible.filter(v =>
      v.nickname?.toLowerCase().includes(q) ||
      v.manufacturer?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.vehicle_type?.toLowerCase().includes(q) ||
      v.chassis_builder?.toLowerCase().includes(q) ||
      v.number_default?.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  return (
    <div className="px-5 sm:px-8 md:px-12 lg:px-20 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-black text-foreground">Vehicles</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-quiet" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-divider bg-surface text-foreground outline-none focus:border-motion transition-colors w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-32 bg-surface-elevated rounded-lg animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-divider rounded-lg">
          <Truck className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
          <p className="text-sm text-foreground-quiet">No vehicles found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => {
            const name = v.nickname || [v.manufacturer, v.model].filter(Boolean).join(' ') || 'Vehicle';
            const url = v.slug ? `/vehicles/${v.slug}` : `/VehicleProfile?id=${v.id}`;
            return (
              <Link key={v.id} to={url} className="border border-divider rounded-lg p-4 hover:border-motion/40 transition-colors group flex items-center gap-3">
                {v.profile_image_url ? (
                  <img src={v.profile_image_url} alt={name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-motion/10 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-6 h-6 text-motion" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground group-hover:text-motion transition-colors truncate">{name}</div>
                  <div className="text-xs text-foreground-quiet truncate">
                    {[v.manufacturer, v.model, v.year].filter(Boolean).join(' · ')}
                  </div>
                  {v.number_default && <span className="text-[9px] font-mono font-bold bg-motion/15 text-motion px-1.5 py-0.5 rounded mt-1 inline-block">#{v.number_default}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}