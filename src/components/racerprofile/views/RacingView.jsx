import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import RacerSectionHeading from '@/components/racerprofile/RacerSectionHeading';
import RacerStatLine from '@/components/racerprofile/RacerStatLine';
import RacerCurrentProgram from '@/components/racerprofile/RacerCurrentProgram';

/**
 * RacingView — the competitive record, derived entirely from canonical
 * RaceCore data already present in the experience response.
 *
 * Season selection is a presentation filter over the loaded response: it never
 * triggers a new request and never re-resolves the profile.
 */

function formatDay(value, pattern = 'd MMM yyyy') {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? format(date, pattern) : null;
}

export default function RacingView({
  participations = [],
  results = [],
  standings = [],
  entries = [],
  allEvents = [],
  allSessions = [],
  allTracks = [],
  allSeries = [],
  allClasses = [],
  statistics,
  currentContext,
}) {
  const seasonYears = useMemo(() => {
    const fromParticipations = participations.map((item) => item.season_year).filter(Boolean);
    const fromStatistics = (statistics?.by_season || []).map((item) => item.season_year).filter(Boolean);
    return [...new Set([...fromParticipations, ...fromStatistics])]
      .map(String)
      .sort((a, b) => b.localeCompare(a));
  }, [participations, statistics]);

  const defaultSeason = useMemo(
    () => participations.find((item) => item.is_primary)?.season_year || seasonYears[0] || null,
    [participations, seasonYears]
  );

  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);
  useEffect(() => setSelectedSeason(defaultSeason), [defaultSeason]);

  const eventsById = useMemo(() => new Map(allEvents.map((event) => [event.id, event])), [allEvents]);
  const sessionsById = useMemo(() => new Map(allSessions.map((session) => [session.id, session])), [allSessions]);
  const tracksById = useMemo(() => new Map(allTracks.map((track) => [track.id, track])), [allTracks]);
  const seriesById = useMemo(() => new Map(allSeries.map((series) => [series.id, series])), [allSeries]);
  const classesById = useMemo(() => new Map(allClasses.map((item) => [item.id, item])), [allClasses]);

  const eventOfResult = (result) => {
    const eventId = result.event_id || sessionsById.get(result.session_id)?.event_id;
    return eventId ? eventsById.get(eventId) || null : null;
  };

  const seasonResults = useMemo(() => {
    const rows = results
      .map((result) => {
        const event = eventOfResult(result);
        const session = sessionsById.get(result.session_id) || null;
        const track = event?.track_id ? tracksById.get(event.track_id) : null;
        const series = seriesById.get(event?.series_id || result.series_id) || null;
        const racerClass = classesById.get(result.series_class_id) || null;
        return { result, event, session, track, series, racerClass };
      })
      .filter((row) => row.event)
      .filter((row) => !selectedSeason || String(row.event.season) === String(selectedSeason));

    return rows.sort((a, b) => new Date(b.event.event_date || 0) - new Date(a.event.event_date || 0));
  }, [results, selectedSeason, eventsById, sessionsById, tracksById, seriesById, classesById]);

  const seasonStandings = useMemo(
    () =>
      standings
        .filter((standing) => !selectedSeason || String(standing.season_year) === String(selectedSeason))
        .map((standing) => ({
          standing,
          series: seriesById.get(standing.series_id) || null,
          racerClass: classesById.get(standing.series_class_id) || null,
        })),
    [standings, selectedSeason, seriesById, classesById]
  );

  const upcomingEvents = useMemo(() => {
    return entries
      .map((entry) => ({
        entry,
        event: eventsById.get(entry.event_id) || null,
        track: null,
      }))
      .map((row) => ({ ...row, track: row.event?.track_id ? tracksById.get(row.event.track_id) : null }))
      .filter((row) => row.event && row.event.status !== 'completed')
      .sort((a, b) => new Date(a.event.event_date || 0) - new Date(b.event.event_date || 0))
      .slice(0, 5);
  }, [entries, eventsById, tracksById]);

  const careerFigures = statistics?.career
    ? [
        { label: 'wins', value: statistics.career.wins ?? 0 },
        { label: 'podiums', value: statistics.career.podiums ?? 0 },
        { label: 'starts', value: statistics.career.starts ?? 0 },
        { label: 'top 5s', value: statistics.career.top5 ?? 0 },
        { label: 'top 10s', value: statistics.career.top10 ?? 0 },
        { label: 'points', value: statistics.career.points ?? 0 },
        { label: 'championships', value: statistics.career.championships ?? 0 },
        { label: 'seasons', value: statistics.career.seasons_count ?? null },
      ].filter((item) => item.value !== null && item.value !== undefined)
    : [];

  const breakdowns = [
    { title: 'By Series', rows: statistics?.by_series, nameKey: 'series_name' },
    { title: 'By Class', rows: statistics?.by_class, nameKey: 'class_name' },
    { title: 'By Track', rows: statistics?.by_track, nameKey: 'track_name' },
  ].filter((group) => (group.rows || []).length > 0);

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6">
      {/* SEASON SELECTION (presentation filter over the loaded response) */}
      {seasonYears.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-divider pb-4">
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-motion">Season</span>
          {seasonYears.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedSeason(year)}
              className={`font-mono text-sm transition-colors ${
                String(selectedSeason) === String(year)
                  ? 'text-foreground underline decoration-motion decoration-2 underline-offset-4'
                  : 'text-foreground-quiet hover:text-foreground'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {/* CURRENT PROGRAM */}
      {currentContext && <RacerCurrentProgram currentContext={currentContext} />}

      {/* RESULTS */}
      <section>
        <RacerSectionHeading
          label="Results"
          title={selectedSeason ? `${selectedSeason} Season Results` : 'Race Results'}
        />
        {seasonResults.length === 0 ? (
          <p className="text-sm text-foreground-secondary">
            No results are recorded for this {selectedSeason ? 'season' : 'racer'}.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider">
                <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-foreground-quiet">Date</th>
                <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-foreground-quiet">Event</th>
                <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-foreground-quiet">Track</th>
                <th className="py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-foreground-quiet">Series</th>
                <th className="py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.24em] text-foreground-quiet">Finish</th>
                <th className="py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.24em] text-foreground-quiet">Pts</th>
              </tr>
            </thead>
            <tbody>
              {seasonResults.map(({ result, event, session, track, series }) => (
                <tr key={result.id} className="border-b border-divider last:border-0">
                  <td data-label="Date" className="py-3 font-mono text-xs text-foreground-quiet">
                    {formatDay(event.event_date, 'd MMM') || '—'}
                  </td>
                  <td data-label="Event" className="py-3 font-semibold text-foreground">
                    <Link to={`/EventProfile?id=${event.id}`} className="hover:text-motion">
                      {event.name}
                    </Link>
                    {session?.name && (
                      <span className="ml-2 text-xs font-normal text-foreground-quiet">{session.name}</span>
                    )}
                  </td>
                  <td data-label="Track" className="py-3 text-foreground-secondary">{track?.name || '—'}</td>
                  <td data-label="Series" className="py-3 text-foreground-secondary">{series?.name || '—'}</td>
                  <td data-label="Finish" className="py-3 text-right font-black tabular-nums text-foreground">
                    {result.position ? `P${result.position}` : result.status || '—'}
                  </td>
                  <td data-label="Pts" className="py-3 text-right tabular-nums text-foreground-secondary">
                    {result.points ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* STANDINGS */}
      {seasonStandings.length > 0 && (
        <section>
          <RacerSectionHeading label="Championship" title="Standings" />
          <div>
            {seasonStandings.map(({ standing, series, racerClass }) => (
              <div
                key={standing.id}
                className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-divider py-4 last:border-0"
              >
                <span className="text-sm font-semibold text-foreground">{series?.name || '—'}</span>
                {racerClass?.class_name && (
                  <span className="text-xs text-foreground-secondary">{racerClass.class_name}</span>
                )}
                <span className="font-mono text-[11px] text-foreground-quiet">{standing.season_year}</span>
                <span className="ml-auto flex items-baseline gap-6">
                  <span className="text-lg font-black tabular-nums text-foreground">
                    {standing.position ?? standing.rank ? `P${standing.position ?? standing.rank}` : '—'}
                  </span>
                  <span className="font-mono text-xs text-foreground-secondary">
                    {standing.points_total ?? 0} pts
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* UPCOMING EVENTS */}
      {upcomingEvents.length > 0 && (
        <section>
          <RacerSectionHeading label="Next" title="Upcoming Events" />
          <div>
            {upcomingEvents.map(({ entry, event, track }) => (
              <Link
                key={entry.id}
                to={`/EventProfile?id=${event.id}`}
                className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-divider py-4 last:border-0 hover:text-motion"
              >
                <span className="font-mono text-[11px] text-foreground-quiet">
                  {formatDay(event.event_date) || 'TBA'}
                </span>
                <span className="text-sm font-semibold text-foreground">{event.name}</span>
                {track?.name && <span className="text-xs text-foreground-secondary">{track.name}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* STATISTICS */}
      {careerFigures.length > 0 && (
        <section>
          <RacerSectionHeading label="Statistics" title="Racing Statistics" />
          <RacerStatLine items={careerFigures} />
        </section>
      )}

      {breakdowns.length > 0 && (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {breakdowns.map((group) => (
            <section key={group.title}>
              <RacerSectionHeading label="Breakdown" title={group.title} />
              <div>
                {group.rows.map((row) => (
                  <div
                    key={row[group.nameKey] || row.series_id || row.class_id || row.track_id}
                    className="border-b border-divider py-3 last:border-0"
                  >
                    <div className="text-sm font-semibold text-foreground">{row[group.nameKey] || '—'}</div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-secondary">
                      {[
                        row.starts != null && `${row.starts} starts`,
                        row.wins != null && `${row.wins} wins`,
                        row.podiums != null && `${row.podiums} podiums`,
                        row.points != null && `${row.points} pts`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}