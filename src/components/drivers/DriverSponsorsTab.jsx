import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ExternalLink, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const SPONSOR_ORDER = ['Primary', 'Associate', 'Personal', 'Apparel', 'Technical'];

const SPONSOR_COLORS = {
  Primary: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  Associate: 'bg-blue-50 text-blue-700 border-blue-200',
  Personal: 'bg-purple-50 text-purple-700 border-purple-200',
  Apparel: 'bg-pink-50 text-pink-700 border-pink-200',
  Technical: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function DriverSponsorsTab({ driverId }) {
  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['driverSponsors', driverId],
    queryFn: () => base44.entities.DriverSponsor.filter({ driver_id: driverId }),
    enabled: !!driverId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="py-12 text-center text-gray-400 text-sm">Loading sponsors…</div>;

  if (sponsors.length === 0) {
    return (
      <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl">
        <Star className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-500">No sponsors listed</p>
        <p className="text-sm text-gray-400 mt-1">Sponsor relationships will appear here when added.</p>
      </div>
    );
  }

  // Group by sponsor_type
  const grouped = SPONSOR_ORDER.reduce((acc, type) => {
    const group = sponsors.filter(s => s.sponsor_type === type);
    if (group.length > 0) acc[type] = group;
    return acc;
  }, {});

  // Any uncategorized
  const uncategorized = sponsors.filter(s => !s.sponsor_type);
  if (uncategorized.length > 0) grouped['Other'] = uncategorized;

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([type, group]) => (
        <div key={type}>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{type} Sponsors</h3>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300">{group.length}</span>
          </div>
          <div className={`grid gap-4 ${type === 'Primary' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
            {group.map(sponsor => (
              <div
                key={sponsor.id}
                className={`border rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-sm ${
                  type === 'Primary' ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/50'
                }`}
              >
                {sponsor.logo_url ? (
                  <div className="flex items-center justify-center h-16 bg-white rounded-lg border border-gray-100 p-2">
                    <img src={sponsor.logo_url} alt={sponsor.sponsor_name} className="max-h-12 max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-16 bg-gray-100 rounded-lg text-gray-400 font-bold text-lg tracking-wide">
                    {sponsor.sponsor_name.charAt(0)}
                  </div>
                )}

                <div className="flex-1">
                  <div className="font-bold text-[#232323] text-sm">{sponsor.sponsor_name}</div>
                  {(sponsor.start_date || sponsor.end_date) && (
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {sponsor.start_date ? format(new Date(sponsor.start_date), 'yyyy') : '?'}
                      {' – '}
                      {sponsor.end_date ? format(new Date(sponsor.end_date), 'yyyy') : 'Present'}
                    </div>
                  )}
                  {sponsor.sponsor_type && (
                    <Badge className={`mt-1.5 text-[10px] px-1.5 py-0 h-auto border ${SPONSOR_COLORS[sponsor.sponsor_type] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {sponsor.sponsor_type}
                    </Badge>
                  )}
                </div>

                {sponsor.website_url && (
                  <a
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#232323] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Visit website
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}