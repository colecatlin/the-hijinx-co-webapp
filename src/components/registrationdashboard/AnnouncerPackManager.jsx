/**
 * Announcer Pack Manager
 * Generates printable driver lists and event notes for announcers.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { Download, Printer, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function AnnouncerPackManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
}) {
  const eventId = selectedEvent?.id;
  const [packGenerated, setPackGenerated] = useState(false);
  const [classFilter, setClassFilter] = useState('all');
  const [sessionTypeFilter, setSessionTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('car');
  const [includeMedia, setIncludeMedia] = useState(true);
  const [notes, setNotes] = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => (eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: REG_QK.driverPrograms(eventId),
    queryFn: () => (eventId ? base44.entities.DriverProgram.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && entries.length === 0,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['announcerPack_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['announcerPack_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['announcerPack_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: REG_QK.results(eventId),
    queryFn: () => (eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: driverMedia = [] } = useQuery({
    queryKey: ['announcerPack_driverMedia'],
    queryFn: () => base44.entities.DriverMedia.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const classMap = useMemo(() => Object.fromEntries(seriesClasses.map((c) => [c.id, c])), [seriesClasses]);
  const mediaMap = useMemo(
    () => Object.fromEntries(driverMedia.map((m) => [m.driver_id, m])),
    [driverMedia]
  );

  // Use entries if available, fallback to DriverProgram
  const listData = useMemo(() => {
    if (entries.length > 0) return entries;
    return driverPrograms;
  }, [entries, driverPrograms]);

  // Get unique classes from entries
  const uniqueClasses = useMemo(() => {
    const classIds = new Set();
    listData.forEach((e) => {
      if (e.series_class_id || e.event_class_id) {
        classIds.add(e.series_class_id || e.event_class_id);
      }
    });
    return Array.from(classIds);
  }, [listData]);

  // Filter by class and session type
  const filteredEntries = useMemo(() => {
    let result = [...listData];

    if (classFilter !== 'all') {
      result = result.filter(
        (e) => (e.series_class_id || e.event_class_id) === classFilter
      );
    }

    return result.sort((a, b) => {
      const driverA = driverMap[a.driver_id];
      const driverB = driverMap[b.driver_id];
      const nameA = driverA ? `${driverA.first_name} ${driverA.last_name}`.toLowerCase() : '';
      const nameB = driverB ? `${driverB.first_name} ${driverB.last_name}`.toLowerCase() : '';

      if (sortBy === 'car') {
        return (a.car_number || driverA?.primary_number || '').toString().localeCompare(
          (b.car_number || driverB?.primary_number || '').toString()
        );
      } else if (sortBy === 'name') {
        return nameA.localeCompare(nameB);
      }
      return 0;
    });
  }, [listData, classFilter, sortBy, driverMap]);

  // Compute storylines
  const storylines = useMemo(() => {
    if (filteredEntries.length === 0) return [];

    const lines = [];

    // Returning winner
    const drivers_with_results = filteredEntries.filter((e) => {
      const driverResults = results.filter(
        (r) => r.driver_id === e.driver_id && r.session_type === 'Final'
      );
      return driverResults.length > 0;
    });

    if (drivers_with_results.length > 0) {
      const best_finisher = drivers_with_results.reduce((best, curr) => {
        const curr_res = results.find(
          (r) => r.driver_id === curr.driver_id && r.session_type === 'Final'
        );
        const best_res = results.find(
          (r) => r.driver_id === best.driver_id && r.session_type === 'Final'
        );
        const curr_pos = curr_res?.position || 999;
        const best_pos = best_res?.position || 999;
        return curr_pos < best_pos ? curr : best;
      });

      const best_res = results.find(
        (r) => r.driver_id === best_finisher.driver_id && r.session_type === 'Final'
      );
      if (best_res && best_res.position === 1) {
        const best_driver = driverMap[best_finisher.driver_id];
        if (best_driver) {
          lines.push(
            `Returning winner: ${best_driver.first_name} ${best_driver.last_name} (${best_finisher.car_number || best_driver.primary_number})`
          );
        }
      }
    }

    // Most consistent
    if (drivers_with_results.length > 0) {
      const consistency = drivers_with_results.map((e) => {
        const driver_finals = results.filter(
          (r) => r.driver_id === e.driver_id && r.session_type === 'Final'
        );
        const avg_pos =
          driver_finals.length > 0
            ? driver_finals.reduce((sum, r) => sum + (r.position || 999), 0) /
              driver_finals.length
            : 999;
        return { entry: e, avg_pos };
      });

      const most_consistent = consistency.sort((a, b) => a.avg_pos - b.avg_pos)[0];
      if (most_consistent && most_consistent.avg_pos < 999) {
        const driver = driverMap[most_consistent.entry.driver_id];
        if (driver) {
          lines.push(
            `Most consistent: ${driver.first_name} ${driver.last_name} (avg finish ${most_consistent.avg_pos.toFixed(1)})`
          );
        }
      }
    }

    return lines;
  }, [filteredEntries, results, driverMap]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleGeneratePack = useCallback(() => {
    setPackGenerated(true);
    toast.success('Pack generated');
    setTimeout(() => {
      document.getElementById('announcer-pack-preview')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const handleExportCSV = useCallback(() => {
    const rows = [['Car', 'Driver', 'Class', 'Team', 'Hometown', 'Manufacturer', 'Discipline', 'Instagram', 'YouTube']];

    filteredEntries.forEach((entry) => {
      const driver = driverMap[entry.driver_id];
      const cls = classMap[entry.series_class_id || entry.event_class_id];
      const team = teamMap[entry.team_id];
      const media = mediaMap[entry.driver_id];

      rows.push([
        entry.car_number || driver?.primary_number || '',
        driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown',
        cls?.class_name || '',
        team?.name || '',
        driver ? `${driver.hometown_city || ''}${driver.hometown_state ? ', ' + driver.hometown_state : ''}` : '',
        driver?.manufacturer || '',
        driver?.primary_discipline || '',
        media?.instagram_handle || '',
        media?.youtube_channel || '',
      ]);
    });

    const csv = rows.map((row) => row.map((cell) => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `announcer_pack_${selectedEvent.name || 'event'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [filteredEntries, driverMap, classMap, teamMap, mediaMap, selectedEvent.name]);

  const handlePrint = useCallback(() => {
    const printContent = document.getElementById('announcer-pack-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Announcer Pack - ${selectedEvent.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            h1, h2 { page-break-after: avoid; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; page-break-inside: avoid; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .section { page-break-inside: avoid; margin-bottom: 30px; }
            .notes { border: 1px dashed #999; padding: 15px; min-height: 200px; margin-top: 20px; }
            .header-info { background-color: #f9f9f9; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
            .storylines ul { margin: 10px 0; padding-left: 20px; }
            .storylines li { margin: 5px 0; }
            @media print {
              .no-print { display: none; }
              body { margin: 10px; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }, [selectedEvent.name]);

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Announcer Pack</p>
          <p className="text-gray-400 text-sm">Select an event to generate announcer packs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white text-2xl">Announcer Pack</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Generate quick reference sheets for the booth</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGeneratePack}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
              >
                <Sparkles className="w-3 h-3 mr-1" /> Generate Pack
              </Button>
              {packGenerated && (
                <>
                  <Button
                    onClick={handleExportCSV}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-9"
                  >
                    <Download className="w-3 h-3 mr-1" /> Export CSV
                  </Button>
                  <Button
                    onClick={handlePrint}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9"
                  >
                    <Printer className="w-3 h-3 mr-1" /> Print
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Filters */}
        <CardContent className="space-y-3 border-t border-gray-700 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Class</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="all" className="text-white">All Classes</SelectItem>
                  {uniqueClasses.map((classId) => (
                    <SelectItem key={classId} value={classId} className="text-white">
                      {classMap[classId]?.class_name || classId.slice(0, 6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="car" className="text-white">Car Number</SelectItem>
                  <SelectItem value="name" className="text-white">Driver Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs text-gray-400">Include socials</span>
              </label>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs text-gray-400">Include notes</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Pack Preview ──────────────────────────────────────────────────── */}
      {packGenerated && (
        <div id="announcer-pack-preview" className="space-y-6">
          <Card className="bg-[#171717] border-gray-800">
            <CardContent id="announcer-pack-content" className="py-8 space-y-8">
              {/* Event Header */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white">{selectedEvent.name}</h1>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-400">
                  <div>
                    <p className="text-gray-500 text-xs">Track</p>
                    <p className="text-white font-semibold">{selectedTrack?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Date</p>
                    <p className="text-white font-semibold">
                      {selectedEvent.event_date}
                      {selectedEvent.end_date && ` – ${selectedEvent.end_date}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Status</p>
                    <p className="text-white font-semibold">{selectedEvent.status || 'upcoming'}</p>
                  </div>
                  {selectedSeries && (
                    <div>
                      <p className="text-gray-500 text-xs">Series</p>
                      <p className="text-white font-semibold">{selectedSeries.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver Roll Call */}
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-white">Driver Roll Call ({filteredEntries.length})</h2>
                {filteredEntries.length === 0 ? (
                  <p className="text-gray-400 text-sm">No entries found for this filter.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs bg-[#262626] rounded border border-gray-700">
                      <thead className="bg-[#1A1A1A]">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-300 font-semibold">Car</th>
                          <th className="px-3 py-2 text-left text-gray-300 font-semibold">Driver</th>
                          <th className="px-3 py-2 text-left text-gray-300 font-semibold">Class</th>
                          <th className="px-3 py-2 text-left text-gray-300 font-semibold">Team</th>
                          <th className="px-3 py-2 text-left text-gray-300 font-semibold">Hometown</th>
                          <th className="px-3 py-2 text-left text-gray-300 font-semibold">Manufacturer</th>
                          {includeMedia && (
                            <>
                              <th className="px-3 py-2 text-left text-gray-300 font-semibold">Instagram</th>
                              <th className="px-3 py-2 text-left text-gray-300 font-semibold">YouTube</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {filteredEntries.map((entry) => {
                          const driver = driverMap[entry.driver_id];
                          const cls = classMap[entry.series_class_id || entry.event_class_id];
                          const team = teamMap[entry.team_id];
                          const media = mediaMap[entry.driver_id];

                          return (
                            <tr key={entry.id} className="hover:bg-[#1A1A1A] transition-colors">
                              <td className="px-3 py-2 font-mono text-white">
                                #{entry.car_number || driver?.primary_number || '—'}
                              </td>
                              <td className="px-3 py-2 text-gray-300">
                                {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}
                              </td>
                              <td className="px-3 py-2 text-gray-400">{cls?.class_name || '—'}</td>
                              <td className="px-3 py-2 text-gray-400">{team?.name || '—'}</td>
                              <td className="px-3 py-2 text-gray-400">
                                {driver
                                  ? `${driver.hometown_city || ''}${driver.hometown_state ? ', ' + driver.hometown_state : ''}`
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 text-gray-400">{driver?.manufacturer || '—'}</td>
                              {includeMedia && (
                                <>
                                  <td className="px-3 py-2 text-gray-400">{media?.instagram_handle || '—'}</td>
                                  <td className="px-3 py-2 text-gray-400">{media?.youtube_channel || '—'}</td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Storylines */}
              {storylines.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-white">Storylines</h2>
                  <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm">
                    {storylines.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-white">Announcer Notes</h2>
                <Textarea
                  placeholder="Add weekend notes, talking points, or booth reminders here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-[#262626] border-gray-700 text-white min-h-32"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Prompt */}
      {!packGenerated && (
        <Card className="bg-blue-900/20 border border-blue-800/50">
          <CardContent className="py-6 text-center">
            <p className="text-blue-300 text-sm">Click "Generate Pack" to create your announcer reference sheet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}