import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Briefcase } from 'lucide-react';

export default function TeamCard({ team, programsCount, driversCount, performance, media }) {
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
    <Link to={createPageUrl('TeamProfile', { id: team.slug })}>
      <div className="bg-white border border-gray-200 p-6 hover:border-[#00FFDA] transition-all group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getDisciplineIcon(team.primary_discipline)}</span>
              {media?.logo_url && (
                <img src={media.logo_url} alt={team.name} className="h-8 w-auto object-contain" />
              )}
            </div>
            <h3 className="text-xl font-bold text-[#232323] mb-1 group-hover:text-[#00FFDA] transition-colors">
              {team.name}
            </h3>
            {team.headquarters_city && team.headquarters_state && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                <MapPin className="w-3 h-3" />
                {team.headquarters_city}, {team.headquarters_state}
              </div>
            )}
          </div>
          <Badge className={getLevelColor(team.team_level)}>
            {team.team_level}
          </Badge>
        </div>

        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
          {team.description_summary}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
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