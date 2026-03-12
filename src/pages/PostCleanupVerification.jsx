/**
 * PostCleanupVerification.jsx
 * 
 * Dedicated page for post-cleanup verification and bug burndown.
 * Pulls from buildBugBurndownReport and displays comprehensive status.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import DiagnosticsBugBurndown from '@/components/management/DiagnosticsBugBurndown';

export default function PostCleanupVerification() {
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  if (user?.role !== 'admin') {
    return (
      <ManagementLayout currentPage="PostCleanupVerification">
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-20 text-center"><p className="text-gray-600">This page is for administrators only.</p></div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="PostCleanupVerification">
      <ManagementShell 
        title="Post-Cleanup Verification & Bug Burn-Down" 
        subtitle="Real system verification pass — identify and track remaining issues before launch"
      >
        <DiagnosticsBugBurndown />
      </ManagementShell>
    </ManagementLayout>
  );
}