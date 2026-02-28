import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import CountryFlag from '@/components/shared/CountryFlag';
import { buildProfileUrl } from '@/components/utils/routingContract';

export default function TeamCard({ team, programs = [], drivers = [], media, series = [] }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    navigate(buildProfileUrl('Team', team.slug || team.id));
  };

  // Build series groups: each series with its drivers + car numbers
  const seriesGroups = (() => {
    const activePrograms = programs.filter(p => p.status === 'active' && p.series_id);
    const grouped = {};
    activePrograms.forEach(prog => {
      if (!grouped[prog.series_id]) {
        const seriesObj = series.find(s => s.id === prog.series_id);
        grouped[prog.series_id] = {
          seriesName: seriesObj?.name || prog.series_name || 'Unknown Series',
          competitionScore: seriesObj?.derived_competition_score || seriesObj?.override_competition_level || 0,
          drivers: []
        };
      }
      const driver = drivers.find(d => d.id === prog.driver_id);
      if (driver) {
        grouped[prog.series_id].drivers.push({
          id: driver.id,
          lastName: driver.last_name,
          carNumber: prog.car_number || driver.primary_number,
          primaryColor: driver.primary_color || null,
        });
      }
    });
    return Object.values(grouped).sort((a, b) => b.competitionScore - a.competitionScore);
  })();

  return (
    <div 
      className="relative aspect-square cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={(e) => {
        if (!e.target.closest('button') && !e.target.closest('a')) {
          handleFlip();
        }
      }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d', pointerEvents: 'auto' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {/* FRONT OF CARD */}
        <div
          className="absolute inset-0 bg-white border border-gray-300"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="relative h-full flex flex-col">
            {/* Image Section */}
            <div className="flex-1 relative overflow-hidden bg-gray-100 flex items-center justify-center">
              {media?.logo_url || team?.logo_url ? (
                <img 
                  src={media?.logo_url || team.logo_url} 
                  alt={team.name}
                  className="max-w-[70%] max-h-[60%] object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <div className="text-6xl font-black text-gray-400">
                    {team.name.split(' ').map(w => w[0]).join('')}
                  </div>
                </div>
              )}
            </div>

            {/* Name Bar */}
            <div className="bg-white border-t border-gray-300 px-4 py-3 flex items-center gap-2">
              <div className="text-xl font-black text-[#232323] tracking-tight uppercase min-w-0 flex-1" style={{ fontSize: Math.max(12, 20 - (team.name.length - 15) * 0.3) + 'px' }}>
                {team.name}
              </div>
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                {team.manufacturer_logo_url && (
                  <img 
                    src={team.manufacturer_logo_url} 
                    alt={team.manufacturer}
                    className="h-6 w-auto object-contain"
                    loading="lazy"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BACK OF CARD */}
        <div
          className="absolute inset-0 bg-[#FAFAFA] border border-gray-300 p-6 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Location */}
          {team.headquarters_city && team.headquarters_state && (
            <div className="mb-2 pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <CountryFlag country={team.country} />
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-[#232323] font-semibold">
                  {team.headquarters_city}, {team.headquarters_state}
                </span>
              </div>
            </div>
          )}

          {/* Series Badges */}
          {uniqueSeries.length > 0 && (
            <div className="mb-2 pb-2 border-b border-gray-200">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Series</div>
              <div className="flex flex-wrap gap-2">
                {uniqueSeries.slice(0, 3).map((series, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs border-[#232323] text-[#232323]">
                    {series}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Drivers */}
          {sortedDrivers.length > 0 && (
            <div className="mb-2 pb-2 border-b border-gray-200 flex-1 flex flex-col min-h-0">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Drivers ({sortedDrivers.length})</div>
              <div className="space-y-0.5">
                {sortedDrivers.map((driver, idx) => (
                  <div key={idx} className="text-sm text-[#232323] font-semibold">
                    {driver.first_name} {driver.last_name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-2 border-t border-gray-300">
            <div className="flex items-center justify-end mb-3">
              <button
                type="button"
                onClick={handleProfileClick}
                className="text-xs text-[#232323] hover:text-[#00FFDA] font-medium transition-colors cursor-pointer"
              >
                View full profile →
              </button>
            </div>
            <div className="text-right text-xs text-gray-500 font-medium">
              Back →
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}