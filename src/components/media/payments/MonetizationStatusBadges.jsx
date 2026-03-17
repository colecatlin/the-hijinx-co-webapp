import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

function StatusBit({ label, enabled, pending = false }) {
  const Icon = enabled ? CheckCircle2 : pending ? Clock : XCircle;
  const color = enabled ? 'text-green-400' : pending ? 'text-yellow-400' : 'text-gray-500';
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3 h-3 ${color}`} />
      <span className={`text-xs ${enabled ? 'text-gray-300' : 'text-gray-500'}`}>{label}</span>
    </div>
  );
}

export default function MonetizationStatusBadges({ profile, outlet, paymentAccount }) {
  if (profile) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <StatusBit label="Monetization Eligible" enabled={profile.monetization_eligible} />
        <StatusBit label="Creator Fund Eligible" enabled={profile.creator_fund_eligible} />
        <StatusBit label="Licensing Enabled" enabled={profile.licensing_eligible} />
        <StatusBit label="Merch Opt-In" enabled={profile.merch_opt_in} />
        <StatusBit label="Payout Ready" enabled={profile.payout_profile_ready} pending={paymentAccount?.account_status === 'onboarding_started' || paymentAccount?.account_status === 'pending_verification'} />
        <StatusBit label="Terms Accepted" enabled={profile.creator_terms_accepted} />
      </div>
    );
  }

  if (outlet) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <StatusBit label="Monetization Eligible" enabled={outlet.monetization_eligible} />
        <StatusBit label="Branded Partnerships" enabled={outlet.branded_partnership_eligible} />
        <StatusBit label="Licensing Partner" enabled={outlet.licensing_partner_eligible} />
        <StatusBit label="Payout Ready" enabled={paymentAccount?.account_status === 'active'} pending={['onboarding_started', 'pending_verification'].includes(paymentAccount?.account_status)} />
      </div>
    );
  }

  return null;
}