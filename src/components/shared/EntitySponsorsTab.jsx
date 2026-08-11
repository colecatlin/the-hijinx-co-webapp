import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Handshake, ExternalLink } from 'lucide-react';

/**
 * EntitySponsorsTab — displays sponsors for any entity that can be sponsored.
 * Queries Sponsorship records by target_entity_type + target_entity_id,
 * then fetches the Organization (sponsor) for each active sponsorship.
 *
 * Reused on Team, Track, Event, and Vehicle profiles.
 */
export default function EntitySponsorsTab({ targetEntityType, targetEntityId }) {
  const { data: sponsorships, isLoading } = useQuery({
    queryKey: ['entitySponsors', targetEntityType, targetEntityId],
    queryFn: async () => {
      const all = await base44.entities.Sponsorship.list('-created_date', 200);
      return all.filter(s =>
        s.target_entity_type === targetEntityType &&
        s.target_entity_id === targetEntityId &&
        !s.is_archived &&
        ['active', 'completed'].includes(s.status)
      );
    },
    enabled: !!targetEntityType && !!targetEntityId,
  });

  const sponsorOrgIds = (sponsorships || []).map(s => s.sponsor_organization_id).filter(Boolean);
  const uniqueOrgIds = [...new Set(sponsorOrgIds)];

  const { data: sponsorOrgs } = useQuery({
    queryKey: ['sponsorOrgs', uniqueOrgIds.join(',')],
    queryFn: async () => {
      const orgs = await Promise.all(
        uniqueOrgIds.map(id => base44.entities.Organization.get(id).catch(() => null))
      );
      return orgs.filter(Boolean);
    },
    enabled: uniqueOrgIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Handshake className="w-4 h-4 text-motion" />
          <h2 className="text-xl font-bold text-foreground">Sponsors</h2>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-surface-interactive rounded-lg" />)}
        </div>
      </div>
    );
  }

  const sponsors = sponsorOrgs || [];
  const activeSponsorships = sponsorships || [];

  if (sponsors.length === 0 && activeSponsorships.length === 0) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Handshake className="w-4 h-4 text-motion" />
          <h2 className="text-xl font-bold text-foreground">Sponsors</h2>
        </div>
        <p className="text-sm text-foreground-quiet">No sponsor information available.</p>
      </div>
    );
  }

  // Map org ID → sponsorships for that org
  const orgSponsorshipMap = {};
  activeSponsorships.forEach(s => {
    if (!orgSponsorshipMap[s.sponsor_organization_id]) orgSponsorshipMap[s.sponsor_organization_id] = [];
    orgSponsorshipMap[s.sponsor_organization_id].push(s);
  });

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Handshake className="w-4 h-4 text-motion" />
        <h2 className="text-xl font-bold text-foreground">Sponsors</h2>
        <span className="text-sm text-foreground-quiet">({sponsors.length})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sponsors.map(org => {
          const orgSponsorships = orgSponsorshipMap[org.id] || [];
          const tier = orgSponsorships[0]?.tier;
          const relationshipType = orgSponsorships[0]?.relationship_type || 'Sponsor';
          const profileUrl = `/organization/Sponsor/${org.id}`;
          return (
            <Link
              key={org.id}
              to={profileUrl}
              className="border border-divider rounded-lg p-4 hover:border-motion/40 transition-colors group flex items-center gap-3"
            >
              {org.logo_url ? (
                <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-motion/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-black text-motion">{org.name?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground group-hover:text-motion transition-colors truncate">{org.name}</div>
                <div className="text-xs text-foreground-quiet flex items-center gap-2">
                  {tier && <span className="font-mono uppercase">{tier}</span>}
                  {org.industry && <span className="truncate">· {org.industry}</span>}
                </div>
                {org.website_url && (
                  <div className="text-[10px] text-foreground-quiet mt-0.5 flex items-center gap-1 truncate">
                    <ExternalLink className="w-2.5 h-2.5" />{org.website_url.replace(/^https?:\/\//, '').split('/')[0]}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}