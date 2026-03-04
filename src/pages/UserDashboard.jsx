import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import UserDashboardHome from '@/components/userdashboard/UserDashboardHome';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import { ShieldAlert } from 'lucide-react';

export default function UserDashboard() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <BurnoutSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-yellow-500 mx-auto" />
          <p className="text-white font-semibold">You must be logged in to view your dashboard.</p>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return <UserDashboardHome user={user} />;
}