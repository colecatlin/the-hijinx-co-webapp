import React from 'react';
import { Radio } from 'lucide-react';
import RacerSectionHeading from '@/components/racerprofile/RacerSectionHeading';

/**
 * LatestFromRacer — permanent placement of the human/activity layer of the
 * profile, reserved HIGH in the Overview sequence.
 *
 * THIS IMPLEMENTATION IS A PLACEHOLDER ONLY. No social integration exists or
 * is planned here: no X/Twitter API, no OAuth, no scraping, no synchronisation,
 * no native posting, no social entities and no background jobs. When a real
 * activity source is added later, it replaces the body of this component.
 */
export default function LatestFromRacer({ racerName }) {
  const title = racerName ? `Latest from ${racerName}` : 'Latest';
  return (
    <section>
      <RacerSectionHeading label="Activity" title={title} />
      <div className="border border-divider bg-surface-elevated px-6 py-10 text-center">
        <Radio className="w-4 h-4 text-motion mx-auto mb-3" />
        <p className="text-sm leading-relaxed text-foreground-secondary max-w-md mx-auto">
          Race-day notes, paddock photography and updates from this racer will appear here.
        </p>
      </div>
    </section>
  );
}