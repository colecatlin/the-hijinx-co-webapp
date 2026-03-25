import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

// FinalCTASection — closing call to action
export default function FinalCTASection() {
  return (
    <section data-section="final-cta">
      <div data-block="content">
        <h2>Join the HIJINX ecosystem.</h2>
        <p>Drivers, teams, tracks, series, and media — all in one place.</p>
        <div data-block="actions">
          <Link to={createPageUrl('MotorsportsHome')} data-action="explore">Explore Motorsports</Link>
          <Link to={createPageUrl('MediaHome')} data-action="media">Media Portal</Link>
        </div>
      </div>
    </section>
  );
}