import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { ShieldOff } from 'lucide-react';

/**
 * AdminGuard — standardizes the repeated `user.role === 'admin'` frontend check.
 *
 * This is a UX/router consistency helper ONLY. It does NOT replace or weaken
 * backend RLS, which remains the authoritative permission enforcement layer.
 *
 * Usage:
 *   <AdminGuard><PageContent /></AdminGuard>
 *
 * Renders a loading spinner while the session resolves, redirects unauthenticated
 * users to login, and shows an Access Denied state for non-admins.
 */
export default function AdminGuard({ children }) {
  const navigate = useNavigate();
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-divider border-t-motion rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    base44.auth.redirectToLogin(window.location.href);
    return null;
  }

  if (user.role !== 'admin') {
    return (
      <div className="py-24 flex flex-col items-center gap-4 text-center">
        <ShieldOff className="w-10 h-10 text-foreground-quiet" />
        <p className="text-foreground-secondary font-medium">Access denied</p>
        <p className="text-foreground-quiet text-sm max-w-sm">
          You do not currently have permission to access this area.
        </p>
        <Button size="sm" onClick={() => navigate(createPageUrl('MyDashboard'))}>
          Go to My Dashboard
        </Button>
      </div>
    );
  }

  return children;
}