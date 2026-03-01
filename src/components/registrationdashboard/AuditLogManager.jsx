import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { AlertCircle, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

const ENTITY_OPTIONS = [
  'All',
  'Driver',
  'Team',
  'Track',
  'Series',
  'SeriesClass',
  'Event',
  'Session',
  'Results',
  'Standings',
  'PointsConfig',
  'Invitation',
  'EntityCollaborator',
];

const OPERATION_OPTIONS = [
  'All',
  'import',
  'export',
  'integration_sync',
  'standings_recalc',
  'publish',
  'lock',
  'update',
  'delete',
  'create',
  'other',
];

const STATUS_OPTIONS = ['All', 'success', 'warning', 'error'];

const ITEMS_PER_PAGE = 50;

export default function AuditLogManager({ isAdmin, operationLogs: providedLogs }) {
  const [orgType, setOrgType] = useState('series');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [entityFilter, setEntityFilter] = useState('All');
  const [operationFilter, setOperationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [quickFilter, setQuickFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Data fetching
  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: operationLogs: queryLogs = [] } = useQuery({
    queryKey: ['operationLogs'],
    queryFn: () => base44.entities.OperationLog.list(),
  });

  // Use provided logs or query logs
  const operationLogs = providedLogs || queryLogs;

  // Compute available seasons
  const seasons = useMemo(() => {
    if (!selectedOrg) return [];
    const uniqueYears = new Set();
    if (orgType === 'series') {
      events.forEach((e) => {
        if (e.series_id === selectedOrg) {
          const year = new Date(e.event_date).getFullYear();
          uniqueYears.add(year);
        }
      });
    }
    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [selectedOrg, orgType, events]);

  // Filter events based on selection
  const filteredEvents = useMemo(() => {
    if (!selectedOrg || !selectedSeason) return [];
    const year = parseInt(selectedSeason);
    return events.filter((e) => {
      const eventYear = new Date(e.event_date).getFullYear();
      if (orgType === 'series') {
        return e.series_id === selectedOrg && eventYear === year;
      }
      return eventYear === year;
    });
  }, [selectedOrg, selectedSeason, orgType, events]);

  // Apply all filters to operation logs
  const filteredLogs = useMemo(() => {
    let filtered = [...operationLogs];

    // Quick filter
    if (quickFilter === 'overrides') {
      filtered = filtered.filter((log) => log.operation_type === 'ADMIN_OVERRIDE');
    } else if (quickFilter === 'imports') {
      filtered = filtered.filter((log) => log.operation_type === 'import');
    } else if (quickFilter === 'standings') {
      filtered = filtered.filter((log) => log.operation_type === 'STANDINGS_RECALC');
    }

    // Filter by entity
    if (entityFilter !== 'All') {
      filtered = filtered.filter((log) => log.entity_name === entityFilter);
    }

    // Filter by operation type
    if (operationFilter !== 'All') {
      filtered = filtered.filter((log) => log.operation_type === operationFilter);
    }

    // Filter by status
    if (statusFilter !== 'All') {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    // Filter by user
    if (userFilter.trim()) {
      filtered = filtered.filter(
        (log) =>
          log.initiated_by?.toLowerCase().includes(userFilter.toLowerCase()) ||
          log.user_email?.toLowerCase().includes(userFilter.toLowerCase())
      );
    }

    // Filter by event
    if (selectedEvent) {
      filtered = filtered.filter(
        (log) => log.metadata?.event_id === selectedEvent
      );
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.created_date || log.import_date);
        return logDate >= start;
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.created_date || log.import_date);
        return logDate <= end;
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.function_name?.toLowerCase().includes(term) ||
          log.entity_name?.toLowerCase().includes(term) ||
          log.file_name?.toLowerCase().includes(term) ||
          log.source_url?.toLowerCase().includes(term) ||
          log.error_details?.toLowerCase().includes(term)
      );
    }

    // Sort by newest first
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_date || a.import_date);
      const dateB = new Date(b.created_date || b.import_date);
      return dateB - dateA;
    });
  }, [
    operationLogs,
    entityFilter,
    operationFilter,
    statusFilter,
    userFilter,
    selectedEvent,
    startDate,
    endDate,
    searchTerm,
    quickFilter,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // Quick insights
  const errorCount = filteredLogs.filter((log) => log.status === 'error').length;
  const warningCount = filteredLogs.filter(
    (log) => log.status === 'warning'
  ).length;
  const lastAdminAction = filteredLogs[0];

  const getStatusColor = (status) => {
    if (status === 'success') return 'bg-green-900/40 text-green-400 border-green-700/50';
    if (status === 'warning') return 'bg-amber-900/40 text-amber-400 border-amber-700/50';
    if (status === 'error') return 'bg-red-900/40 text-red-400 border-red-700/50';
    return 'bg-gray-900/40 text-gray-400 border-gray-700/50';
  };

  const getStatusIcon = (status) => {
    if (status === 'success') return <CheckCircle className="w-3 h-3" />;
    if (status === 'warning') return <AlertTriangle className="w-3 h-3" />;
    if (status === 'error') return <AlertCircle className="w-3 h-3" />;
    return null;
  };

  if (!isAdmin) {
    return (
      <Card className="bg-[#262626] border-gray-700">
        <CardContent className="py-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium">Admin only</p>
              <p className="text-xs text-gray-400 mt-1">
                Audit Log is available to admins only.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card className="bg-[#262626] border-gray-700 sticky top-0 z-40">
        <CardContent className="py-4">
          <div className="space-y-3">
            {/* Row 1 */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Organization
                </label>
                <Select value={orgType} onValueChange={setOrgType}>
                  <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171717] border-gray-700">
                    <SelectItem value="track" className="text-white">
                      Track
                    </SelectItem>
                    <SelectItem value="series" className="text-white">
                      Series
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {orgType === 'track' && (
                <div className="flex-1 min-w-xs">
                  <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                    Track
                  </label>
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                      <SelectValue placeholder="Select track..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#171717] border-gray-700">
                      {tracks.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-white">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {orgType === 'series' && (
                <div className="flex-1 min-w-xs">
                  <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                    Series
                  </label>
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                      <SelectValue placeholder="Select series..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#171717] border-gray-700">
                      {series.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-white">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Season
                </label>
                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                    <SelectValue placeholder="Select season..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171717] border-gray-700">
                    {seasons.map((year) => (
                      <SelectItem key={year} value={year.toString()} className="text-white">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Event
                </label>
                <Select
                  value={selectedEvent}
                  onValueChange={(val) => {
                    setSelectedEvent(val);
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171717] border-gray-700">
                    <SelectItem value={null} className="text-white">
                      All events
                    </SelectItem>
                    {filteredEvents.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="text-white">
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Entity
                </label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171717] border-gray-700">
                    {ENTITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-white">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Operation
                </label>
                <Select value={operationFilter} onValueChange={setOperationFilter}>
                  <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171717] border-gray-700">
                    {OPERATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-white">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171717] border-gray-700">
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-white">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  User
                </label>
                <Input
                  value={userFilter}
                  onChange={(e) => {
                    setUserFilter(e.target.value);
                    setCurrentPage(0);
                  }}
                  placeholder="Filter by user..."
                  className="bg-[#171717] border-gray-700 text-white text-xs"
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="bg-[#171717] border-gray-700 text-white text-xs"
                />
              </div>

              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="bg-[#171717] border-gray-700 text-white text-xs"
                />
              </div>

              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Search
                </label>
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(0);
                  }}
                  placeholder="Search logs..."
                  className="bg-[#171717] border-gray-700 text-white text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-[#262626] border-gray-700">
          <CardContent className="py-3">
            <p className="text-xs text-gray-400">Total Logs</p>
            <p className="text-lg font-bold text-white">{filteredLogs.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#262626] border-gray-700">
          <CardContent className="py-3">
            <p className="text-xs text-gray-400">Errors</p>
            <p className="text-lg font-bold text-red-400">{errorCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#262626] border-gray-700">
          <CardContent className="py-3">
            <p className="text-xs text-gray-400">Warnings</p>
            <p className="text-lg font-bold text-amber-400">{warningCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#262626] border-gray-700">
          <CardContent className="py-3">
            <p className="text-xs text-gray-400">Last Action</p>
            <p className="text-xs text-gray-300">
              {lastAdminAction
                ? new Date(
                    lastAdminAction.created_date || lastAdminAction.import_date
                  ).toLocaleDateString()
                : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-[#262626] border-gray-700">
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">No logs found</p>
            </div>
          ) : (
            <>
              <div className="border-gray-700 overflow-hidden rounded-lg">
                <Table>
                  <TableHeader className="bg-[#171717]">
                    <TableRow>
                      <TableHead className="text-gray-400 text-xs">Timestamp</TableHead>
                      <TableHead className="text-gray-400 text-xs">User</TableHead>
                      <TableHead className="text-gray-400 text-xs">Action</TableHead>
                      <TableHead className="text-gray-400 text-xs">Object</TableHead>
                      <TableHead className="text-gray-400 text-xs">Function</TableHead>
                      <TableHead className="text-gray-400 text-xs">Status</TableHead>
                      <TableHead className="text-gray-400 text-xs">Records</TableHead>
                      <TableHead className="text-gray-400 text-xs">Event</TableHead>
                      <TableHead className="text-gray-400 text-xs">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log, idx) => {
                      const recordCount =
                        (log.created_records || 0) + (log.updated_records || 0);
                      return (
                        <TableRow
                          key={idx}
                          className="hover:bg-[#171717]/50 border-t border-gray-700/50"
                        >
                          <TableCell className="text-gray-300 text-xs py-2">
                            {new Date(
                              log.created_date || log.import_date
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs py-2">
                            {log.initiated_by || log.user_email || '-'}
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs py-2">
                            <Badge variant="outline" className="text-xs">
                              {log.operation_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs py-2">
                            {log.entity_name || '-'}
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs py-2">
                            {log.function_name || '-'}
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            <Badge className={`text-xs ${getStatusColor(log.status)}`}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(log.status)}
                                {log.status}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs py-2">
                            {recordCount > 0 ? recordCount : log.total_records || '-'}
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs py-2">
                            {log.metadata?.event_id ? 'Yes' : '-'}
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedLog(log);
                                setDetailsOpen(true);
                              }}
                              className="h-auto p-1 text-blue-400 hover:text-blue-300"
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
                <p className="text-xs text-gray-400">
                  Page {currentPage + 1} of {totalPages || 1} ({filteredLogs.length} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <ChevronLeft className="w-3 h-3 mr-1" /> Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Next <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Drawer */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="bg-[#262626] border-gray-700 w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Operation Details</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="space-y-6 mt-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-medium text-white mb-2">Basic Information</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Operation Type</span>
                    <span className="text-gray-200">{selectedLog.operation_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Entity</span>
                    <span className="text-gray-200">{selectedLog.entity_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className="text-gray-200">{selectedLog.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Timestamp</span>
                    <span className="text-gray-200">
                      {new Date(
                        selectedLog.created_date || selectedLog.import_date
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">User</span>
                    <span className="text-gray-200">
                      {selectedLog.initiated_by || selectedLog.user_email || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Records Summary */}
              {(selectedLog.total_records || selectedLog.created_records || selectedLog.updated_records) && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-white mb-2">Records Summary</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total</span>
                      <span className="text-gray-200">{selectedLog.total_records || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created</span>
                      <span className="text-gray-200">{selectedLog.created_records || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Updated</span>
                      <span className="text-gray-200">{selectedLog.updated_records || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Skipped</span>
                      <span className="text-gray-200">{selectedLog.skipped_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Failed</span>
                      <span className="text-gray-200">{selectedLog.failed_count || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {(selectedLog.failed_count > 0 || selectedLog.error_details) && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-red-400 mb-2">Error Details</h3>
                  <pre className="bg-[#171717] rounded p-3 text-xs text-gray-300 overflow-auto max-h-40">
                    {selectedLog.error_details || 'No error details'}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-white mb-2">Metadata</h3>
                  <pre className="bg-[#171717] rounded p-3 text-xs text-gray-300 overflow-auto max-h-64">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Source Info */}
              {(selectedLog.file_name || selectedLog.source_url) && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-white mb-2">Source Information</h3>
                  <div className="space-y-2 text-xs">
                    {selectedLog.file_name && (
                      <div>
                        <span className="text-gray-400">File: </span>
                        <span className="text-gray-200">{selectedLog.file_name}</span>
                      </div>
                    )}
                    {selectedLog.source_url && (
                      <div>
                        <span className="text-gray-400">URL: </span>
                        <a href={selectedLog.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                          {selectedLog.source_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Related Links */}
              {selectedLog.metadata && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-white mb-2">Related Links</h3>
                  <div className="space-y-2">
                    {selectedLog.metadata.event_id && (
                      <Link to={createPageUrl('EventProfile', `?id=${selectedLog.metadata.event_id}`)}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
                        >
                          <ExternalLink className="w-3 h-3 mr-2" />
                          View Event
                        </Button>
                      </Link>
                    )}
                    {selectedLog.metadata.session_id && (
                      <Link to={createPageUrl('SessionProfile', `?id=${selectedLog.metadata.session_id}`)}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
                        >
                          <ExternalLink className="w-3 h-3 mr-2" />
                          View Session
                        </Button>
                      </Link>
                    )}
                    {selectedLog.metadata.series_id && (
                      <Link to={createPageUrl('SeriesDetail', `?id=${selectedLog.metadata.series_id}`)}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
                        >
                          <ExternalLink className="w-3 h-3 mr-2" />
                          View Series
                        </Button>
                      </Link>
                    )}
                    {selectedLog.metadata.track_id && (
                      <Link to={createPageUrl('TrackProfile', `?id=${selectedLog.metadata.track_id}`)}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
                        >
                          <ExternalLink className="w-3 h-3 mr-2" />
                          View Track
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Full JSON */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-white mb-2">Full Record</h3>
                <pre className="bg-[#171717] rounded p-3 text-xs text-gray-300 overflow-auto max-h-64">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}