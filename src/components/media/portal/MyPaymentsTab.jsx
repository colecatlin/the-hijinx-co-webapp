import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DollarSign, ShieldOff } from 'lucide-react';
import PaymentStatusPanel from '@/components/media/payments/PaymentStatusPanel';
import MonetizationStatusBadges from '@/components/media/payments/MonetizationStatusBadges';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function MyPaymentsTab({ currentUser, myProfile }) {
  const profileId = myProfile?.id;

  const { data: paymentAccounts } = useQuery({
    queryKey: ['paymentAccount', 'media_profile', profileId],
    queryFn: () => base44.entities.PaymentAccount.filter({ owner_type: 'media_profile', owner_id: profileId }),
    enabled: !!profileId
  });
  const paymentAccount = paymentAccounts?.[0] || null;

  if (!myProfile) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-center">
        <ShieldOff className="w-8 h-8 text-gray-500" />
        <p className="text-gray-400 text-sm">Complete your contributor profile to access payment features.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 py-4">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-5 h-5 text-gray-300" />
        <h2 className="text-lg font-semibold text-white">Payments & Payouts</h2>
      </div>

      {/* Monetization Status */}
      <Card className="border border-gray-700 bg-gray-800/50">
        <CardHeader className="pb-2">
          <span className="text-sm font-medium text-white">Monetization Status</span>
          <p className="text-xs text-gray-400 mt-0.5">Eligibility flags are set by platform admins.</p>
        </CardHeader>
        <CardContent className="pt-0">
          <MonetizationStatusBadges profile={myProfile} paymentAccount={paymentAccount} />
        </CardContent>
      </Card>

      {/* Payout Account */}
      {myProfile.monetization_eligible ? (
        <PaymentStatusPanel ownerType="media_profile" ownerId={profileId} currentUser={currentUser} />
      ) : (
        <Card className="border border-gray-700 bg-gray-800/50">
          <CardContent className="py-6 text-center">
            <DollarSign className="w-6 h-6 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Payout setup is available once your account is approved for monetization.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}