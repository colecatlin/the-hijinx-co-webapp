/**
 * Event Switcher
 * Provides searchable, filterable event selection with create capability
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Plus, X } from 'lucide-react';
import { canAction } from '@/components/access/accessControl';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { QueryKeys } from '@/components/utils/queryKeys';

const DQ = applyDefaultQueryOptions();

const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'draft':
    case 'upcoming':
      return 'bg-gray-500/20 text-gray-400';
    case 'published':
      return 'bg-blue-500/20 text-blue-400';
    case 'live':
    case 'in_progress':
      return 'bg-red-500/20 text-red-400';
    case 'completed':
      return 'bg-green-500/20 text-green-400';
    case 'cancelled':
      return 'bg-red-900/20 text-red-300';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

const normalizeStatus = (status) => {
  const normalized = status?.toLowerCase() || '';
  if (['draft', 'upcoming'].includes(normalized)) return 'Draft';
  if (normalized === 'published') return 'Published';
  if (['live', 'in_progress'].includes(normalized)) return 'Live';
  if (normalized === 'completed') return 'Completed';
  if (normalized === 'cancelled') return 'Cancelled';
  return status || 'Unknown';
};

export default function EventSwitcher({
  dashboardContext,
  selectedEvent,
  dashboardPermissions,
  onSelectEvent,
  onCreateEvent,
  onClearEvent,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { orgType, orgId, season } = dashboardContext || {};
  const isReady = !!orgType && !!orgId && !!season;

  // ── Query events for this org/season ────────────────────────────────────

  const { data: allEvents = [] } = useQuery({
    queryKey: QueryKeys.events.list(),
    queryFn: () => base44.entities.Event.list(),
    enabled: !!isReady,
    ...DQ,
  });

  // ── Filter events ──────────────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    let filtered = [...allEvents];

    // Filter by org and season
    if (orgType === 'track' && orgId) {
      filtered = filtered.filter((e) => e.track_id === orgId);
    } else if (orgType === 'series' && orgId) {
      filtered = filtered.filter((e) => e.series_id === orgId);
    }

    // Filter by season
    if (season) {
      filtered = filtered.filter((e) => {
        if (e.season) return e.season === season;
        const eventYear = e.event_date ? new Date(e.event_date).getFullYear().toString() : null;
        return eventYear === season;
      });
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((e) => e.name?.toLowerCase().includes(query));
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((e) => {
        const normalized = normalizeStatus(e.status);
        return normalized.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    // Sort by event_date ascending
    filtered.sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
      const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
      return dateA - dateB;
    });

    return filtered;
  }, [allEvents, orgType, orgId, season, searchQuery, statusFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleSelectEvent = (eventId) => {
    onSelectEvent(eventId);
    setOpen(false);
    setSearchQuery('');
    setStatusFilter('all');
  };

  const handleCreateEvent = () => {
    onCreateEvent();
    setOpen(false);
  };

  // ── UI ─────────────────────────────────────────────────────────────────

  if (!isReady) {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Event</label>
        <Button
          disabled
          variant="outline"
          className="w-64 bg-[#262626] border-gray-700 text-gray-500 cursor-not-allowed"
        >
          <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
        </Button>
        <span className="text-xs text-gray-500">Select Track/Series and Season first</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-400 uppercase tracking-wide">Event</label>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-64 bg-[#262626] border-gray-700 text-white hover:bg-gray-800 justify-between"
          >
            <span className="truncate">
              {selectedEvent?.name || 'Select event...'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="bg-[#262626] border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Switch Event</DialogTitle>
            <DialogDescription className="text-gray-400">
              Search and filter to find your event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <Input
              placeholder="Search event name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
            />

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all" className="text-white">
                  All Status
                </SelectItem>
                <SelectItem value="draft" className="text-white">
                  Draft
                </SelectItem>
                <SelectItem value="published" className="text-white">
                  Published
                </SelectItem>
                <SelectItem value="live" className="text-white">
                  Live
                </SelectItem>
                <SelectItem value="completed" className="text-white">
                  Completed
                </SelectItem>
                <SelectItem value="cancelled" className="text-white">
                  Cancelled
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Event List */}
            <ScrollArea className="h-64 border border-gray-700 rounded-lg bg-gray-900">
              <div className="p-3 space-y-2">
                {filteredEvents.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-xs text-gray-500">No events found</p>
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleSelectEvent(event.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedEvent?.id === event.id
                          ? 'bg-blue-900/40 border-blue-700'
                          : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {event.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {event.event_date}
                            {event.end_date && ` – ${event.end_date}`}
                          </p>
                        </div>
                        <Badge className={`text-xs flex-shrink-0 ${getStatusBadgeClass(event.status)}`}>
                          {normalizeStatus(event.status)}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="flex gap-2 justify-between pt-2">
              <Button
                onClick={onClearEvent}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => setOpen(false)}
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                {canAction(dashboardPermissions, 'create_event') && (
                  <Button
                    onClick={handleCreateEvent}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Create
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}