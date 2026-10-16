/**
 * racerMilestones.js — PRESENTATION-ONLY milestone selection.
 *
 * The achievement engine is unchanged: it still generates, and the experience
 * function still returns, the full achievement set. This module selects which
 * of those outputs read as meaningful motorsports career events on the public
 * Career view, so the page reads as a racing history rather than a games-style
 * achievement screen.
 *
 * Deliberately excluded as trivial/gamified: "First Finish", "First Top 10",
 * low-value thresholds (10/25/50 starts, 5 wins, 10/25 podiums) and every
 * locked/progress placeholder.
 */

const CAREER_MILESTONE_IDS = new Set([
  'first_start',
  'first_podium',
  'first_win',
  'first_championship',
]);

const THRESHOLD_MILESTONE_IDS = new Set([
  'starts_100',
  'starts_200',
  'wins_10',
  'wins_25',
  'wins_50',
  'podiums_100',
]);

const MILESTONE_PREFIXES = [
  'series_champion_',
  'track_master_',
  'class_dominator_',
  'perfect_season_',
  'most_wins_',
];

export function isCareerMilestone(achievement) {
  if (!achievement || achievement.unlocked !== true) return false;
  const id = achievement.id || '';
  if (CAREER_MILESTONE_IDS.has(id) || THRESHOLD_MILESTONE_IDS.has(id)) return true;
  return MILESTONE_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export function selectCareerMilestones(achievements = [], limit = 12) {
  return (achievements || []).filter(isCareerMilestone).slice(0, limit);
}