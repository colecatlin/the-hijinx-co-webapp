import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

export default function ResultsControlBar({
  organizationType,
  setOrganizationType,
  trackId,
  setTrackId,
  seriesId,
  setSeriesId,
  seasonYear,
  setSeasonYear,
  eventId,
  setEventId,
  classId,
  setClassId,
  sessionId,
  setSessionId,
  tracks,
  seriesList,
  filteredEvents,
  seriesClasses,
  sessions,
}) {
  const years = Array.from({ length: 10 }, (_, i) =>
    (new Date().getFullYear() - i).toString()
  );

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Organization Type */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
              Organization
            </label>
            <Select value={organizationType} onValueChange={setOrganizationType}>
              <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="track" className="text-white">
                  Track
                </SelectItem>
                <SelectItem value="series" className="text-white">
                  Series
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Track Selector */}
          {organizationType === 'track' && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Track
              </label>
              <Select value={trackId} onValueChange={setTrackId}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                  <SelectValue placeholder="Select track..." />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {tracks.map((track) => (
                    <SelectItem key={track.id} value={track.id} className="text-white">
                      {track.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Series Selector */}
          {organizationType === 'series' && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Series
              </label>
              <Select value={seriesId} onValueChange={setSeriesId}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                  <SelectValue placeholder="Select series..." />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {seriesList.map((series) => (
                    <SelectItem key={series.id} value={series.id} className="text-white">
                      {series.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Season Selector */}
          {organizationType === 'series' && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Season
              </label>
              <Select value={seasonYear} onValueChange={setSeasonYear}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                  <SelectValue placeholder="Select year..." />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {years.map((year) => (
                    <SelectItem key={year} value={year} className="text-white">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Event Selector */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
              Event
            </label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                <SelectValue placeholder="Select event..." />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700 max-h-80">
                {filteredEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id} className="text-white">
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class Selector */}
          {seriesClasses.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                Class
              </label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value={null} className="text-white">
                    All Classes
                  </SelectItem>
                  {seriesClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id} className="text-white">
                      {cls.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Session Selector */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
              Session
            </label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                <SelectValue placeholder="Select session..." />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id} className="text-white">
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}