/**
 * auditTrackExperience
 * Phase 15 — Read-only integrity audit for Track experience data.
 * Validates references, exposure, and completeness. Never repairs.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  resolveTrack, isTrackPublic, loadTrackContext,
  getAllSeasonYears,
  type TrackContext,
} from '../../shared/trackExperienceHelpers.ts';

interface AuditIssue {
  severity: 'critical' | 'warning';
  category: string;
  message: string;
  track_id?: string;
  track_name?: string;
  ref_id?: string;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { slug, track_id, audit_all = false } = body;

    const issues: AuditIssue[] = [];

    if (audit_all) {
      // Audit all public tracks
      const allTracks = await base44.asServiceRole.entities.Track.list().catch(() => []);
      const liveTracks = (allTracks as any[]).filter((t: any) => !t.is_archived);
      const slugMap = new Map<string, string[]>();
      const nameMap = new Map<string, string[]>();

      for (const t of liveTracks) {
        const slug = t.slug || t.canonical_slug;
        if (slug) {
          if (!slugMap.has(slug)) slugMap.set(slug, []);
          slugMap.get(slug)!.push(t.id);
        }
        const normName = (t.name || '').toLowerCase().trim();
        if (normName) {
          if (!nameMap.has(normName)) nameMap.set(normName, []);
          nameMap.get(normName)!.push(t.id);
        }

        if (!t.slug && !t.canonical_slug) {
          issues.push({ severity: 'warning', category: 'missing_slug', message: 'Track has no slug or canonical_slug', track_id: t.id, track_name: t.name });
        }
        if (!t.latitude || !t.longitude) {
          issues.push({ severity: 'warning', category: 'missing_coordinates', message: 'Track has no coordinates', track_id: t.id, track_name: t.name });
        }
        if (!t.hero_image_url && !t.image_url) {
          issues.push({ severity: 'warning', category: 'missing_hero_image', message: 'Track has no hero or image URL', track_id: t.id, track_name: t.name });
        }
        if (!t.logo_url) {
          issues.push({ severity: 'warning', category: 'missing_logo', message: 'Track has no logo', track_id: t.id, track_name: t.name });
        }
        if (t.visibility_status === 'live' && t.is_archived) {
          issues.push({ severity: 'critical', category: 'archived_exposed', message: 'Archived track is marked as live (publicly visible)', track_id: t.id, track_name: t.name });
        }
      }

      // Duplicate slugs
      slugMap.forEach((ids, slug) => {
        if (ids.length > 1) {
          issues.push({ severity: 'critical', category: 'duplicate_slug', message: `Duplicate slug "${slug}" on ${ids.length} tracks`, ref_id: ids.join(',') });
        }
      });
      // Duplicate names
      nameMap.forEach((ids, name) => {
        if (ids.length > 1) {
          issues.push({ severity: 'warning', category: 'duplicate_name', message: `Duplicate track name "${name}" on ${ids.length} tracks`, ref_id: ids.join(',') });
        }
      });

      return Response.json({
        status: issues.length === 0 ? 'clean' : 'issues_found',
        total_checked: liveTracks.length,
        total_with_issues: new Set(issues.map(i => i.track_id).filter(Boolean)).size,
        total_issues: issues.length,
        issues,
        summary: {
          critical: issues.filter(i => i.severity === 'critical').length,
          warnings: issues.filter(i => i.severity === 'warning').length,
        },
      });
    }

    // Single track audit
    if (!slug && !track_id) return Response.json({ error: 'slug or track_id is required (or set audit_all=true)' }, { status: 400 });

    const track = await resolveTrack(base44, slug, track_id);
    if (!track) return Response.json({ error: 'Track not found' }, { status: 404 });

    // Basic checks
    if (!track.slug && !track.canonical_slug) {
      issues.push({ severity: 'warning', category: 'missing_slug', message: 'Track has no slug or canonical_slug — canonical URL cannot be generated', track_id: track.id, track_name: track.name });
    }
    if (!track.latitude || !track.longitude) {
      issues.push({ severity: 'warning', category: 'missing_coordinates', message: 'Track has no coordinates — map cannot be centered', track_id: track.id, track_name: track.name });
    }
    if (!track.hero_image_url && !track.image_url) {
      issues.push({ severity: 'warning', category: 'missing_hero_image', message: 'Track has no hero image or image URL', track_id: track.id, track_name: track.name });
    }
    if (!track.logo_url) {
      issues.push({ severity: 'warning', category: 'missing_logo', message: 'Track has no logo', track_id: track.id, track_name: track.name });
    }
    if (track.visibility_status === 'live' && track.is_archived) {
      issues.push({ severity: 'critical', category: 'archived_exposed', message: 'Archived track is marked as live — publicly exposed', track_id: track.id, track_name: track.name });
    }
    if (!isTrackPublic(track)) {
      issues.push({ severity: 'warning', category: 'not_public', message: 'Track is not publicly visible (visibility_status is not "live")', track_id: track.id, track_name: track.name });
    }

    // Load context for reference checks
    const ctx = await loadTrackContext(base44, track);

    // Broken Event references
    const brokenEvents = ctx.events.filter(e => !ctx.eventMap.has(e.id));
    if (brokenEvents.length > 0) {
      issues.push({ severity: 'warning', category: 'broken_event_ref', message: `${brokenEvents.length} events reference this track but could not be resolved`, track_id: track.id, track_name: track.name });
    }

    // Broken Series references
    const brokenSeries = ctx.events.filter(e => e.series_id && !ctx.seriesMap.has(e.series_id));
    if (brokenSeries.length > 0) {
      issues.push({ severity: 'warning', category: 'broken_series_ref', message: `${brokenSeries.length} events reference missing Series records`, track_id: track.id, track_name: track.name });
    }

    // Broken Results references
    const brokenResults = ctx.results.filter(r => !ctx.eventMap.has(r.event_id));
    if (brokenResults.length > 0) {
      issues.push({ severity: 'warning', category: 'broken_results_ref', message: `${brokenResults.length} results reference missing events`, track_id: track.id, track_name: track.name });
    }

    // Duplicate slug check across all tracks
    const slugVal = track.slug || track.canonical_slug;
    if (slugVal) {
      const allWithSlug = await base44.asServiceRole.entities.Track.filter({ slug: slugVal }).catch(() => []);
      const allWithCanonical = await base44.asServiceRole.entities.Track.filter({ canonical_slug: slugVal }).catch(() => []);
      const allIds = new Set([
        ...(allWithSlug as any[]).map((t: any) => t.id),
        ...(allWithCanonical as any[]).map((t: any) => t.id),
      ]);
      if (allIds.size > 1) {
        issues.push({ severity: 'critical', category: 'duplicate_slug', message: `Slug "${slugVal}" is used by ${allIds.size} tracks`, track_id: track.id, track_name: track.name, ref_id: Array.from(allIds).join(',') });
      }
    }

    return Response.json({
      status: issues.length === 0 ? 'clean' : 'issues_found',
      total_checked: 1,
      total_with_issues: issues.length > 0 ? 1 : 0,
      total_issues: issues.length,
      issues,
      summary: {
        critical: issues.filter(i => i.severity === 'critical').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
      },
    });
  } catch (err) {
    console.error('[auditTrackExperience] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}