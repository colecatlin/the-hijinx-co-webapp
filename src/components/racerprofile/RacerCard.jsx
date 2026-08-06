/**
 * RacerCard.jsx
 *
 * Phase 7 — Public racer card for the RacerProfile directory.
 * Renders a RacerProfile as a card with image, name, discipline, and
 * link to /racers/:slug. Uses the compatibility adapter to reuse the
 * existing DriverCard flip-card pattern.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CountryFlag from '@/components/shared/CountryFlag';
import { getRacerProfileUrl } from './racerProfileAdapter';
import { MapPin } from 'lucide-react';

export default function RacerCard({ racerProfile, legacyDriver = null, program = null, programs = [], allSeries = [], team = null, media = null, overallStats = null, programClassName = null, isRookie = false, nonClickable = false }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleProfileClick = (e) => {
    e.stopPropagation();
    navigate(getRacerProfileUrl(racerProfile));
  };

  const displayName = racerProfile.display_name || '';
  const nameParts = displayName.split(' ').filter(Boolean);
  const firstName = legacyDriver?.first_name || nameParts[0] || '';
  const lastName = legacyDriver?.last_name || nameParts.slice(1).join(' ') || '';
  const bibNumber = legacyDriver?.primary_number || program?.bib_number || program?.vehicle_number || null;

  const countryAbbr = racerProfile.hometown_country
    ? racerProfile.hometown_country.substring(0, 3).toUpperCase()
    : '';
  const hometown = [racerProfile.hometown_city, racerProfile.hometown_state, countryAbbr].filter(Boolean).join(', ');

  const profileImg = racerProfile.profile_image_url || media?.headshot_url || legacyDriver?.profile_image_url || null;
  const heroImg = racerProfile.hero_image_url || media?.hero_image_url || legacyDriver?.hero_image_url || null;
  const displayImg = profileImg || heroImg;

  return (
    <div
      className="relative h-[480px] cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={nonClickable
        ? () => {}
        : (e) => {
            if (!e.target.closest('button')) handleFlip();
          }
      }
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d', pointerEvents: 'auto' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {/* FRONT */}
        <div className="absolute inset-0 bg-white border border-gray-300" style={{ backfaceVisibility: 'hidden' }}>
          <div className="relative h-full flex flex-col">
            <div className="flex-1 relative overflow-hidden bg-gray-100">
              {displayImg ? (
                <img src={displayImg} alt={displayName} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200">
                  <div className="text-6xl font-black text-gray-400 mb-4">
                    {firstName[0] || ''}{lastName[0] || ''}
                  </div>
                  {bibNumber && <div className="text-8xl font-black text-gray-300">{bibNumber}</div>}
                </div>
              )}
              {bibNumber && displayImg && (
                <div className="absolute top-4 right-4 bg-white/95 px-4 py-2 border border-gray-300">
                  <div className="text-4xl font-black text-[#232323] leading-none">{bibNumber}</div>
                </div>
              )}
              {racerProfile.is_claimed && (
                <div className="absolute top-4 left-4 bg-teal-500 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                  Claimed
                </div>
              )}
            </div>
            <div className="bg-white border-t border-gray-300 px-4 py-3 relative flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CountryFlag country={racerProfile.hometown_country} />
                <div className="text-xl font-black text-[#232323] tracking-tight uppercase truncate">{displayName}</div>
              </div>
              <div className="text-gray-500 flex-shrink-0 ml-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            {overallStats?.available && (
              <div className="bg-gray-50 border-t border-gray-300 px-4 py-2">
                <div className="flex justify-around text-center">
                  <div><div className="text-lg font-black text-[#232323]">{overallStats.wins}</div><div className="text-xs text-gray-600">W</div></div>
                  <div><div className="text-lg font-black text-[#232323]">{overallStats.podiums}</div><div className="text-xs text-gray-600">P</div></div>
                  <div><div className="text-lg font-black text-[#232323]">{overallStats.top5}</div><div className="text-xs text-gray-600">T5</div></div>
                  <div><div className="text-lg font-black text-[#232323]">{overallStats.top10}</div><div className="text-xs text-gray-600">T10</div></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BACK */}
        <div className="absolute inset-0 bg-[#FAFAFA] border border-gray-300 p-4 flex flex-col" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          {bibNumber && (
            <div className="absolute top-4 right-4 bg-white px-3 py-1 border border-gray-300">
              <div className="text-2xl font-black text-[#232323] leading-none">{bibNumber}</div>
            </div>
          )}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <CountryFlag country={racerProfile.hometown_country} />
              <h3 className="text-base font-black text-[#232323] uppercase tracking-tight truncate">{displayName}</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3 text-xs">
            {racerProfile.career_status && (
              <div>
                <div className="text-gray-500 uppercase tracking-wide text-2xs">Career</div>
                <div className="font-bold text-[#232323] text-xs">{racerProfile.career_status}</div>
              </div>
            )}
            {racerProfile.primary_discipline && (
              <div>
                <div className="text-gray-500 uppercase tracking-wide text-2xs">Discipline</div>
                <div className="font-bold text-[#232323] text-xs">{racerProfile.primary_discipline}</div>
              </div>
            )}
            {hometown && (
              <div className="col-span-2">
                <div className="text-gray-500 uppercase tracking-wide text-2xs">Hometown</div>
                <div className="font-bold text-[#232323] text-xs">{hometown}</div>
              </div>
            )}
            {(team?.name || program?.team_name) && (
              <div className="col-span-2">
                <div className="text-gray-500 uppercase tracking-wide text-2xs">Team</div>
                <div className="font-bold text-[#232323] text-xs truncate">{team?.name || program?.team_name}</div>
              </div>
            )}
            {programClassName && (
              <div>
                <div className="text-gray-500 uppercase tracking-wide text-2xs">Class</div>
                <div className="font-bold text-[#232323] text-xs">{programClassName}</div>
              </div>
            )}
          </div>
          {overallStats?.available && (
            <div className="bg-white border border-gray-300 rounded p-2 mb-2">
              <div className="flex justify-around text-center gap-1">
                <div><div className="text-sm font-black text-[#232323]">{overallStats.wins}</div><div className="text-2xs text-gray-600">W</div></div>
                <div><div className="text-sm font-black text-[#232323]">{overallStats.podiums}</div><div className="text-2xs text-gray-600">P</div></div>
                <div><div className="text-sm font-black text-[#232323]">{overallStats.top5}</div><div className="text-2xs text-gray-600">T5</div></div>
                <div><div className="text-sm font-black text-[#232323]">{overallStats.top10}</div><div className="text-2xs text-gray-600">T10</div></div>
              </div>
            </div>
          )}
          <div className="mt-auto pt-2 border-t border-gray-300">
            <div className="flex items-center justify-end">
              {!nonClickable && (
                <button type="button" onClick={handleProfileClick} className="text-2xs text-[#232323] hover:text-[#00FFDA] font-medium transition-colors cursor-pointer">
                  Profile →
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}