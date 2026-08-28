import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Flag, Briefcase, ChevronRight } from 'lucide-react';

const MOTION = 'hsl(var(--motion))';

function WidgetShell({ title, to, icon: Icon, children }) {
  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{
        background: 'hsl(var(--surface-elevated) / 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid hsl(var(--divider) / 0.6)',
      }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color: MOTION }} />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>{title}</p>
        </div>
        <Link to={to}>
          <span className="text-xs flex items-center gap-0.5 transition-colors"
            style={{ color: 'hsl(var(--foreground-quiet))' }}
            onMouseEnter={e => e.currentTarget.style.color = MOTION}
            onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--foreground-quiet))'}>
            View <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-xs py-2" style={{ color: 'hsl(var(--foreground-quiet))' }}>{text}</p>;
}

/**
 * Live summary widgets for the My Dashboard page.
 * Shows upcoming events, recent results, and media assignments
 * scoped to the sections the user has access to. Gracefully shows
 * empty states — never errors — for users with no data.
 */
export default function DashboardSummaryWidgets({ user, hasRaceCoreAccess, hasMediaAccess }) {
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['dashboard_upcoming_events'],
    queryFn: () => base44.entities.Event.list('-event_date', 3),
    staleTime: 60_000,
  });

  const { data: recentResults = [] } = useQuery({
    queryKey: ['dashboard_recent_results'],
    queryFn: () => base44.entities.Results.list('-created_date', 3),
    enabled: hasRaceCoreAccess,
    staleTime: 60_000,
  });

  const { data: mediaAssignments = [] } = useQuery({
    queryKey: ['dashboard_media_assignments', user?.id],
    queryFn: () => base44.entities.MediaAssignment.filter({ assigned_to_user_id: user.id }, '-created_date', 3),
    enabled: !!user?.id && hasMediaAccess,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
        Activity
      </p>

      <WidgetShell title="Upcoming Events" to="/Directory?cat=events" icon={Calendar}>
        {upcomingEvents.length === 0 ? (
          <EmptyState text="No upcoming events." />
        ) : (
          <div className="space-y-1.5">
            {upcomingEvents.map(ev => (
              <Link key={ev.id} to={ev.slug ? `/events/${ev.slug}` : '/Directory?cat=events'}>
                <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg transition-colors"
                  style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.3)'}>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>{ev.name}</p>
                    {ev.location_note && <p className="text-[10px] truncate" style={{ color: 'hsl(var(--foreground-quiet))' }}>{ev.location_note}</p>}
                  </div>
                  {ev.event_date && (
                    <span className="text-[10px] font-mono flex-shrink-0 ml-2" style={{ color: MOTION }}>
                      {new Date(ev.event_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </WidgetShell>

      {hasRaceCoreAccess && (
        <WidgetShell title="Recent Results" to="/racecore/event-files" icon={Flag}>
          {recentResults.length === 0 ? (
            <EmptyState text="No results yet." />
          ) : (
            <div className="space-y-1.5">
              {recentResults.map(r => (
                <div key={r.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg"
                  style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
                  <p className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                    {r.driver_name || r.entry_name || 'Result'}
                  </p>
                  {r.position && <span className="text-[10px] font-mono flex-shrink-0 ml-2" style={{ color: MOTION }}>P{r.position}</span>}
                </div>
              ))}
            </div>
          )}
        </WidgetShell>
      )}

      {hasMediaAccess && (
        <WidgetShell title="My Assignments" to="/racecore/media/assignments" icon={Briefcase}>
          {mediaAssignments.length === 0 ? (
            <EmptyState text="No active assignments." />
          ) : (
            <div className="space-y-1.5">
              {mediaAssignments.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg"
                  style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
                  <p className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>{a.assignment_title}</p>
                  <span className="text-[10px] uppercase tracking-wider flex-shrink-0 ml-2" style={{ color: 'hsl(var(--foreground-quiet))' }}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </WidgetShell>
      )}
    </div>
  );
}