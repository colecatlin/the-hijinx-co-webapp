import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import CountryFlag from '@/components/shared/CountryFlag';

export default function DriverCard({ driver, program, team, media }) {
  const getFormColor = (form) => {
    const colors = {
      'Hot': 'bg-[#D33F49] text-white',
      'Steady': 'bg-[#00FFDA] text-[#232323]',
      'Slump': 'bg-gray-300 text-gray-700'
    };
    return colors[form] || 'bg-gray-200 text-gray-600';
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(driver.date_of_birth);

  return (
    <Link 
      to={createPageUrl('DriverProfile', { id: driver.slug })}
      className="block bg-white border border-gray-200 hover:border-[#00FFDA] transition-all h-full flex flex-col"
    >
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        {media?.headshot_url ? (
          <img 
            src={media.headshot_url} 
            alt={driver.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <div className="text-4xl font-black text-gray-400">
              {driver.first_name?.[0] || ''}{driver.last_name?.[0] || ''}
            </div>
          </div>
        )}
        {driver.status !== 'Active' && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-gray-500 text-white">{driver.status}</Badge>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl font-bold text-[#232323]">{driver.display_name}</h3>
          {program?.vehicle_number && (
            <span className="text-xl font-bold text-[#232323]">#{program.vehicle_number}</span>
          )}
        </div>
        
        {(driver.hometown_city || driver.hometown_state) && (
          <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
            <CountryFlag country={driver.country} />
            <MapPin className="w-3 h-3" />
            {driver.hometown_city}{driver.hometown_city && driver.hometown_state ? ', ' : ''}{driver.hometown_state}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
          {age && <span>{age} yrs</span>}
          {age && (program?.class_name || driver.primary_discipline || program?.series_name) && <span>•</span>}
          {program?.class_name && <span>{program.class_name}</span>}
          {program?.class_name && (driver.primary_discipline || program?.series_name) && <span>•</span>}
          {!program?.class_name && driver.primary_discipline && <span>{driver.primary_discipline}</span>}
          {!program?.class_name && driver.primary_discipline && program?.series_name && <span>•</span>}
          {program?.series_name && <span>{program.series_name}</span>}
        </div>

        {team && (
          <div className="mb-4">
            <Badge variant="outline" className="text-xs">{team.name}</Badge>
          </div>
        )}

        <Button variant="outline" className="w-full mt-auto">
          View Driver
        </Button>
      </div>
    </Link>
  );
}