import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import PointsConfigEditor from './pointsstandings/PointsConfigEditor';
import StandingsTable from './pointsstandings/StandingsTable';
import StandingsStatus from './pointsstandings/StandingsStatus';

export default function PointsStandingsManager({ isAdmin }) {
  const [seriesId, setSeriesId] = useState('');
  const [seasonYear, setSeasonYear] = useState('');
  const [classId, setClassId] = useState('');
  const [eventId, setEventId] = useState('');

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () =>
      seriesId
        ? base44.entities.SeriesClass.filter({ series_id: seriesId })
        : Promise.resolve([]),
    enabled: !!seriesId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', seriesId, seasonYear],
    queryFn: () =>
      seriesId && seasonYear
        ? base44.entities.Event.filter({
            series_id: seriesId,
            season: seasonYear,
          })
        : Promise.resolve([]),
    enabled: !!seriesId && !!seasonYear,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['standings', seriesId, seasonYear, classId],
    queryFn: () => {
      if (!seriesId || !seasonYear) return Promise.resolve([]);
      const filter = { series_id: seriesId, season: seasonYear };
      if (classId) filter.class_name = classId;
      return base44.entities.Standings.filter(filter);
    },
    enabled: !!seriesId && !!seasonYear,
  });

  const { data: pointsConfigs = [] } = useQuery({
    queryKey: ['pointsConfigs', seriesId, seasonYear],
    queryFn: () => {
      if (!seriesId || !seasonYear) return Promise.resolve([]);
      return base44.entities.PointsConfig.filter({
        series_id: seriesId,
        season_year: seasonYear,
      });
    },
    enabled: !!seriesId && !!seasonYear,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Results.list(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
  });

  const selectedSeries = useMemo(
    () => seriesList.find((s) => s.id === seriesId),
    [seriesList, seriesId]
  );

  const years = useMemo(() => {
    if (!selectedSeries?.season_year) {
      return Array.from({ length: 10 }, (_, i) =>
        (new Date().getFullYear() - i).toString()
      );
    }
    return [selectedSeries.season_year];
  }, [selectedSeries]);

  const selectedPointsConfig = useMemo(
    () =>
      pointsConfigs.find(
        (pc) => pc.series_id === seriesId && pc.season_year === seasonYear
      ),
    [pointsConfigs, seriesId, seasonYear]
  );

  if (!isAdmin) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-500">
            <AlertCircle className="w-5 h-5" />
            <p>Points and Standings is only available to admins</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!seriesId) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select a series to manage standings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Series Selector */}
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

            {/* Season Selector */}
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
                      <SelectItem key={cls.id} value={cls.class_name} className="text-white">
                        {cls.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Event Selector (Optional) */}
            {events.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                  Event (Preview)
                </label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value={null} className="text-white">
                      All Events
                    </SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id} className="text-white">
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      {seasonYear && (
        <StandingsStatus
          standings={standings}
          pointsConfig={selectedPointsConfig}
          seriesId={seriesId}
          seasonYear={seasonYear}
          className={classId}
        />
      )}

      {/* Two Column Layout */}
      {seasonYear && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Points Config Editor */}
          <div className="lg:col-span-1">
            <PointsConfigEditor
              seriesId={seriesId}
              seriesName={selectedSeries?.name}
              seasonYear={seasonYear}
              pointsConfig={selectedPointsConfig}
              seriesClasses={seriesClasses}
            />
          </div>

          {/* Right Column - Standings Table */}
          <div className="lg:col-span-2">
            <StandingsTable
              standings={standings}
              seriesId={seriesId}
              seasonYear={seasonYear}
              classId={classId}
              pointsConfig={selectedPointsConfig}
            />
          </div>
        </div>
      )}
    </div>
  );
}