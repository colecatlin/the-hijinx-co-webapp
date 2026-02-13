import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import NextEventModule from './NextEventModule';
import TrackRecordsModule from './TrackRecordsModule';
import SeriesRacingHereModule from './SeriesRacingHereModule';
import SurfaceLayoutStatsModule from './SurfaceLayoutStatsModule';
import TicketingLinksModule from './TicketingLinksModule';

export default function TrackDashboard({ track }) {
  return (
    <div className="space-y-8">
      <NextEventModule trackId={track.id} />
      <TrackRecordsModule trackId={track.id} />
      <SeriesRacingHereModule trackId={track.id} />
      <SurfaceLayoutStatsModule track={track} />
      <TicketingLinksModule track={track} trackId={track.id} />
    </div>
  );
}