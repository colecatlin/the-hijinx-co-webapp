/**
 * Event Collaboration Panel
 * 
 * Displays and manages Track/Series collaboration status and acceptance workflow
 * Embedded in EventBuilderForm
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import {
  getAcceptStatusLabel,
  getAcceptStatusColor,
  getPublishStatusLabel,
  getPublishStatusColor,
  computePublishReady,
} from './collaborationRules';

export default function CollaborationPanel({
  event,
  currentOrgType,
  onAccept,
  onReject,
  onPlanningRightsChange,
  onPublish,
  onUnpublish,
  isUpdating,
}) {
  if (!event) return null;

  const { isReady, reason } = computePublishReady(event);
  const planningRights = event.planning_rights || 'dual';
  const isTrackSide = currentOrgType === 'track';
  const isSeriesSide = currentOrgType === 'series';
  const currentOrgPending = isTrackSide ? event.track_accept_status === 'pending' : event.series_accept_status === 'pending';
  const currentOrgPublishStatus = isTrackSide ? event.track_publish_status : event.series_publish_status;

  return (
    <div className="space-y-4">
      {/* Planning Rights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Planning Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={planningRights} onValueChange={onPlanningRightsChange} disabled={!isTrackSide && !isSeriesSide}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dual">Both must accept and publish</SelectItem>
              <SelectItem value="track_only">Track can plan and publish alone</SelectItem>
              <SelectItem value="series_only">Series can plan and publish alone</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            {planningRights === 'dual' && 'Both Track and Series must accept and publish before event is public.'}
            {planningRights === 'track_only' && 'Only Track needs to accept and publish.'}
            {planningRights === 'series_only' && 'Only Series needs to accept and publish.'}
          </p>
        </CardContent>
      </Card>

      {/* Acceptance Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Collaboration Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Track */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Track</span>
              <Badge className={`${getAcceptStatusColor(event.track_accept_status)}`}>
                {getAcceptStatusLabel(event.track_accept_status)}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
              Publish: {getPublishStatusLabel(event.track_publish_status)}
            </div>
            {isTrackSide && event.track_accept_status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => onAccept('track')} disabled={isUpdating} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => onReject('track')} disabled={isUpdating} className="flex-1">
                  Reject
                </Button>
              </div>
            )}
          </div>

          {/* Series */}
          {event.series_id && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Series</span>
                <Badge className={`${getAcceptStatusColor(event.series_accept_status)}`}>
                  {getAcceptStatusLabel(event.series_accept_status)}
                </Badge>
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                Publish: {getPublishStatusLabel(event.series_publish_status)}
              </div>
              {isSeriesSide && event.series_accept_status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => onAccept('series')} disabled={isUpdating} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onReject('series')} disabled={isUpdating} className="flex-1">
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish Ready Status */}
      <Card className={isReady ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            {isReady ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Ready to Publish
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-600" /> Not Ready
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isReady && <p className="text-sm text-gray-700">{reason}</p>}

          {(isTrackSide || isSeriesSide) && (
            <div className="flex gap-2 pt-2">
              {currentOrgPublishStatus === 'draft' ? (
                <Button onClick={() => onPublish(currentOrgType)} disabled={isUpdating} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  Publish {isTrackSide ? 'as Track' : 'as Series'}
                </Button>
              ) : (
                <Button onClick={() => onUnpublish(currentOrgType)} disabled={isUpdating} variant="outline" className="flex-1">
                  Unpublish {isTrackSide ? 'as Track' : 'as Series'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}