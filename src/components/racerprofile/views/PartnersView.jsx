import React from 'react';
import RacerSectionHeading from '@/components/racerprofile/RacerSectionHeading';
import RacerPartnerRow from '@/components/racerprofile/RacerPartnerRow';
import { resolveCurrentPartners, resolvePreviousPartners } from '@/components/racerprofile/racerPartners';

/**
 * PartnersView — current and past partner relationships.
 *
 * Current vs past is decided from the server-split, already-public lists;
 * internal sponsorship status wording is never displayed. No activation
 * imagery and no new partner-media relationships are introduced.
 */
export default function PartnersView({ sponsorships = [], sponsorPresentation = null }) {
  const current = resolveCurrentPartners(sponsorships, sponsorPresentation);
  const previous = resolvePreviousPartners(sponsorPresentation);

  if (current.length === 0 && previous.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <RacerSectionHeading label="Support" title="Partners" />
        <p className="text-sm text-foreground-secondary">
          No partner relationships are published for this racer yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6">
      {current.length > 0 && (
        <section>
          <RacerSectionHeading label="Support" title="Partners" />
          <div>
            {current.map((partner) => (
              <RacerPartnerRow key={`${partner.name}-${partner.season || ''}`} partner={partner} />
            ))}
          </div>
        </section>
      )}

      {previous.length > 0 && (
        <section>
          <RacerSectionHeading label="Archive" title="Previous Partners" />
          <div>
            {previous.map((partner) => (
              <RacerPartnerRow key={`${partner.name}-${partner.season || ''}`} partner={partner} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}