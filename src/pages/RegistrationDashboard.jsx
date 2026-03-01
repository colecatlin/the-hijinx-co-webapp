import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { BurnoutSpinner } from '@/components/shared/BurnoutSpinner';
import { motion } from 'framer-motion';

export default function RegistrationDashboard() {
  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (authLoading === false && !isAuthenticated) {
      base44.auth.redirectToLogin();
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading || userLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-screen">
          <BurnoutSpinner />
        </div>
      </PageShell>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black mb-2">Registration Dashboard</h1>
          <p className="text-gray-600">
            Welcome, {user.full_name}. Manage your racing profile and registrations.
          </p>
        </motion.div>

        {/* Dashboard Content - Role Based */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-lg p-8"
        >
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Dashboard Sections Coming Soon</h2>
            <p className="text-gray-600">
              Role: <span className="font-semibold capitalize">{user.role}</span>
            </p>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
}