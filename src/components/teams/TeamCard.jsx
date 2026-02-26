import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { MapPin, Users, Briefcase } from 'lucide-react';
import CountryFlag from '@/components/shared/CountryFlag';
import { buildProfileUrl } from '@/components/utils/routingContract';
import { createPageUrl } from '@/components/utils';

export default function TeamCard({ team, programs = [], programsCount, driversCount, performance, media }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    navigate(createPageUrl('TeamProfile', { id: team.slug || team.id }));
  };
  const getDisciplineIcon = (discipline) => {
    const icons = {
      'Off Road': '🏜️',
      'Snowmobile': '❄️',
      'Asphalt Oval': '🏁',
      'Road Racing': '🏎️',
      'Rallycross': '🚗',
      'Drag Racing': '🏎️',
      'Mixed': '🔄'
    };
    return icons[discipline] || '🏁';
  };

  const getLevelColor = (level) => {
    const colors = {
      'International': 'bg-[#D33F49] text-white',
      'National': 'bg-[#1A3249] text-white',
      'Regional': 'bg-[#00FFDA] text-[#232323]',
      'Local': 'bg-gray-200 text-gray-700'
    };
    return colors[level] || 'bg-gray-200 text-gray-700';
  };

  const getFormColor = (form) => {
    const colors = {
      'Hot': 'bg-[#D33F49] text-white',
      'Steady': 'bg-[#00FFDA] text-[#232323]',
      'Slump': 'bg-gray-300 text-gray-700'
    };
    return colors[form] || '';
  };

  return (
    <div 
      className="relative h-[480px] cursor-pointer"
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
          className="absolute inset-0 bg-white border border-gray-200 p-6 flex flex-col"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Logo Section */}
          <div className="mb-4">
            {team?.logo_url || media?.logo_url ? (
              <img src={team.logo_url || media.logo_url} alt={team.name} className="h-16 w-auto object-contain" loading="lazy" />
            ) : (
              <div className="h-16 flex items-center">
                <div className="text-3xl font-black text-gray-300">
                  {team.name.split(' ').map(w => w[0]).join('')}
                </div>
              </div>
            )}
          </div>

          {/* Team Name - Always Visible */}
          <h3 className="text-2xl font-black text-[#232323] mb-4 line-clamp-2">
            {team.name}
          </h3>

          {/* Location */}
          {team.headquarters_city && team.headquarters_state && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <CountryFlag country={team.country} />
              <MapPin className="w-4 h-4" />
              <span>{team.headquarters_city}, {team.headquarters_state}</span>
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-gray-700 mb-6 line-clamp-3 flex-1">
            {team.description_summary}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              <span>{programsCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{driversCount}</span>
            </div>
          </div>

          {/* Series Badges */}
          {programs.length > 0 && (() => {
            const uniqueSeries = [...new Set(programs.map(p => p.series_name).filter(Boolean))];
            return uniqueSeries.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {uniqueSeries.slice(0, 2).map((series, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs border-[#232323] text-[#232323]">
                    {series}
                  </Badge>
                ))}
                {uniqueSeries.length > 2 && (
                  <span className="text-xs text-gray-500">+{uniqueSeries.length - 2} more</span>
                )}
              </div>
            ) : null;
          })()}

          {/* Footer */}
          <div className="text-right text-xs text-gray-500 font-medium mt-auto">
            Tap to flip →
          </div>
        </div>

        {/* BACK OF CARD */}
        <div
          className="absolute inset-0 bg-[#FAFAFA] border border-gray-200 p-6 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Team Name - Same position as front */}
          <div className="mb-6">
            <h3 className="text-xl font-black text-[#232323] uppercase tracking-tight">
              {team.name}
            </h3>
          </div>

          {/* Details */}
          <div className="space-y-3 flex-1">
            {team.primary_discipline && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Discipline</div>
                <div className="text-sm font-bold text-[#232323]">{team.primary_discipline}</div>
              </div>
            )}
            {team.team_level && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Level</div>
                <div className="text-sm font-bold text-[#232323]">{team.team_level}</div>
              </div>
            )}
            {team.founded_year && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Founded</div>
                <div className="text-sm font-bold text-[#232323]">{team.founded_year}</div>
              </div>
            )}
            {team.status && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                <div className="text-sm font-bold text-[#232323]">{team.status}</div>
              </div>
            )}
            {programs.length > 0 && (() => {
              const uniqueSeries = [...new Set(programs.map(p => p.series_name).filter(Boolean))];
              return uniqueSeries.length > 0 ? (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Series</div>
                  <div className="text-sm font-bold text-[#232323]">{uniqueSeries.slice(0, 3).join(', ')}</div>
                </div>
              ) : null;
            })()}
            {driversCount > 0 && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Drivers</div>
                <div className="text-sm font-bold text-[#232323]">{driversCount}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-gray-300">
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