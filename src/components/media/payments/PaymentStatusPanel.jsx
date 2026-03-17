import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, CheckCircle2, Clock, AlertTriangle, ExternalLink, DollarSign, RefreshCw, TrendingUp } from 'lucide-react';

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-600', icon: Clock },
  onboarding_started: { label: 'Onboarding In Progress', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  pending_verification: { label: 'Pending Verification', color: 'bg-blue-100 text-blue-700', icon: Clock },
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  restricted: { label: 'Restricted', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  disabled: { label: 'Disabled', color: 'bg-gray-200 text-gray-500', icon: AlertTriangle }
};

export default function PaymentStatusPanel({ ownerType, ownerId, currentUser }) {
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const qc = useQueryClient();

  const { data: paymentAccounts, isLoading } = useQuery({
    queryKey: ['paymentAccount', ownerType, ownerId],
    queryFn: () => base44.entities.PaymentAccount.filter({ owner_type: ownerType, owner_id: ownerId }),
    enabled: !!ownerId
  });

  const paymentAccount = paymentAccounts && paymentAccounts.length > 0 ? paymentAccounts[0] : null;

  const { data: payoutRecords } = useQuery({
    queryKey: ['payoutRecords', ownerType, ownerId],
    queryFn: () => base44.entities.PayoutRecord.filter({ payout_recipient_type: ownerType, payout_recipient_id: ownerId }, '-created_date', 10),
    enabled: !!ownerId
  });

  const { data: revenueEvents } = useQuery({
    queryKey: ['revenueEvents', ownerType, ownerId],
    queryFn: async () => {
      if (ownerType === 'media_profile') {
        // Get profile's linked events via payout records
        return [];
      }
      return [];
    },
    enabled: false
  });

  const handleStartOnboarding = async () => {
    setOnboardingLoading(true);
    try {
      // First ensure account exists
      if (!paymentAccount?.stripe_connected_account_id) {
        await base44.functions.invoke('createOrGetStripeConnectedAccount', { ownerType, ownerId });
      }
      const res = await base44.functions.invoke('startStripeOnboarding', {
        ownerType,
        ownerId,
        returnUrl: window.location.href,
        refreshUrl: window.location.href
      });
      if (res.data?.onboarding_url) {
        window.open(res.data.onboarding_url, '_blank');
      }
      qc.invalidateQueries({ queryKey: ['paymentAccount', ownerType, ownerId] });
    } catch (e) {
      console.error(e);
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      await base44.functions.invoke('syncStripeAccountStatus', { ownerType, ownerId });
      qc.invalidateQueries({ queryKey: ['paymentAccount', ownerType, ownerId] });
    } catch (e) {
      console.error(e);
    } finally {
      setSyncLoading(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center gap-2 text-gray-400 py-4">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">Loading payment status...</span>
    </div>
  );

  const status = paymentAccount?.account_status || 'not_started';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  const Icon = cfg.icon;

  const pendingPayouts = (payoutRecords || []).filter(p => ['pending', 'approved', 'processing'].includes(p.status));
  const completedPayouts = (payoutRecords || []).filter(p => p.status === 'paid');
  const totalPending = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = completedPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Payout Account Status */}
      <Card className="border border-gray-700 bg-gray-800/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white">Payout Account</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </span>
              {paymentAccount?.stripe_connected_account_id && (
                <button onClick={handleSync} disabled={syncLoading} className="text-gray-400 hover:text-white transition-colors">
                  <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {status === 'not_started' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Set up your payout account to receive payments for assignments, licensing, and creator fund awards.</p>
              <Button size="sm" onClick={handleStartOnboarding} disabled={onboardingLoading} className="bg-white text-black hover:bg-gray-100">
                {onboardingLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Set Up Payout Account
              </Button>
            </div>
          )}
          {status === 'onboarding_started' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Your onboarding is in progress. Complete the Stripe setup to enable payouts.</p>
              <Button size="sm" onClick={handleStartOnboarding} disabled={onboardingLoading} variant="outline" className="border-gray-600 text-gray-300">
                <ExternalLink className="w-3 h-3 mr-1" />
                Continue Onboarding
              </Button>
            </div>
          )}
          {status === 'pending_verification' && (
            <p className="text-xs text-gray-400">Your account is submitted and under review by Stripe. This typically takes 1–2 business days.</p>
          )}
          {status === 'active' && (
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-300">Payouts enabled — you can receive payments.</span>
            </div>
          )}
          {status === 'restricted' && (
            <div className="space-y-2">
              <p className="text-xs text-red-300">Your Stripe account has restrictions. Complete any outstanding requirements.</p>
              <Button size="sm" onClick={handleStartOnboarding} disabled={onboardingLoading} variant="outline" className="border-red-500 text-red-400">
                <ExternalLink className="w-3 h-3 mr-1" />
                Resolve Issues
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Summary */}
      {(payoutRecords && payoutRecords.length > 0) && (
        <Card className="border border-gray-700 bg-gray-800/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white">Payout Summary</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-lg font-bold text-white">${(totalPending / 100).toFixed(2)}</div>
                <div className="text-xs text-gray-400">{pendingPayouts.length} pending payout{pendingPayouts.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-lg font-bold text-green-400">${(totalPaid / 100).toFixed(2)}</div>
                <div className="text-xs text-gray-400">{completedPayouts.length} paid</div>
              </div>
            </div>

            {/* Recent payouts */}
            <div className="space-y-1.5">
              {(payoutRecords || []).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-700 last:border-0">
                  <div className="text-xs text-gray-300 capitalize">{p.notes || p.payout_recipient_type}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">${(p.amount / 100).toFixed(2)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      p.status === 'paid' ? 'bg-green-900 text-green-300' :
                      p.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                      p.status === 'failed' ? 'bg-red-900 text-red-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}