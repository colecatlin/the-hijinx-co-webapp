import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';

export default function MediaRequestsManager({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();

  // Determine org context
  const orgEntityId = selectedTrack?.id || selectedSeries?.id;
  const orgEntityType = selectedTrack ? 'track' : 'series';

  // Load credential requests
  const { data: requests = [] } = useQuery({
    queryKey: ['credential_requests', orgEntityId, selectedEvent?.id],
    queryFn: async () => {
      if (!orgEntityId) return [];
      const allRequests = await base44.entities.CredentialRequest.filter({});
      return allRequests.filter(
        (cr) =>
          cr.target_entity_id === orgEntityId ||
          (selectedEvent && cr.related_event_id === selectedEvent.id)
      );
    },
    enabled: !!orgEntityId,
  });

  // Load media users for display
  const { data: mediaUsers = [] } = useQuery({
    queryKey: ['media_users'],
    queryFn: () => base44.entities.MediaUser.list(),
  });

  const getUserName = (mediaUserId) => {
    const mu = mediaUsers.find((m) => m.id === mediaUserId);
    return mu?.full_name || '—';
  };

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, decision, notes }) => {
      return base44.functions.invoke('media_reviewCredentialRequest', {
        request_id: requestId,
        decision,
        review_notes: notes,
        issuer_entity_id: orgEntityId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential_requests'] });
      invalidateAfterOperation('media_request_updated');
      setPending(false);
    },
    onError: (error) => {
      console.error('Review error:', error);
      setPending(false);
    },
  });

  const handleAction = async (requestId, decision) => {
    setPending(true);
    reviewMutation.mutate({ requestId, decision });
  };

  const statusColor = (status) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-900/40 text-blue-300';
      case 'under_review':
        return 'bg-yellow-900/40 text-yellow-300';
      case 'approved':
        return 'bg-green-900/40 text-green-300';
      case 'denied':
        return 'bg-red-900/40 text-red-300';
      case 'change_requested':
        return 'bg-orange-900/40 text-orange-300';
      default:
        return 'bg-gray-900/40 text-gray-300';
    }
  };

  if (!orgEntityId) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Media Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <p>Select a track or series to view requests</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Media Credential Requests</CardTitle>
        <p className="text-xs text-gray-400 mt-2">
          {selectedEvent
            ? `Showing requests for ${orgEntityType} and event "${selectedEvent.name}"`
            : `Showing requests for ${orgEntityType}. Select an event to see event-specific requests.`}
        </p>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">No requests</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-transparent">
                  <TableHead className="text-gray-400">Created</TableHead>
                  <TableHead className="text-gray-400">Applicant</TableHead>
                  <TableHead className="text-gray-400">Target</TableHead>
                  <TableHead className="text-gray-400">Roles</TableHead>
                  <TableHead className="text-gray-400">Access Level</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className="border-gray-700 hover:bg-gray-900/30">
                    <TableCell className="text-xs text-gray-300">
                      {new Date(req.created_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {getUserName(req.holder_media_user_id)}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {req.target_entity_type}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {req.requested_roles?.join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {req.requested_access_level || 'general'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(req.status)}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-1">
                      {req.status === 'applied' && (
                        <>
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => handleAction(req.id, 'approved')}
                            className="h-6 px-2 text-xs bg-green-700 hover:bg-green-600"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => handleAction(req.id, 'denied')}
                            className="h-6 px-2 text-xs bg-red-700 hover:bg-red-600"
                          >
                            Deny
                          </Button>
                        </>
                      )}
                      {req.status === 'change_requested' && (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => handleAction(req.id, 'under_review')}
                          className="h-6 px-2 text-xs bg-yellow-700 hover:bg-yellow-600"
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}