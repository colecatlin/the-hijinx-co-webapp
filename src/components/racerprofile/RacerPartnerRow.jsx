import React from 'react';
import { ExternalLink } from 'lucide-react';
import { formatPartnerTier } from './racerPartners';

/**
 * RacerPartnerRow — one partner relationship, presented editorially.
 *
 * Shows the partner, its mark, the relationship level where meaningful, a
 * primary marker where the source records one, season context where already
 * available, and the partner's own public URL. Internal sponsorship status
 * wording is deliberately absent.
 */
export default function RacerPartnerRow({ partner }) {
  if (!partner?.name) return null;

  const tierLabel = formatPartnerTier(partner.tier);

  return (
    <div className="flex items-center gap-5 border-b border-divider py-5 last:border-0">
      {partner.logo ? (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center border border-divider bg-surface-elevated p-2">
          <img
            src={partner.logo}
            alt={partner.name}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center border border-divider bg-surface-elevated">
          <span className="font-mono text-[10px] tracking-[0.2em] text-foreground-quiet">
            {partner.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="truncate text-base font-bold text-foreground">{partner.name}</span>
          {partner.primary && (
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-motion">Primary</span>
          )}
          {tierLabel && <span className="text-xs text-foreground-quiet">{tierLabel}</span>}
        </div>
        {partner.season && <div className="mt-1 font-mono text-xs text-foreground-secondary">{partner.season}</div>}
      </div>

      {partner.url && (
        <a
          href={partner.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${partner.name} website`}
          className="flex-shrink-0 text-foreground-quiet transition-colors hover:text-motion"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}