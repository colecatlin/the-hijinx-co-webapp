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

export default function DriverSlugRedirect() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [racerProfileSlug, setRacerProfileSlug] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) { setChecking(false); return; }
      try {
        // Find the legacy Driver by canonical_slug or slug
        const byCanonical = await base44.entities.Driver.filter({ canonical_slug: slug }).catch(() => []);
        let driver = byCanonical?.[0];
        if (!driver) {
          const bySlug = await base44.entities.Driver.filter({ slug }).catch(() => []);
          driver = bySlug?.[0];
        }
        if (!driver) { setChecking(false); return; }

        // Find the RacerProfile linked to this Driver
        const rp = await resolveRacerProfileByLegacyDriverId(driver.id, { allowDraft: true });
        if (!cancelled && rp?.slug) {
          setRacerProfileSlug(rp.slug);
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

  // No RacerProfile found — render the legacy DriverProfile page
  // so existing bookmarks continue to work without breaking.
  return <DriverProfile />;
}