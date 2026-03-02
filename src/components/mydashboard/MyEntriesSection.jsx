import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  LogIn, Calendar, MapPin, User, Truck, Download, Trash2, Edit, ChevronRight,
  Plus, Clock,
} from 'lucide-react';

const STATUS_COLORS = {
  Registered: 'bg-blue-100 text-blue-800',
  'Checked In': 'bg-green-100 text-green-800',
  Teched: 'bg-indigo-100 text-indigo-800',
  Withdrawn: 'bg-gray-100 text-gray-600',
  Unknown: 'bg-gray-100 text-gray-600',
};

async function writeOperationLog(type, entityName, entryId, eventId, driverId) {
  try {
    const OperationLogEntity = await base44.asServiceRole.entities.OperationLog;
    if (OperationLogEntity) {
      await OperationLogEntity.create({
        operation_type: type,
        source_type: 'MyDashboard',
        entity_name: entityName,
        entity_id: entryId,
        event_id: eventId,
        status: 'success',
        metadata: { driverId, timestamp: new Date().toISOString() },
      });
    }
  } catch (_) {
    // non-fatal
  }
}

function EntryDetailDrawer({ entry, allEvents, onClose, onWithdraw }) {
  const event = allEvents.find(e => e.id === entry.event_id);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const handleWithdraw = async () => {
    setWithdrawLoading(true);
    try {
      if (entry.sourceType === 'Entry') {
        await base44.entities.Entry.update(entry.id, { entry_status: 'Withdrawn' });
      } else if (entry.sourceType === 'DriverProgram') {
        const dp = await base44.entities.DriverProgram.get(entry.id);
        if (dp) {
          const notes = (dp.notes || '') + '\n[Status: Withdrawn via MyDashboard]';
          await base44.entities.DriverProgram.update(entry.id, { notes });
        }
      }
      await writeOperationLog('entry_withdrawn', entry.sourceType, entry.id, entry.event_id, entry.driver_id);
      toast.success('Entry withdrawn');
      onWithdraw();
    } catch (err) {
      toast.error('Failed to withdraw entry');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Event', event?.name || ''],
      ['Date', event?.event_date || ''],
      ['Driver', entry.driver_name || ''],
      ['Car #', entry.car_number || ''],
      ['Transponder', entry.transponder_id || 'N/A'],
      ['Team', entry.team_id || 'N/A'],
      ['Status', entry.status || 'Unknown'],
      ['Source', entry.sourceType],
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entry-${entry.id}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Drawer open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-white">
        <DrawerHeader>
          <DrawerTitle>{event?.name || 'Entry Details'}</DrawerTitle>
        </DrawerHeader>
        <div className="px-6 pb-6 space-y-4 max-w-2xl mx-auto">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase">Event Date</p>
              <p className="text-sm font-medium text-gray-900">{event?.event_date || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Driver</p>
              <p className="text-sm font-medium text-gray-900">{entry.driver_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Car Number</p>
              <p className="text-sm font-medium text-gray-900">{entry.car_number || '—'}</p>
            </div>
            {entry.transponder_id && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Transponder ID</p>
                <p className="text-sm font-medium text-gray-900">{entry.transponder_id}</p>
              </div>
            )}
            {entry.team_id && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Team</p>
                <p className="text-sm font-medium text-gray-900">{entry.team_id}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase">Status</p>
              <Badge className={STATUS_COLORS[entry.status] || STATUS_COLORS.Unknown}>
                {entry.status || 'Unknown'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Source</p>
              <Badge variant="outline">{entry.sourceType}</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t">
            <Button
              onClick={() => {
                window.location.href = createPageUrl(
                  `Registration?orgType=track&orgId=${event?.track_id}&seasonYear=${event?.season}&eventId=${event?.id}`
                );
              }}
              className="bg-[#232323] hover:bg-[#1A3249] text-white gap-2"
            >
              <Edit className="w-4 h-4" /> Edit Registration
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            {entry.status !== 'Withdrawn' && (
              <Button
                onClick={handleWithdraw}
                disabled={withdrawLoading}
                variant="outline"
                className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" /> {withdrawLoading ? 'Withdrawing...' : 'Withdraw'}
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default function MyEntriesSection({ user, isLoading }) {
  const queryClient = useQueryClient();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');

  // Owned drivers
  const { data: ownedDrivers = [] } = useQuery({
    queryKey: ['ownedDrivers', user?.id],
    queryFn: () => base44.entities.Driver.filter({ owner_user_id: user.id }),
    enabled: !!user?.id,
  });

  // Entries from Entry entity
  const { data: entries = [] } = useQuery({
    queryKey: ['myEntries', user?.id],
    queryFn: async () => {
      try {
        return await base44.entities.Entry.filter({ created_by: user.email });
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Driver programs as fallback
  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['myDriverPrograms', ownedDrivers.length],
    queryFn: async () => {
      if (!ownedDrivers.length) return [];
      const allPrograms = [];
      for (const driver of ownedDrivers) {
        try {
          const progs = await base44.entities.DriverProgram.filter({ driver_id: driver.id });
          allPrograms.push(...progs.filter(p => p.event_id));
        } catch {
          // skip
        }
      }
      return allPrograms;
    },
    enabled: ownedDrivers.length > 0,
  });

  // All events
  const { data: allEvents = [] } = useQuery({
    queryKey: ['allEvents'],
    queryFn: () => base44.entities.Event.list('-event_date', 500),
  });

  // Normalize entries
  const normalizedEntries = useMemo(() => {
    const normalized = [];

    entries.forEach(entry => {
      const driver = ownedDrivers.find(d => d.id === entry.driver_id);
      normalized.push({
        id: entry.id,
        sourceType: 'Entry',
        event_id: entry.event_id,
        driver_id: entry.driver_id,
        driver_name: driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown',
        car_number: entry.car_number,
        transponder_id: entry.transponder_id,
        team_id: entry.team_id,
        series_id: entry.series_id,
        status: entry.entry_status || 'Registered',
        created_date: entry.created_date,
        updated_date: entry.updated_date,
      });
    });

    driverPrograms.forEach(dp => {
      const driver = ownedDrivers.find(d => d.id === dp.driver_id);
      normalized.push({
        id: dp.id,
        sourceType: 'DriverProgram',
        event_id: dp.event_id,
        driver_id: dp.driver_id,
        driver_name: driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown',
        car_number: '',
        transponder_id: '',
        team_id: dp.team_id,
        series_id: dp.series_id,
        status: 'Unknown',
        created_date: dp.created_date,
        updated_date: dp.updated_date,
      });
    });

    return normalized;
  }, [entries, driverPrograms, ownedDrivers]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...normalizedEntries];

    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => {
        const event = allEvents.find(ev => ev.id === e.event_id);
        return (
          event?.name?.toLowerCase().includes(term) ||
          e.car_number?.toLowerCase().includes(term) ||
          e.driver_name?.toLowerCase().includes(term)
        );
      });
    }

    if (timeFilter === 'upcoming') {
      const today = new Date();
      result = result.filter(e => {
        const event = allEvents.find(ev => ev.id === e.event_id);
        return event && new Date(event.event_date) >= today;
      });
      result.sort((a, b) => {
        const eventA = allEvents.find(ev => ev.id === a.event_id);
        const eventB = allEvents.find(ev => ev.id === b.event_id);
        return new Date(eventA?.event_date || 0) - new Date(eventB?.event_date || 0);
      });
    } else if (timeFilter === 'past') {
      const today = new Date();
      result = result.filter(e => {
        const event = allEvents.find(ev => ev.id === e.event_id);
        return event && new Date(event.event_date) < today;
      });
      result.sort((a, b) => {
        const eventA = allEvents.find(ev => ev.id === a.event_id);
        const eventB = allEvents.find(ev => ev.id === b.event_id);
        return new Date(eventB?.event_date || 0) - new Date(eventA?.event_date || 0);
      });
    }

    return result;
  }, [normalizedEntries, statusFilter, timeFilter, searchTerm, allEvents]);

  if (!user) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
          <LogIn className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Sign in to view your entries</h3>
        <Button
          onClick={() => base44.auth.redirectToLogin(createPageUrl('MyDashboard'))}
          className="bg-[#232323] hover:bg-[#1A3249] text-white"
        >
          <LogIn className="w-4 h-4 mr-2" /> Sign In
        </Button>
      </div>
    );
  }

  if (ownedDrivers.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
          <User className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">No driver profile found</h3>
        <p className="text-sm text-gray-600">Create a driver profile to register for events.</p>
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => window.location.href = createPageUrl('Profile?tab=driver')}
            className="bg-[#232323] hover:bg-[#1A3249] text-white"
          >
            Go to Profile
          </Button>
          <Button variant="outline">
            <a href={createPageUrl('Registration')}>Go to Registration</a>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !allEvents.length) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0 && normalizedEntries.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
          <Truck className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">No entries yet</h3>
        <p className="text-sm text-gray-600">Register for an event to get started.</p>
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => window.location.href = createPageUrl('Registration')}
            className="bg-[#232323] hover:bg-[#1A3249] text-white gap-2"
          >
            <Plus className="w-4 h-4" /> Register Now
          </Button>
          <Button variant="outline">
            <a href={createPageUrl('EventDirectory')}>View Events</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">My Entries</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by event, car #, driver..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Registered">Registered</SelectItem>
            <SelectItem value="Checked In">Checked In</SelectItem>
            <SelectItem value="Teched">Teched</SelectItem>
            <SelectItem value="Withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No entries match your filters.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => {
            const event = allEvents.find(e => e.id === entry.event_id);
            return (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-colors flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">{event?.name || 'Unknown Event'}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {event?.event_date || '—'}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {entry.driver_name}
                    </span>
                    {entry.car_number && (
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" /> #{entry.car_number}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[entry.status] || STATUS_COLORS.Unknown}>
                    {entry.status}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      <EntryDetailDrawer
        entry={selectedEntry}
        allEvents={allEvents}
        onClose={() => setSelectedEntry(null)}
        onWithdraw={() => {
          queryClient.invalidateQueries({ queryKey: ['myEntries'] });
          queryClient.invalidateQueries({ queryKey: ['myDriverPrograms'] });
          setSelectedEntry(null);
        }}
      />
    </div>
  );
}