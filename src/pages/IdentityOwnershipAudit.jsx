/**
 * IdentityOwnershipAudit.jsx
 *
 * Phase 8 — Admin page showing the read-only ownership audit.
 * Covers: user ownership, claim integrity, permission integrity,
 * Driver retirement readiness, and remaining Driver dependencies.
 *
 * Route: /racecore/identity-ownership (inside RaceCoreLayout)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { runIdentityOwnershipAudit } from '@/components/identity/identityOwnershipApi';
import RaceCorePageShell from '@/components/racecore/RaceCorePageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Users, AlertTriangle, FileBarChart, RefreshCw } from 'lucide-react';

export default function IdentityOwnershipAudit() {
  const [forceFetch, setForceFetch] = useState(0);
  const { data: audit, isLoading } = useQuery({
    queryKey: ['identityOwnershipAudit', forceFetch],
    queryFn: () => runIdentityOwnershipAudit(),
    staleTime: 60 * 1000,
  });

  const readiness = audit?.retirement_readiness_score ?? 0;
  const readinessColor = readiness >= 75 ? 'text-teal-600' : readiness >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <RaceCorePageShell
      title="Identity Ownership Audit"
      subtitle="User → PersonIdentity ownership, claim integrity, and Driver retirement readiness"
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">Read-only audit. No records are modified.</p>
        <Button variant="outline" size="sm" onClick={() => setForceFetch((f) => f + 1)}>
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !audit ? (
        <Card><CardContent className="py-8 text-center text-gray-400">Failed to load audit. Ensure you are an admin.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {/* Readiness score */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><FileBarChart className="w-4 h-4" /> Driver Retirement Readiness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className={`text-5xl font-black ${readinessColor}`}>{readiness}%</div>
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <ReadinessBar label="Identity Coverage" value={audit.readiness_breakdown?.identity_coverage_pct ?? 0} />
                  <ReadinessBar label="Ops Modern Linkage" value={audit.readiness_breakdown?.operational_modern_linkage_pct ?? 0} />
                  <ReadinessBar label="Collaborator Migration" value={audit.readiness_breakdown?.collaborator_migration_pct ?? 0} />
                  <ReadinessBar label="RacerProfile Coverage" value={audit.readiness_breakdown?.racer_profile_coverage_pct ?? 0} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Identities" value={audit.summary?.total_identities ?? 0} />
            <StatCard icon={ShieldCheck} label="Claimed" value={audit.user_ownership?.claimed ?? 0} accent="teal" />
            <StatCard icon={AlertTriangle} label="Pending" value={audit.user_ownership?.pending ?? 0} accent="amber" />
            <StatCard icon={Users} label="Drivers (legacy)" value={audit.summary?.total_drivers ?? 0} accent="gray" />
          </div>

          {/* User ownership */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">User Ownership Coverage</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Mini label="Claimed" value={audit.user_ownership?.claimed ?? 0} />
                <Mini label="Pending" value={audit.user_ownership?.pending ?? 0} />
                <Mini label="Rejected" value={audit.user_ownership?.rejected ?? 0} />
                <Mini label="Unclaimed" value={audit.user_ownership?.unclaimed ?? 0} />
                <Mini label="Users w/ ownership" value={audit.summary?.users_with_ownership ?? 0} />
                <Mini label="Users w/o ownership" value={audit.summary?.users_without_ownership ?? 0} />
              </div>
              {audit.user_ownership?.multi_ownership_cases?.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-2">
                  <div className="font-semibold text-amber-800 mb-1">Multi-ownership cases (review)</div>
                  {audit.user_ownership.multi_ownership_cases.map((c) => (
                    <div key={c.userId} className="text-amber-700">User {c.userId}: {c.count} identities</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Claim integrity */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Claim Integrity</CardTitle></CardHeader>
            <CardContent className="text-xs">
              {audit.claim_integrity?.issue_count === 0 ? (
                <Badge className="bg-teal-50 text-teal-700 border-teal-200">No integrity issues detected</Badge>
              ) : (
                <div className="space-y-1">
                  <div className="font-semibold text-red-700">{audit.claim_integrity?.issue_count} issue(s)</div>
                  {audit.claim_integrity?.issues?.map((iss, i) => (
                    <div key={i} className="text-red-600">{iss.identityId}: {iss.issue}</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* RacerProfile linkage */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">RacerProfile ↔ PersonIdentity Linkage</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Mini label="Without identity" value={audit.racer_profile_linkage?.without_identity ?? 0} />
                <Mini label="Claimed via identity" value={audit.racer_profile_linkage?.claimed_via_identity ?? 0} />
                <Mini label="Flag mismatches" value={audit.racer_profile_linkage?.claim_flag_mismatches?.length ?? 0} />
              </div>
              {audit.racer_profile_linkage?.claim_flag_mismatches?.length > 0 && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                  <div className="font-semibold text-amber-800 mb-1">is_claimed flag mismatches (sync needed)</div>
                  {audit.racer_profile_linkage.claim_flag_mismatches.slice(0, 10).map((m) => (
                    <div key={m.racerProfileId} className="text-amber-700">{m.racerProfileId}: is_claimed={String(m.is_claimed)} expected={String(m.expected)}</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collaborator migration */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">EntityCollaborator Migration</CardTitle></CardHeader>
            <CardContent className="text-xs">
              <div className="grid grid-cols-3 gap-3">
                <Mini label="Driver-type" value={audit.collaborator_migration?.driver_type_collaborators ?? 0} />
                <Mini label="With legacy Driver" value={audit.collaborator_migration?.with_legacy_driver ?? 0} />
                <Mini label="Without RacerProfile" value={audit.collaborator_migration?.without_racer_profile ?? 0} />
              </div>
            </CardContent>
          </Card>

          {/* Driver retirement */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Driver Retirement Status</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Mini label="Drivers w/ RacerProfile" value={audit.driver_retirement?.drivers_with_racer_profile ?? 0} />
                <Mini label="Drivers w/o RacerProfile" value={audit.driver_retirement?.drivers_without_racer_profile ?? 0} />
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="font-semibold text-gray-600 mb-2">Operational Records Linkage</div>
                <div className="grid grid-cols-3 gap-3">
                  <Mini label="Entries (driver_id)" value={audit.driver_retirement?.operational_records?.entries?.with_driver_id ?? 0} />
                  <Mini label="Results (driver_id)" value={audit.driver_retirement?.operational_records?.results?.with_driver_id ?? 0} />
                  <Mini label="Standings (driver_id)" value={audit.driver_retirement?.operational_records?.standings?.with_driver_id ?? 0} />
                  <Mini label="Entries (participation)" value={audit.driver_retirement?.operational_records?.entries?.with_participation_id ?? 0} />
                  <Mini label="Results (entry_id)" value={audit.driver_retirement?.operational_records?.results?.with_entry_id ?? 0} />
                  <Mini label="Standings (participation)" value={audit.driver_retirement?.operational_records?.standings?.with_participation_id ?? 0} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </RaceCorePageShell>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  const colorMap = { teal: 'text-teal-600', amber: 'text-amber-600', gray: 'text-gray-500' };
  const color = colorMap[accent] || 'text-gray-800';
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
        </div>
        <div className={`text-2xl font-black ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Mini({ label, value }) {
  return (
    <div className="bg-gray-50 rounded p-2">
      <div className="text-gray-400 uppercase tracking-wide mb-0.5" style={{ fontSize: '10px' }}>{label}</div>
      <div className="font-bold text-gray-700">{value}</div>
    </div>
  );
}

function ReadinessBar({ label, value }) {
  const color = value >= 75 ? 'bg-teal-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-bold text-gray-700">{value}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}