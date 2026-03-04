import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

export default function CollaborationStatusPanel({
  selectedEvent,
  dashboardContext,
  isAdmin,
  onStatusChange
}) {
  const queryClient = useQueryClient();
  const [isResponding, setIsResponding] = useState(false);

  if (!selectedEvent?.collaboration_id) {
    return null;
  }

  const { data: collaboration, isLoading } = useQuery({
    queryKey: ['eventCollaboration', selectedEvent.collaboration_id],
    queryFn: () => base44.entities.EventCollaboration.list().then(colls =>
      colls.find(c => c.id === selectedEvent.collaboration_id)
    ),
    enabled: !!selectedEvent.collaboration_id
  });

  const respondMutation = useMutation({
    mutationFn: async ({ response }) => {
      const result = await base44.functions.invoke('respondToEventCollaboration', {
        collaboration_id: selectedEvent.collaboration_id,
        entity_type: dashboardContext?.orgType === 'track' ? 'track' : 'series',
        response,
        user_id: (await base44.auth.me()).email
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventCollaboration'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onStatusChange?.();
    }
  });

  if (isLoading || !collaboration) {
    return null;
  }

  const isPending = dashboardContext?.orgType === 'track'
    ? collaboration.track_acceptance_status === 'pending'
    : collaboration.series_acceptance_status === 'pending';

  const getStatusIcon = (status) => {
    if (status === 'accepted') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusColor = (status) => {
    if (status === 'accepted') return 'bg-green-500/10 text-green-700';
    if (status === 'rejected') return 'bg-red-500/10 text-red-700';
    return 'bg-yellow-500/10 text-yellow-700';
  };

  const bothAccepted = collaboration.track_acceptance_status === 'accepted' &&
                      collaboration.series_acceptance_status === 'accepted';

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-400" />
          Collaboration Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Track Status */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            {getStatusIcon(collaboration.track_acceptance_status)}
            <span className="text-sm text-gray-300">Track</span>
          </div>
          <Badge className={getStatusColor(collaboration.track_acceptance_status)}>
            {collaboration.track_acceptance_status}
          </Badge>
        </div>

        {/* Series Status */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            {getStatusIcon(collaboration.series_acceptance_status)}
            <span className="text-sm text-gray-300">Series</span>
          </div>
          <Badge className={getStatusColor(collaboration.series_acceptance_status)}>
            {collaboration.series_acceptance_status}
          </Badge>
        </div>

        {/* Planning Rights */}
        <div className="space-y-2 p-3 bg-gray-800 rounded-lg">
          <p className="text-xs font-semibold text-gray-400">Planning Rights</p>
          <div className="flex justify-between text-xs text-gray-300">
            <span>Track: {collaboration.track_planning_rights}</span>
            <span>Series: {collaboration.series_planning_rights}</span>
          </div>
        </div>

        {/* Publish Gate Mode */}
        <div className="p-3 bg-gray-800 rounded-lg">
          <p className="text-xs font-semibold text-gray-400">Publish Gate Mode</p>
          <p className="text-xs text-gray-300 mt-1">
            {collaboration.publish_gate_mode === 'both_must_accept'
              ? 'Both sides must accept before publishing'
              : 'Either side with full_publish rights can publish'}
          </p>
        </div>

        {/* Status Alert */}
        {bothAccepted && (
          <Alert className="bg-green-500/10 border-green-600">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600 text-xs">
              Both sides accepted. Ready to publish!
            </AlertDescription>
          </Alert>
        )}

        {isPending && (
          <Alert className="bg-yellow-500/10 border-yellow-600">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-600 text-xs">
              Awaiting {dashboardContext?.orgType === 'track' ? 'your' : 'the other'} acceptance
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {isPending && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => respondMutation.mutate({ response: 'accept' })}
              disabled={isResponding || respondMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="sm"
            >
              Accept
            </Button>
            <Button
              onClick={() => respondMutation.mutate({ response: 'reject' })}
              disabled={isResponding || respondMutation.isPending}
              variant="outline"
              className="flex-1 border-red-600 text-red-400 hover:text-red-300"
              size="sm"
            >
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}