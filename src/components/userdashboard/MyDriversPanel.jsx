import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Users, ExternalLink, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function profileStatusColor(status) {
  return status === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400';
}
function activeStatusColor(status) {
  return status === 'Active' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400';
}

export default function MyDriversPanel({ collaborators }) {
  const entityIds = collaborators.map(c => c.entity_id);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['myDrivers', entityIds.join(',')],
    queryFn: async () => {
      if (!entityIds.length) return [];
      const all = await base44.entities.Driver.list('-updated_date', 500);
      return all.filter(d => entityIds.includes(d.id));
    },
    enabled: entityIds.length > 0,
    staleTime: 30000,
  });

  return (
    <div className="bg-[#171717] border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-400" />
        <h2 className="text-sm font-semibold text-white">My Drivers</h2>
        <span className="ml-auto text-xs text-gray-500">{collaborators.length}</span>
      </div>

      {collaborators.length === 0 ? (
        <div className="px-5 py-10 text-center text-gray-500 text-sm">No drivers connected to your account.</div>
      ) : isLoading ? (
        <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-800/50 rounded animate-pulse" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Driver</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">#</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Discipline</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Status</th>
                <th className="px-4 py-2 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(driver => (
                <tr key={driver.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-2.5 text-white font-medium">
                    {driver.first_name} {driver.last_name}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 font-mono">{driver.primary_number || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-400">{driver.primary_discipline || '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge className={`text-xs ${profileStatusColor(driver.profile_status)}`}>
                      {driver.profile_status || 'draft'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={createPageUrl(`DriverProfile?id=${driver.id}`)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="View Profile"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        to={createPageUrl(`DriverEditor?id=${driver.id}`)}
                        className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Open in Editor"
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