import React from 'react';
import { Award } from 'lucide-react';

export default function SeriesSponsors({ sponsors }) {
  if (!sponsors || (!sponsors.all_sponsors || sponsors.all_sponsors.length === 0)) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-motion" />
          <h2 className="text-xl font-bold text-foreground">Sponsors</h2>
        </div>
        <p className="text-foreground-quiet text-sm">No sponsor information available.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-4 h-4 text-motion" />
        <h2 className="text-xl font-bold text-foreground">Sponsors</h2>
      </div>

      {sponsors.title_sponsor && (
        <div className="mb-6 p-4 border border-motion/30 bg-motion/5 rounded-lg">
          <div className="text-xs text-foreground-quiet uppercase tracking-widest mb-2">Title Sponsor</div>
          <div className="flex items-center gap-3">
            {sponsors.title_sponsor.logo_url && (
              <img src={sponsors.title_sponsor.logo_url} alt={sponsors.title_sponsor.sponsor_name} className="h-8 object-contain" />
            )}
            <div>
              <div className="font-bold text-foreground">{sponsors.title_sponsor.sponsor_name}</div>
              {sponsors.title_sponsor.sponsor_url && (
                <a href={sponsors.title_sponsor.sponsor_url} target="_blank" rel="noopener noreferrer" className="text-xs text-motion hover:text-motion-hover">Visit website →</a>
              )}
            </div>
          </div>
        </div>
      )}

      {sponsors.all_sponsors.filter(s => !s.is_primary).length > 0 && (
        <div>
          <div className="text-xs text-foreground-quiet uppercase tracking-widest mb-3">Partners</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sponsors.all_sponsors.filter(s => !s.is_primary).map((sponsor, idx) => (
              <div key={idx} className="border border-divider rounded-lg p-3 flex items-center gap-2">
                {sponsor.logo_url && (
                  <img src={sponsor.logo_url} alt={sponsor.sponsor_name} className="h-6 object-contain flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{sponsor.sponsor_name}</div>
                  {sponsor.entries_count > 0 && <div className="text-xs text-foreground-quiet">{sponsor.entries_count} entries</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}