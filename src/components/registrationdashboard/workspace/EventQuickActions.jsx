/**
 * R9CQ — EventQuickActions
 * One-click action strip for the Overview panel.
 * Uses existing backend mutations only.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  UserPlus, LogIn, Play, CheckSquare, BarChart3, Trophy, Download, Flag
} from 'lucide-react';
import { toast } from 'sonner';

export default function EventQuickActions({
  selectedEvent,
  sessions = [],
  isAdmin,
  onNavigate,
  onStandingsRecalc,
  standingsDirty,
}) {
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);

  // Find next actionable session
  const nextSession = sessions.find(s => s.status === 'Draft' || s.status === 'Provisional');
  const liveSession = sessions.find(s => s.status === 'Live');

  const startSessionMutation = useMutation({
    mutationFn: ({ session_id }) =>
      base44.functions.invoke('updateSessionStatus', { session_id, status: 'Live' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      toast.success('Session started');
    },
    onError: () => toast.error('Failed to start session'),
  });

  const completeSessionMutation = useMutation({
    mutationFn: ({ session_id }) =>
      base44.functions.invoke('updateSessionStatus', { session_id, status: 'Completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      toast.success('Session completed');
    },
    onError: () => toast.error('Failed to complete session'),
  });

  const recalcMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('recalculateStandings', {
        series_id: selectedEvent?.series_id,
        season_year: selectedEvent?.season || new Date().getFullYear().toString(),
        event_id: eventId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      toast.success('Standings recalculated');
      onStandingsRecalc?.();
    },
    onError: () => toast.error('Standings recalculation failed'),
  });

  const handleExportPacket = async () => {
    setExporting(true);
    toast.info('Generating export packet…');
    await new Promise(r => setTimeout(r, 800));
    onNavigate?.('exports');
    setExporting(false);
  };

  const actions = [
    {
      label: 'Add Entry',
      icon: UserPlus,
      onClick: () => onNavigate?.('entries'),
      variant: 'default',
    },
    {
      label: 'Check-In',
      icon: LogIn,
      onClick: () => onNavigate?.('checkin'),
      variant: 'default',
    },
    {
      label: liveSession ? 'Complete Session' : 'Start Session',
      icon: liveSession ? CheckSquare : Play,
      onClick: () => {
        if (liveSession) {
          completeSessionMutation.mutate({ session_id: liveSession.id });
        } else if (nextSession) {
          startSessionMutation.mutate({ session_id: nextSession.id });
        } else {
          onNavigate?.('sessions');
        }
      },
      variant: liveSession ? 'warning' : 'active',
      loading: startSessionMutation.isPending || completeSessionMutation.isPending,
      disabled: !liveSession && !nextSession,
    },
    {
      label: 'Publish Provisional',
      icon: BarChart3,
      onClick: () => onNavigate?.('results'),
      variant: 'default',
    },
    {
      label: 'Recalc Standings',
      icon: Trophy,
      onClick: () => recalcMutation.mutate(),
      variant: standingsDirty ? 'warning' : 'default',
      loading: recalcMutation.isPending,
      disabled: !selectedEvent?.series_id,
    },
    {
      label: 'Export Packet',
      icon: Download,
      onClick: handleExportPacket,
      variant: 'default',
      loading: exporting,
    },
    ...(isAdmin ? [{
      label: 'Complete Event',
      icon: Flag,
      onClick: () => onNavigate?.('closeout'),
      variant: 'default',
    }] : []),
  ];

  const variantClasses = {
    default: 'bg-surface-interactive/60 hover:bg-surface-interactive border-divider text-foreground-secondary',
    active: 'bg-motion/10 hover:bg-motion/20 border-motion/30 text-motion',
    warning: 'bg-warning/10 hover:bg-warning/20 border-warning/30 text-warning',
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[action.variant] || variantClasses.default}`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {action.loading ? '…' : action.label}
          </button>
        );
      })}
    </div>
  );
}