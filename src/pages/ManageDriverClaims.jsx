import React from 'react';
import AdminAccessDenied from '@/components/shared/AdminAccessDenied';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import RaceClaimsReview from '@/components/management/RaceClaimsReview';

/**
 * ManageDriverClaims — standalone "Claims" page.
 * The review logic itself lives in the shared RaceClaimsReview component, which
 * is also segmented as a tab inside Manage Access so all approval work happens
 * in one place. This page is kept for backward-compatible direct links.
 */
export default function ManageDriverClaims({ embedded = false }) {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  if (userLoading) return null;
  if (!user) { base44.auth.redirectToLogin(); return null; }
  if (!isAdmin) {
    return (
      <ManagementLayout currentPage="ManageDriverClaims" embedded={embedded}>
        <AdminAccessDenied />
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="ManageDriverClaims" embedded={embedded}>
      <ManagementShell title="Claims" subtitle="Review and verify driver-submitted race results">
        <RaceClaimsReview />
      </ManagementShell>
    </ManagementLayout>
  );
}