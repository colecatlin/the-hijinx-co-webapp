import React from 'react';
import MembershipPanel from '@/components/membership/MembershipPanel';
import SeoMeta from '@/components/system/seoMeta';

export default function Membership() {
  return (
    <>
      <SeoMeta title="Membership — Hijinx" description="Manage your Hijinx membership and subscription." />
      <MembershipPanel />
    </>
  );
}