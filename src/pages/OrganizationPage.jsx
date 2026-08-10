import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertTriangle } from 'lucide-react';
import { isSupportedType, getOrganizationType } from '@/config/organizationRegistry';
import { getOrganizationRecord, getSettings, ensureSettings, listMembers, listAssets, requestAccess, userHasRelationship } from '@/components/organizations/organizationService';
import OrganizationLayout from '@/components/organizations/OrganizationLayout';
import OrganizationHeader from '@/components/organizations/OrganizationHeader';
import OrganizationOverview from '@/components/organizations/OrganizationOverview';
import OrganizationPeople from '@/components/organizations/OrganizationPeople';
import OrganizationAssets from '@/components/organizations/OrganizationAssets';
import OrganizationRelationships from '@/components/organizations/OrganizationRelationships';
import OrganizationActivity from '@/components/organizations/OrganizationActivity';
import OrganizationSettings from '@/components/organizations/OrganizationSettings';
import OrganizationDashboard from '@/components/organizations/OrganizationDashboard';
import SponsorProfile from '@/pages/SponsorProfile';

/**
 * OrganizationPage — the single route that serves every organization. Derives
 * the record, settings, members, and assets from the registry + services, then
 * renders the shared layout with the active section. No type-specific code.
 */
export default function OrganizationPage() {
  const { entityType: type, entityId, section = 'overview' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const supported = isSupportedType(type);

  const recordQ = useQuery({
    queryKey: ['org_record', type, entityId],
    queryFn: () => getOrganizationRecord(type, entityId),
    enabled: supported,
  });
  const settingsQ = useQuery({
    queryKey: ['org_settings', type, entityId],
    queryFn: async () => (await getSettings(type, entityId)) || (await ensureSettings(type, entityId)),
    enabled: supported,
  });
  const membersQ = useQuery({
    queryKey: ['org_members', type, entityId],
    queryFn: () => listMembers(type, entityId),
    enabled: supported,
  });
  const userQ = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const assetsQ = useQuery({
    queryKey: ['org_assets', type, entityId],
    queryFn: () => listAssets(type, entityId),
    enabled: supported,
  });

  const [joining, setJoining] = useState(false);

  const members = membersQ.data || [];
  const settings = settingsQ.data || null;
  const record = recordQ.data || null;
  const assets = assetsQ.data || [];
  const user = userQ.data || null;

  const isMember = useMemo(() => userHasRelationship(members, user?.id), [members, user?.id]);
  const isAdmin = useMemo(
    () => user?.role === 'admin' || members.some((m) => m.user_id === user?.id && m.status === 'approved' && m.permission_level === 'admin'),
    [members, user],
  );

  // Handle ?join=1 deep link: submit a request for the current user, then clear.
  useEffect(() => {
    if (params.get('join') === '1' && user && settings && !joining && !isMember) {
      (async () => {
        setJoining(true);
        try { await requestAccess(type, entityId, settings, 'Joined via invite link.'); }
        finally { setJoining(false); navigate(`/organization/${type}/${entityId}`, { replace: true }); }
        qc.invalidateQueries({ queryKey: ['org_members', type, entityId] });
      })();
    }
  }, [params, user, settings, isMember]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['org_members', type, entityId] });
    qc.invalidateQueries({ queryKey: ['org_settings', type, entityId] });
    qc.invalidateQueries({ queryKey: ['org_assets', type, entityId] });
  };

  const onJoin = async () => {
    setJoining(true);
    try { await requestAccess(type, entityId, settings, 'Requested from organization page.'); qc.invalidateQueries({ queryKey: ['org_members', type, entityId] }); }
    finally { setJoining(false); }
  };

  if (!supported) {
    return <Centered><AlertTriangle className="w-6 h-6 mb-2" style={{ color: '#ef4444' }} /><p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Unsupported organization type: {type}</p></Centered>;
  }
  if (recordQ.isLoading || settingsQ.isLoading || membersQ.isLoading) {
    return <Centered><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#1DA1A1' }} /></Centered>;
  }
  if (recordQ.error || !record) {
    return <Centered><AlertTriangle className="w-6 h-6 mb-2" style={{ color: '#ef4444' }} /><p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Organization not found.</p></Centered>;
  }

  // Phase 17E: Sponsor type renders the dedicated public Sponsor experience.
  if (type === 'Sponsor') {
    return <SponsorProfile />;
  }

  const stats = {
    approvedCount: members.filter((m) => m.status === 'approved').length,
    pendingCount: members.filter((m) => m.status === 'pending').length,
    assetCount: assets.length,
  };

  const header = (
    <OrganizationHeader
      orgType={type}
      record={record}
      settings={settings}
      stats={stats}
      isMember={isMember}
      onJoin={onJoin}
      joining={joining}
    />
  );

  const spec = getOrganizationType(type);
  const content =
    section === 'overview' ? <OrganizationOverview orgType={type} record={record} settings={settings} members={members} assets={assets} /> :
    section === 'people' ? <OrganizationPeople orgType={type} entityId={entityId} members={members} isAdmin={isAdmin} currentUser={user} onMutated={invalidateAll} /> :
    section === 'assets' ? <OrganizationAssets orgType={type} entityId={entityId} /> :
    section === 'relationships' ? <OrganizationRelationships orgType={type} entityId={entityId} members={members} /> :
    section === 'activity' ? <OrganizationActivity members={members} assets={assets} /> :
    section === 'settings' ? <OrganizationSettings orgType={type} entityId={entityId} settings={settings} record={record} isAdmin={isAdmin} onSaved={invalidateAll} /> :
    <OrganizationOverview orgType={type} record={record} settings={settings} members={members} assets={assets} />;

  // Dashboard lives at the overview section for members/admins; public viewers
  // also see overview. The reusable OrganizationDashboard is shown to members.
  return (
    <OrganizationLayout orgType={type} entityId={entityId} header={header}>
      {section === 'overview' && isAdmin ? (
        <>
          <div className="mb-4">
            <OrganizationDashboard orgType={type} entityId={entityId} members={members} assets={assets} settings={settings} />
          </div>
          <div className="pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Profile</h3>
            {content}
          </div>
        </>
      ) : content}
    </OrganizationLayout>
  );
}

function Centered({ children }) {
  return <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center">{children}</div>;
}