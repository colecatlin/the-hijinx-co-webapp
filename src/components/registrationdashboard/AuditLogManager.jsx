import React, { useState, useMemo, useCallback } from 'react';
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
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  History,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();
const ITEMS_PER_PAGE = 50;
const MAX_INITIAL_LOAD = 200;

// ── Operation type labels ─────────────────────────────────────────────────────
const OPERATION_TYPE_LABELS = {
  entry_created: 'Entry Created',
  entry_updated: 'Entry Updated',
  results_updated: 'Results Updated',
  session_updated: 'Session Updated',
  standings_updated: 'Standings Updated',
  export_generated: 'Export Generated',
  tech_updated: 'Tech Updated',
  compliance_updated: 'Compliance Updated',
  checkin_updated: 'Check-In Updated',
  race_control_override: 'Race Control Override',
  ADMIN_OVERRIDE: 'Admin Override',
  import: 'Import',
  standings_recalc: 'Standings Recalc',
  STANDINGS_RECALC: 'Standings Recalc',
  other: 'Other',
};

const OPERATION_OPTIONS = [
  { value: 'all', label: 'All Operations' },
  { value: 'entry_created', label: 'Entry Created' },
  { value: 'entry_updated', label: 'Entry Updated' },
  { value: 'results_updated', label: 'Results Updated' },
  { value: 'session_updated', label: 'Session Updated' },
  { value: 'standings_updated', label: 'Standings Updated' },
  { value: 'export_generated', label: 'Export Generated' },
  { value: 'tech_updated', label: 'Tech Updated' },
  { value: 'compliance_updated', label: 'Compliance Updated' },
  { value: 'checkin_updated', label: 'Check-In Updated' },
  { value: 'race_control_override', label: 'Race Control Override' },
  { value: 'ADMIN_OVERRIDE', label: 'Admin Override' },
  { value: 'import', label: 'Import' },
  { value: 'other', label: 'Other' },
];

