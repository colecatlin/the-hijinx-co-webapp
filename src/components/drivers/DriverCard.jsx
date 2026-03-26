import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CountryFlag from '@/components/shared/CountryFlag';
import { getDriverProfileUrl } from '@/lib/driverUrl';
import { MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getSecondaryDisciplines } from '@/components/utils/disciplineUtils';

// Series priority order (lower rank = higher tier)
const SERIES_PRIORITY = {
  'NASCAR Cup Series': 1,
  "NASCAR O'Reilly Auto Parts Series": 2,
  'NASCAR Xfinity Series': 2,
  'NASCAR Craftsman Truck Series': 3,
};

function sortedSeriesNames(programs, allSeries = []) {
  const names = [...new Set(programs.map(p => {
    if (p.series_id) return allSeries.find(s => s.id === p.series_id)?.name;
    return p.series_name;
  }).filter(Boolean))];
  return names.sort((a, b) => {
    const rankA = allSeries.find(s => s.name === a)?.popularity_rank ?? SERIES_PRIORITY[a] ?? 99;
    const rankB = allSeries.find(s => s.name === b)?.popularity_rank ?? SERIES_PRIORITY[b] ?? 99;
    return rankA - rankB;
  });
}

export default function DriverCard({ driver, program, programs = [], allSeries = [], team, media, performance, overallStats, programClassName, isRookie }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    navigate(getDriverProfileUrl(driver));
  };

  const bibNumber = program?.bib_number || program?.vehicle_number || driver.primary_number;
  
  // Country code mapping
  const countryCodeMap = {
    'United States': 'USA',
    'Canada': 'CAN',
    'Mexico': 'MEX',
    'United Kingdom': 'GBR',
    'Germany': 'DEU',
    'France': 'FRA',
    'Italy': 'ITA',
    'Spain': 'ESP',
    'Australia': 'AUS',
    'Japan': 'JPN',
    'China': 'CHN',
    'India': 'IND',
    'Brazil': 'BRA',
    'Argentina': 'ARG',
  };
  
  const countryAbbr = driver.hometown_country ? countryCodeMap[driver.hometown_country] || driver.hometown_country.substring(0, 3).toUpperCase() : '';
  const hometown = [driver.hometown_city, driver.hometown_state, countryAbbr].filter(Boolean).join(', ');

  return (
    <div 
      className="relative h-[480px] cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={(e) => {
        if (!e.target.closest('button')) {
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
            <div className="flex-1 relative overflow-hidden bg-gray-100">
              {media?.headshot_url || media?.hero_image_url || driver.profile_image_url || driver.hero_image_url ? (
                <img 
                src={media?.headshot_url || media?.hero_image_url || driver.profile_image_url || driver.hero_image_url} 
                alt={`${driver.first_name} ${driver.last_name}`}
                className="w-full h-full object-cover"
                loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200">
                  <div className="text-6xl font-black text-gray-400 mb-4">
                    {driver.first_name?.[0] || ''}{driver.last_name?.[0] || ''}
                  </div>
                  {bibNumber && (
                    <div className="text-8xl font-black text-gray-300">
                      {bibNumber}
                    </div>
                  )}
                </div>
              )}
              
              {/* Bib Number Overlay */}
              {bibNumber && (media?.headshot_url || media?.hero_image_url || driver.profile_image_url || driver.hero_image_url) && (
                <div className="absolute top-4 right-4 bg-white/95 px-4 py-2 border border-gray-300">
                  <div className="text-4xl font-black text-[#232323] leading-none">
                    {bibNumber}
                  </div>
                </div>
              )}
            </div>

            {/* Name Bar */}
            <div className="bg-white border-t border-gray-300 px-4 py-3 relative flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CountryFlag country={driver.hometown_country} />
                <div className="text-xl font-black text-[#232323] tracking-tight uppercase truncate">
                  {driver.first_name} {driver.last_name}
                </div>
              </div>
              <div className="text-gray-500 flex-shrink-0 ml-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Stats Footer */}
            {overallStats?.available && (
              <div className="bg-gray-50 border-t border-gray-300 px-4 py-2">
                <div className="flex justify-around text-center">
                  <div>
                    <div className="text-lg font-black text-[#232323]">{overallStats.wins}</div>
                    <div className="text-xs text-gray-600">W</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-[#232323]">{overallStats.podiums}</div>
                    <div className="text-xs text-gray-600">P</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-[#232323]">{overallStats.top5}</div>
                    <div className="text-xs text-gray-600">T5</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-[#232323]">{overallStats.top10}</div>
                    <div className="text-xs text-gray-600">T10</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BACK OF CARD */}
        <div
          className="absolute inset-0 bg-[#FAFAFA] border border-gray-300 p-4 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Bib Number - Same position as front */}
          {bibNumber && (
            <div className="absolute top-4 right-4 bg-white px-3 py-1 border border-gray-300">
              <div className="text-2xl font-black text-[#232323] leading-none">
                {bibNumber}
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <CountryFlag country={driver.hometown_country} />
              <h3 className="text-base font-black text-[#232323] uppercase tracking-tight truncate">
                {driver.first_name} {driver.last_name}
              </h3>
            </div>
          </div>

          {/* Core Details - Super Condensed */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3 text-xs">
            {driver.date_of_birth && (
              <div>
                <div className="text-gray-500 uppercase tracking-wide text-2xs">Age</div>
                <div className="font-bold text-[#232323]">
                  {(() => {
                    const today = new Date();
                    const dob = new Date(driver.date_of_birth);
                    let age = today.getFullYear() - dob.getFullYear();
                    const m = today.getMonth() - dob.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                    return age;
                  })()}
                </div>
              </div>
            )}
            {driver.primary_discipline && (
              <div>
                <div className="text-gray-500 uppercase tracking-wide text-2xs">Discipline</div>
                <div className="font-bold text-[#232323] text-xs">{driver.primary_discipline}</div>
              </div>
            )}
            {programs.length > 0 && (() => {
              const activePrograms = programs.filter(p => p.status?.toLowerCase() === 'active');
              const displayPrograms = activePrograms.length > 0 ? activePrograms : programs;
              const seriesNames = sortedSeriesNames(displayPrograms, allSeries);
              return seriesNames.length > 0 ? (
                <div className="col-span-2">
                  <div className="text-gray-500 uppercase tracking-wide text-2xs">Series</div>
                  <div className="font-bold text-[#232323] text-xs">{seriesNames.slice(0, 1).join(', ')}</div>
                </div>
              ) : null;
            })()}
            {(programClassName || isRookie) && (
              <div>
                <div className="text-gray-500 uppercase tracking-wide text-2xs">Class</div>
                <div className="font-bold text-[#232323] flex items-center gap-1 text-xs">
                  {programClassName || ''}
                  {isRookie && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center w-3 h-3 rounded bg-yellow-400 text-black font-black text-2xs leading-none cursor-default">R</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Rookie</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            )}
            {(team?.name || program?.team_name) && (
              <div className="col-span-2">
                <div className="text-gray-500 uppercase tracking-wide text-2xs">Team</div>
                <div className="font-bold text-[#232323] text-xs truncate">{team?.name || program?.team_name}</div>
              </div>
            )}
          </div>

          {/* Stats Section - Compact */}
          {overallStats?.available && (
            <div className="bg-white border border-gray-300 rounded p-2 mb-2">
              <div className="flex justify-around text-center gap-1">
                <div>
                  <div className="text-sm font-black text-[#232323]">{overallStats.wins}</div>
                  <div className="text-2xs text-gray-600">W</div>
                </div>
                <div>
                  <div className="text-sm font-black text-[#232323]">{overallStats.podiums}</div>
                  <div className="text-2xs text-gray-600">P</div>
                </div>
                <div>
                  <div className="text-sm font-black text-[#232323]">{overallStats.top5}</div>
                  <div className="text-2xs text-gray-600">T5</div>
                </div>
                <div>
                  <div className="text-sm font-black text-[#232323]">{overallStats.top10}</div>
                  <div className="text-2xs text-gray-600">T10</div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-2 border-t border-gray-300">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleProfileClick}
                className="text-2xs text-[#232323] hover:text-[#00FFDA] font-medium transition-colors cursor-pointer"
              >
                Profile →
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}