import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import RacerSectionHeading from '@/components/racerprofile/RacerSectionHeading';
import RacerMediaStrip from '@/components/racerprofile/RacerMediaStrip';
import { selectCareerMilestones } from '@/components/racerprofile/racerMilestones';

/**
 * CareerView — a professional racing history.
 *
 * Season history, team history, series and class history and meaningful
 * milestones only. The achievement engine is untouched: this view selects
 * which of its generated outputs read as career events (see
 * racerMilestones.js) rather than rendering the full games-style set.
 *
 * Season-associated photography is not fabricated: available photography is
 * used editorially between sections.
 */

export default function CareerView({
  statistics,
  participations = [],
  teamHistory = [],
  careerEntries = [],
  allSeries = [],
  allClasses = [],
  achievements = [],
  galleryPhotos = [],
  heroImage = null,
  portraitImage = null,
  racerName = '',
}) {
  const seriesById = useMemo(() => new Map(allSeries.map((series) => [series.id, series])), [allSeries]);
  const classesById = useMemo(() => new Map(allClasses.map((item) => [item.id, item])), [allClasses]);

  // Series context per season, from the canonical participations.
  const seriesBySeason = useMemo(() => {
    const map = new Map();
    participations.forEach((participation) => {
      const year = participation.season_year;
      if (!year) return;
      const seriesName = seriesById.get(participation.series_id)?.name || null;
      if (!seriesName) return;
      if (!map.has(year)) map.set(year, new Set());
      map.get(year).add(seriesName);
    });
    return map;
  }, [participations, seriesById]);

  const seasonRows = useMemo(() => {
    const aggregateSeasons = statistics?.by_season || [];
    if (aggregateSeasons.length > 0) {
      return [...aggregateSeasons]
        .sort((a, b) => String(b.season_year).localeCompare(String(a.season_year)))
        .map((season) => ({
          key: `season-${season.season_year}`,
          year: season.season_year,
          series: [...(seriesBySeason.get(season.season_year) || [])].join(', ') || null,
          racerClass: null,
          starts: season.starts,
          wins: season.wins,
          podiums: season.podiums,
          points: season.points,
        }));
    }

    // Graceful fallback to the canonical year-by-year career entries.
    return [...careerEntries]
      .sort((a, b) => String(b.year).localeCompare(String(a.year)))
      .map((entry) => ({
        key: `entry-${entry.id}`,
        year: entry.year,
        series:
          entry.series_name_override ||
          seriesById.get(entry.series_id)?.name ||
          null,
        racerClass:
          entry.class_name_override ||
          classesById.get(entry.class_id)?.class_name ||
          null,
        starts: entry.starts,
        wins: entry.wins,
        podiums: entry.podiums,
        points: null,
      }));
  }, [statistics, careerEntries, seriesBySeason, seriesById, classesById]);

  const seriesHistory = statistics?.by_series || [];
  const classHistory = statistics?.by_class || [];
  const milestones = selectCareerMilestones(achievements);
  const hasPhotography = galleryPhotos.length > 0 || Boolean(heroImage) || Boolean(portraitImage);

  const figureRow = (row, nameKey) => (
    <div
      key={row[nameKey] || row.series_id || row.class_id}
      className="border-b border-divider py-3.5 last:border-0"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{row[nameKey] || '—'}</span>
        <span className="font-mono text-[11px] text-foreground-secondary">
          {[
            row.starts != null && `${row.starts} starts`,
            row.wins != null && `${row.wins} wins`,
            row.podiums != null && `${row.podiums} podiums`,
            row.points != null && `${row.points} pts`,
            row.championships > 0 && `${row.championships}× champion`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6">
      {/* SEASON HISTORY */}
      {seasonRows.length > 0 && (
        <section>
          <RacerSectionHeading label="History" title="Season by Season" />
          <div>
            {seasonRows.map((season) => (
              <div
                key={season.key}
                className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-1 border-b border-divider py-4 last:border-0 sm:grid-cols-[5rem_1fr_auto]"
              >
                <span className="font-mono text-lg font-black text-foreground">{season.year}</span>
                <span className="min-w-0 text-sm text-foreground-secondary">
                  {[season.series, season.racerClass].filter(Boolean).join(' · ') || '—'}
                </span>
                <span className="col-span-2 font-mono text-[11px] text-foreground-quiet sm:col-span-1 sm:text-right">
                  {[
                    season.starts != null && `${season.starts} starts`,
                    season.wins != null && `${season.wins} wins`,
                    season.podiums != null && `${season.podiums} podiums`,
                    season.points != null && `${season.points} pts`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EDITORIAL PHOTOGRAPHY (available imagery used between data sections) */}
      {hasPhotography && (
        <RacerMediaStrip
          heroImage={heroImage}
          portraitImage={portraitImage}
          photos={galleryPhotos}
          alt={`${racerName || 'Racer'} career photography`}
          limit={3}
        />
      )}

      {/* TEAM HISTORY */}
      {teamHistory.length > 0 && (
        <section>
          <RacerSectionHeading label="Teams" title="Team History" />
          <div>
            {teamHistory.map((team) => (
              <div
                key={team.team_id}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-divider py-4 last:border-0"
              >
                {team.team_logo_url && (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-divider bg-surface-elevated p-1.5">
                    <img
                      src={team.team_logo_url}
                      alt={team.team_name}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  {team.team_slug ? (
                    <Link
                      to={`/TeamProfile?slug=${team.team_slug}`}
                      className="text-sm font-semibold text-foreground hover:text-motion"
                    >
                      {team.team_name}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-foreground">{team.team_name}</span>
                  )}
                  {team.is_current && (
                    <span className="ml-3 font-mono text-[10px] tracking-[0.3em] uppercase text-motion">Current</span>
                  )}
                </span>
                <span className="font-mono text-[11px] text-foreground-quiet">
                  {[
                    team.starts != null && `${team.starts} starts`,
                    team.wins != null && `${team.wins} wins`,
                    team.podiums != null && `${team.podiums} podiums`,
                    team.points ? `${team.points} pts` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SERIES + CLASS HISTORY */}
      {(seriesHistory.length > 0 || classHistory.length > 0) && (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {seriesHistory.length > 0 && (
            <section>
              <RacerSectionHeading label="Series" title="Series History" />
              <div>{seriesHistory.map((row) => figureRow(row, 'series_name'))}</div>
            </section>
          )}
          {classHistory.length > 0 && (
            <section>
              <RacerSectionHeading label="Classes" title="Class History" />
              <div>{classHistory.map((row) => figureRow(row, 'class_name'))}</div>
            </section>
          )}
        </div>
      )}

      {/* MILESTONES — meaningful career events only */}
      {milestones.length > 0 && (
        <section>
          <RacerSectionHeading label="Milestones" title="Career Milestones" />
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="border-t border-divider pt-3">
                <div className="text-sm font-bold uppercase tracking-tight text-foreground">{milestone.title}</div>
                {milestone.description && (
                  <div className="mt-1 text-xs leading-relaxed text-foreground-secondary">{milestone.description}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}