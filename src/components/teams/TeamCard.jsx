import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Briefcase } from 'lucide-react';
import CountryFlag from '@/components/shared/CountryFlag';
import { buildProfileUrl } from '@/components/utils/routingContract';

export default function TeamCard({ team, programs = [], programsCount, driversCount, performance, media }) {
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
    <Link to={buildProfileUrl('Team', team.slug)} className="h-full block">
      <div className="bg-white border border-gray-200 p-6 hover:border-[#00FFDA] transition-all group h-full flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="mb-3">
              {media?.logo_url ? (
                <img src={media.logo_url} alt={team.name} className="h-12 w-auto object-contain" />
              ) : (
                <div className="h-12 flex items-center">
                  <div className="text-2xl font-black text-gray-400">
                    {team.name.split(' ').map(w => w[0]).join('')}
                  </div>
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-[#232323] mb-1 group-hover:text-[#00FFDA] transition-colors">
              {team.name}
            </h3>
            {team.headquarters_city && team.headquarters_state && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                <CountryFlag country={team.country} />
                <MapPin className="w-3 h-3" />
                {team.headquarters_city}, {team.headquarters_state}
              </div>
            )}
          </div>
          {programs.length > 0 && (
            <div className="flex flex-col gap-1 items-end">
              {programs.slice(0, 2).map((program, idx) => (
                <Badge key={idx} variant="outline" className="text-xs border-[#232323] text-[#232323]">
                  {program.series_name}
                </Badge>
              ))}
              {programs.length > 2 && (
                <span className="text-xs text-gray-500">+{programs.length - 2} more</span>
              )}
            </div>
          )}
        </div>

        <p className="text-sm text-gray-700 mb-4 line-clamp-2 flex-1">
          {team.description_summary}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 mt-auto">
          <div className="flex items-center gap-1">
            <Briefcase className="w-4 h-4" />
            <span>{programsCount} {programsCount === 1 ? 'Program' : 'Programs'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{driversCount} {driversCount === 1 ? 'Driver' : 'Drivers'}</span>
          </div>
        </div>

        {performance && (
          <div className="flex flex-wrap gap-2 mb-4">
            {performance.recent_form && performance.recent_form !== 'Unknown' && (
              <Badge className={getFormColor(performance.recent_form)}>
                {performance.recent_form}
              </Badge>
            )}
            {performance.reliability && performance.reliability !== 'Unknown' && (
              <Badge variant="outline" className="border-[#232323] text-[#232323]">
                {performance.reliability}
              </Badge>
            )}
          </div>
        )}

        <Button className="w-full bg-[#232323] text-white hover:bg-[#00FFDA] hover:text-[#232323]">
          View Team
        </Button>
      </div>
    </Link>
  );
}