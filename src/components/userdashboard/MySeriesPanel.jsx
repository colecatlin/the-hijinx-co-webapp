import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Radio, ExternalLink } from 'lucide-react';

export default function MySeriesPanel({ collaborators }) {
  const entityIds = collaborators.map(c => c.entity_id);

  const { data: seriesList = [], isLoading } = useQuery({
    queryKey: ['mySeries', entityIds.join(',')],
    queryFn: async () => {
      if (!entityIds.length) return [];
      const all = await base44.entities.Series.list('-updated_date', 500);
      return all.filter(s => entityIds.includes(s.id));
    },
    enabled: entityIds.length > 0,
    staleTime: 30000,
  });

  const collabMap = Object.fromEntries(collaborators.map(c => [c.entity_id, c]));

  return (
    <div className="bg-[#171717] border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
        <Radio className="w-4 h-4 text-yellow-400" />
        <h2 className="text-sm font-semibold text-white">My Series</h2>
        <span className="ml-auto text-xs text-gray-500">{collaborators.length}</span>
      </div>

      {collaborators.length === 0 ? (
        <div className="px-5 py-10 text-center text-gray-500 text-sm">No series connected to your account.</div>
      ) : isLoading ? (
        <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-800/50 rounded animate-pulse" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Series</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Discipline</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Season</th>
                <th className="px-4 py-2 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {seriesList.map(series => (
                <tr key={series.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-2.5 text-white font-medium">{series.name}</td>
                  <td className="px-4 py-2.5 text-gray-400">{series.discipline || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-400">{series.season_year || '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={createPageUrl(`SeriesDetail?id=${series.id}`)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="View Series"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}