/**
 * DriverSlugRedirect.jsx
 *
 * Phase 7 — Permanent compatibility redirect from /drivers/:slug to
 * /racers/:slug. Resolves the legacy Driver by canonical_slug or slug,
 * finds the corresponding RacerProfile via legacy_driver_id, and
 * redirects to the canonical /racers/:slug route.
 *
 * If no RacerProfile is found, renders the legacy DriverProfile page
 * unchanged so no existing bookmark breaks.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { resolveRacerProfileByLegacyDriverId } from '@/components/racerprofile/publicRacerProfileApi';
import DriverProfile from '@/pages/DriverProfile';

// Production Hardening — log redirect usage for observability
async function logRedirect(slug, driverId, racerProfileSlug, resolved) {
  try {
    await base44.functions.invoke('logActivityFeedItem', {
      type: 'platform_health_monitor',
      title: 'driver_redirect_usage',
      description: resolved
        ? `Redirect /drivers/${slug} → /racers/${racerProfileSlug}`
        : `Redirect /drivers/${slug} → legacy fallback (no RacerProfile)`,
      entity_type: 'Driver',
      entity_id: driverId || null,
      metadata: { monitor_event: 'driver_redirect_usage', slug, racer_profile_slug: racerProfileSlug, resolved },
    });
  } catch {
    // Non-critical — monitoring must not break redirects
  }
}

export default function DriverSlugRedirect() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [racerProfileSlug, setRacerProfileSlug] = useState(null);
  const [legacyFallback, setLegacyFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) { setChecking(false); return; }
      try {
        // Server-side resolution: the legacy Driver record is not readable by
        // public clients (it carries date of birth and contact email), so the
        // lookup happens in the backend and only the routing answer comes back.
        const response = await base44.functions.invoke('resolveLegacyDriverRoute', { slug });
        const result = response?.data || {};
        if (!cancelled) {
          if (result.racer_profile_slug) setRacerProfileSlug(result.racer_profile_slug);
          setLegacyFallback(!!result.found && result.public === true && !result.racer_profile_slug);
        }
      } catch (_) {
        // ignore — fall through to legacy page
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (racerProfileSlug) {
      navigate(`/racers/${encodeURIComponent(racerProfileSlug)}`, { replace: true });
    }
  }, [racerProfileSlug, navigate]);

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  // No canonical RacerProfile publicly available — render the legacy
  // DriverProfile page only for the admin-preview case, so a draft racer
  // never becomes visible through the old route.
  if (legacyFallback) return <DriverProfile />;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center">
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-motion">Not Found</p>
        <h1 className="mt-3 text-2xl font-black text-foreground">This racer page isn’t available</h1>
        <p className="mt-2 text-sm text-foreground-secondary">
          The racer may not have been published yet, or the address has changed.
        </p>
      </div>
    </div>
  );
}