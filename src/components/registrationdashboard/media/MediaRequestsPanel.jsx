import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { STATUS_COLORS } from './mediaAccess';
import MediaRequestDrawer from './MediaRequestDrawer';

export default function MediaRequestsPanel({ dashboardContext, selectedEvent, selectedTrack, selectedSeries, currentUser, isAdmin, hasAuthority, issuerOptions, invalidateAfterOperation }) {
  const [selectedReq, setSelectedReq] = useState(null);

  const entityId = dashboardContext?.orgId;
  const eventId = selectedEvent?.id;

  const { data: requests = [] } = useQuery({
    queryKey: ['mediaRequests', { entityId, eventId }],
    queryFn: async () => {
      const all = await base44.entities.CredentialRequest.list();
      return all.filter(r =>
        (eventId && r.related_event_id === eventId) ||
        (eventId && r.target_entity_id === eventId)
      ).sort((a, b) => new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at));
    },
    enabled: !!eventId,
  });

  const { data: mediaUsers = [] } = useQuery({
    queryKey: ['media_users'],
    queryFn: () => base44.entities.MediaUser.list(),
  });

  const getUserName = (id) => {
    const mu = mediaUsers.find(u => u.id === id);
    return mu?.full_name || mu?.legal_name || id?.slice(0, 8) || '—';
  };

  return (
    <>
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Credential Requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-gray-500 text-sm">No requests for this event.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Applicant</th>
                    <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Target</th>
                    <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Access</th>
                    <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Roles</th>
                    <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Status</th>
                    <th className="text-left text-gray-500 pb-2 font-medium">Date</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id} className="border-b border-gray-800/50 hover:bg-[#262626] cursor-pointer transition-colors"
                      onClick={() => setSelectedReq(req)}>
                      <td className="py-2 pr-4 text-white font-medium">{getUserName(req.holder_media_user_id)}</td>
                      <td className="py-2 pr-4 text-gray-400">{req.target_entity_type}</td>
                      <td className="py-2 pr-4 text-gray-400">{req.requested_access_level}</td>
                      <td className="py-2 pr-4 text-gray-400">{req.requested_roles?.length || 0}</td>
                      <td className="py-2 pr-4">
                        <Badge className={STATUS_COLORS[req.status] || 'bg-gray-700 text-gray-300'}>{req.status}</Badge>
                      </td>
                      <td className="py-2 text-gray-500">{req.created_at ? new Date(req.created_at).toLocaleDateString() : req.created_date ? new Date(req.created_date).toLocaleDateString() : '—'}</td>
                      <td className="py-2 pl-2"><ChevronRight className="w-3 h-3 text-gray-600" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedReq && (
        <MediaRequestDrawer
          request={selectedReq}
          onClose={() => setSelectedReq(null)}
          selectedEvent={selectedEvent}
          selectedTrack={selectedTrack}
          selectedSeries={selectedSeries}
          currentUser={currentUser}
          isAdmin={isAdmin}
          hasAuthority={hasAuthority}
          issuerOptions={issuerOptions}
          invalidateAfterOperation={invalidateAfterOperation}
        />
      )}
    </>
  );
}