// ── Metadata summary builder ──────────────────────────────────────────────────
function buildMetaSummary(log, eventMap, userMap) {
  const m = log.metadata || {};
  const parts = [];

  if (m.driver_name) parts.push(`Driver: ${m.driver_name}`);
  if (m.class_name) parts.push(`Class: ${m.class_name}`);
  if (m.car_number) parts.push(`Car: ${m.car_number}`);
  if (m.export_type) parts.push(`Type: ${m.export_type}`);
  if (m.row_count !== undefined) parts.push(`Rows: ${m.row_count}`);
  if (m.session_id) parts.push(`Session: ${m.session_id.slice(0, 8)}…`);
  if (m.reason) parts.push(`Reason: ${m.reason}`);
  if (m.beforeStatus && m.afterStatus) parts.push(`${m.beforeStatus} → ${m.afterStatus}`);

  return parts.length ? parts.join(' · ') : '—';
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportAuditCSV(logs, eventMap, userMap) {
  const cols = ['timestamp', 'operation_type', 'user', 'event', 'details'];
  const header = cols.map((c) => `"${c}"`).join(',');
  const rows = logs.map((log) => {
    const ts = new Date(log.created_date || log.timestamp || '').toLocaleString();
    const opLabel = OPERATION_TYPE_LABELS[log.operation_type] || log.operation_type || '';
    const user = userMap[log.user_id]?.full_name || log.initiated_by || log.user_id || '—';
    const event = eventMap[log.metadata?.event_id]?.name || log.metadata?.event_id || '—';
    const details = buildMetaSummary(log, eventMap, userMap);
    return [ts, opLabel, user, event, details]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
  });
  const csv = [header, ...rows].join('\n') + '\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

// ── Status helpers ────────────────────────────────────────────────────────────
function statusColor(status) {
  if (status === 'success') return 'bg-green-900/40 text-green-400 border-green-700/50';
  if (status === 'warning') return 'bg-amber-900/40 text-amber-400 border-amber-700/50';
  if (status === 'error') return 'bg-red-900/40 text-red-400 border-red-700/50';
  return 'bg-gray-900/40 text-gray-400 border-gray-700/50';
}

function StatusIcon({ status }) {
  if (status === 'success') return <CheckCircle className="w-3 h-3" />;
  if (status === 'warning') return <AlertTriangle className="w-3 h-3" />;
  if (status === 'error') return <AlertCircle className="w-3 h-3" />;
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AuditLogManager({ isAdmin, operationLogs: providedLogs, dashboardContext }) {
  const [eventFilter, setEventFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Data
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    enabled: !!isAdmin,
    ...DQ,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!isAdmin,
    ...DQ,
  });

  // Lazy-load logs: only after component mounts or filters change
  const logQueryKey = useMemo(
    () => ['operationLogs', 'racecore', eventFilter, operationFilter, startDate, endDate],
    [eventFilter, operationFilter, startDate, endDate]
  );

  const { data: queryLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: logQueryKey,
    queryFn: () => base44.entities.OperationLog.list('-created_date', MAX_INITIAL_LOAD),
    enabled: !!isAdmin,
    ...DQ,
  });

  const rawLogs = providedLogs || queryLogs;

  // Lookup maps
  const eventMap = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  // Pre-filter for the current dashboard event context
  const contextEventId = dashboardContext?.eventId;

  const filteredLogs = useMemo(() => {
    let logs = [...rawLogs];

    // Event filter (prefers explicit dropdown, falls back to dashboard context)
    const activeEventId = eventFilter || contextEventId || '';
    if (activeEventId) {
      logs = logs.filter((l) => l.metadata?.event_id === activeEventId);
    }

    // Operation type
    if (operationFilter && operationFilter !== 'all') {
      logs = logs.filter((l) => l.operation_type === operationFilter);
    }

    // User search
    if (userFilter.trim()) {
      const term = userFilter.toLowerCase();
      logs = logs.filter((l) => {
        const name = userMap[l.user_id]?.full_name || l.initiated_by || l.user_id || '';
        return name.toLowerCase().includes(term);
      });
    }

    // Date range
    if (startDate) {
      const start = new Date(startDate);
      logs = logs.filter((l) => new Date(l.created_date || l.timestamp || 0) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      logs = logs.filter((l) => new Date(l.created_date || l.timestamp || 0) <= end);
    }

    // Sort newest first
    return logs.sort((a, b) =>
      new Date(b.created_date || b.timestamp || 0) - new Date(a.created_date || a.timestamp || 0)
    );
  }, [rawLogs, eventFilter, contextEventId, operationFilter, userFilter, startDate, endDate, userMap]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const resetPage = useCallback(() => setCurrentPage(0), []);

  // ── Guard: not admin ────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <Card className="bg-[#262626] border-gray-700">
        <CardContent className="py-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium">Admin only</p>
              <p className="text-xs text-gray-400 mt-1">Audit Log is available to admins only.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-400" />
          <div>
            <h2 className="text-lg font-bold text-white">System Activity Log</h2>
            <p className="text-xs text-gray-500">
              {filteredLogs.length} records · showing newest first
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={filteredLogs.length === 0}
          onClick={() => exportAuditCSV(filteredLogs, eventMap, userMap)}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          <Download className="w-3 h-3 mr-1.5" /> Export Audit CSV
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-[#262626] border-gray-700">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Event */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Event</label>
              <Select value={eventFilter} onValueChange={(v) => { setEventFilter(v === '_all' ? '' : v); resetPage(); }}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white text-xs">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700 max-h-64">
                  <SelectItem value="_all" className="text-white text-xs">All events</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-white text-xs">{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operation Type */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Operation</label>
              <Select value={operationFilter} onValueChange={(v) => { setOperationFilter(v); resetPage(); }}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700 max-h-64">
                  {OPERATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-white text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">User</label>
              <Input
                value={userFilter}
                onChange={(e) => { setUserFilter(e.target.value); resetPage(); }}
                placeholder="Search user…"
                className="bg-[#171717] border-gray-700 text-white text-xs"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">From</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); resetPage(); }}
                className="bg-[#171717] border-gray-700 text-white text-xs"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">To</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); resetPage(); }}
                className="bg-[#171717] border-gray-700 text-white text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#1e1e1e] border-gray-800">
          <CardContent className="py-3">
            <p className="text-xs text-gray-500">Total Logs</p>
            <p className="text-xl font-bold text-white">{filteredLogs.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e1e1e] border-gray-800">
          <CardContent className="py-3">
            <p className="text-xs text-gray-500">Errors</p>
            <p className="text-xl font-bold text-red-400">
              {filteredLogs.filter((l) => l.status === 'error').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#1e1e1e] border-gray-800">
          <CardContent className="py-3">
            <p className="text-xs text-gray-500">Overrides</p>
            <p className="text-xl font-bold text-amber-400">
              {filteredLogs.filter((l) => ['ADMIN_OVERRIDE','race_control_override'].includes(l.operation_type)).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-[#262626] border-gray-700">
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">Loading…</div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center">
              <History className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No audit logs available yet</p>
              <p className="text-xs text-gray-600 mt-1">Activity will appear here as operations are performed.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#171717]">
                    <TableRow>
                      <TableHead className="text-gray-400 text-xs">Timestamp</TableHead>
                      <TableHead className="text-gray-400 text-xs">Operation</TableHead>
                      <TableHead className="text-gray-400 text-xs">User</TableHead>
                      <TableHead className="text-gray-400 text-xs">Event</TableHead>
                      <TableHead className="text-gray-400 text-xs">Details</TableHead>
                      <TableHead className="text-gray-400 text-xs w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log, idx) => {
                      const userName = userMap[log.user_id]?.full_name || log.initiated_by || log.user_id || '—';
                      const eventName = eventMap[log.metadata?.event_id]?.name || log.metadata?.event_id || '—';
                      const opLabel = OPERATION_TYPE_LABELS[log.operation_type] || log.operation_type || '—';
                      const summary = buildMetaSummary(log, eventMap, userMap);
                      const ts = log.created_date || log.timestamp;

                      return (
                        <TableRow key={log.id || idx} className="hover:bg-[#1e1e1e] border-t border-gray-800">
                          <TableCell className="text-gray-400 text-xs py-2 whitespace-nowrap font-mono">
                            {ts ? new Date(ts).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-xs font-normal border-gray-600 text-gray-300">
                              {opLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs py-2">{userName}</TableCell>
                          <TableCell className="text-gray-300 text-xs py-2 max-w-[140px] truncate">{eventName}</TableCell>
                          <TableCell className="text-gray-400 text-xs py-2 max-w-[260px]">
                            <span className="line-clamp-2">{summary}</span>
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setSelectedLog(log); setDetailsOpen(true); }}
                              className="h-6 px-2 text-blue-400 hover:text-blue-300 text-xs"
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
                  Page {currentPage + 1} of {totalPages || 1} · {filteredLogs.length} records
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <ChevronLeft className="w-3 h-3 mr-1" /> Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
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

      {/* Detail Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="bg-[#262626] border-gray-700 w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Operation Details</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="space-y-5 mt-6 text-xs">
              <div className="space-y-2">
                {[
                  ['Operation', OPERATION_TYPE_LABELS[selectedLog.operation_type] || selectedLog.operation_type],
                  ['Status', selectedLog.status || '—'],
                  ['Timestamp', selectedLog.created_date ? new Date(selectedLog.created_date).toLocaleString() : '—'],
                  ['User', userMap[selectedLog.user_id]?.full_name || selectedLog.initiated_by || selectedLog.user_id || '—'],
                  ['Event', eventMap[selectedLog.metadata?.event_id]?.name || selectedLog.metadata?.event_id || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-gray-200 text-right">{val}</span>
                  </div>
                ))}
              </div>

              {selectedLog.metadata && (
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-gray-400 mb-2 font-medium">Metadata</p>
                  <pre className="bg-[#171717] rounded p-3 text-gray-300 overflow-auto max-h-64 text-xs">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.error_details && (
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-red-400 mb-2 font-medium">Error Details</p>
                  <pre className="bg-[#171717] rounded p-3 text-gray-300 overflow-auto max-h-40 text-xs">
                    {selectedLog.error_details}
                  </pre>
                </div>
              )}

              {/* Related links */}
              {selectedLog.metadata && (
                <div className="border-t border-gray-700 pt-4 space-y-2">
                  <p className="text-gray-400 font-medium">Related Links</p>
                  {selectedLog.metadata.event_id && (
                    <Link to={createPageUrl('EventProfile') + `?id=${selectedLog.metadata.event_id}`}>
                      <Button size="sm" variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start text-xs">
                        <ExternalLink className="w-3 h-3 mr-2" /> View Event
                      </Button>
                    </Link>
                  )}
                  {selectedLog.metadata.session_id && (
                    <Link to={createPageUrl('SessionProfile') + `?id=${selectedLog.metadata.session_id}`}>
                      <Button size="sm" variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start text-xs">
                        <ExternalLink className="w-3 h-3 mr-2" /> View Session
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}