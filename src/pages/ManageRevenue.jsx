import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldOff, DollarSign, TrendingUp, Users, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const PAGE = 'management/media/revenue';

const PAYOUT_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  reversed: 'bg-gray-100 text-gray-500'
};

const REVENUE_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  invoiced: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  payout_pending: 'bg-orange-100 text-orange-700',
  payout_sent: 'bg-green-100 text-green-700',
  refunded: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700'
};

function StatsCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Icon className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
            {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManageRevenue() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('payouts');
  const [approvingId, setApprovingId] = useState(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: payoutRecords, isLoading: payoutsLoading } = useQuery({
    queryKey: ['allPayoutRecords'],
    queryFn: () => base44.entities.PayoutRecord.list('-created_date', 50),
    enabled: user?.role === 'admin'
  });

  const { data: revenueEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['allRevenueEvents'],
    queryFn: () => base44.entities.RevenueEvent.list('-created_date', 50),
    enabled: user?.role === 'admin'
  });

  const { data: revenueAgreements } = useQuery({
    queryKey: ['allRevenueAgreements'],
    queryFn: () => base44.entities.RevenueAgreement.list('-created_date', 50),
    enabled: user?.role === 'admin'
  });

  const { data: paymentAccounts } = useQuery({
    queryKey: ['allPaymentAccounts'],
    queryFn: () => base44.entities.PaymentAccount.list('-created_date', 100),
    enabled: user?.role === 'admin'
  });

  const handleApprovePayout = async (payoutId, execute = false) => {
    setApprovingId(payoutId);
    try {
      await base44.functions.invoke('approvePayoutRecord', { payoutRecordId: payoutId, executeTransfer: execute });
      qc.invalidateQueries({ queryKey: ['allPayoutRecords'] });
    } catch (e) {
      console.error(e);
    } finally {
      setApprovingId(null);
    }
  };

  if (userLoading) return null;
  if (!user) { base44.auth.redirectToLogin('/' + PAGE); return null; }
  if (user.role !== 'admin') {
    return (
      <ManagementLayout currentPage={PAGE}>
        <ManagementShell title="Revenue & Payments">
          <div className="py-24 flex flex-col items-center gap-4">
            <ShieldOff className="w-10 h-10 text-gray-300" />
            <p className="text-gray-500 text-sm">Admin access required.</p>
            <Button size="sm" onClick={() => navigate('/Management')}>Back</Button>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  const pendingPayouts = (payoutRecords || []).filter(p => p.status === 'pending');
  const totalPendingCents = pendingPayouts.reduce((s, p) => s + (p.amount || 0), 0);
  const activeAccounts = (paymentAccounts || []).filter(a => a.account_status === 'active').length;
  const paidEvents = (revenueEvents || []).filter(e => e.status === 'paid');
  const totalRevenueCents = paidEvents.reduce((s, e) => s + (e.gross_amount || 0), 0);

  const TABS = [
    { id: 'payouts', label: 'Payout Queue' },
    { id: 'events', label: 'Revenue Events' },
    { id: 'agreements', label: 'Agreements' },
    { id: 'accounts', label: 'Payment Accounts' }
  ];

  return (
    <ManagementLayout currentPage={PAGE}>
      <ManagementShell title="Revenue & Payments" subtitle="Review and manage creator payments, payout approvals, and revenue events">
        <div className="space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard icon={Clock} label="Pending Payouts" value={pendingPayouts.length} sub={`$${(totalPendingCents / 100).toFixed(2)} total`} />
            <StatsCard icon={DollarSign} label="Revenue Processed" value={`$${(totalRevenueCents / 100).toFixed(2)}`} sub={`${paidEvents.length} events`} />
            <StatsCard icon={Users} label="Active Payout Accounts" value={activeAccounts} sub={`${(paymentAccounts || []).length} total`} />
            <StatsCard icon={TrendingUp} label="Active Agreements" value={(revenueAgreements || []).filter(a => a.status === 'active').length} sub="" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
                {t.id === 'payouts' && pendingPayouts.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">{pendingPayouts.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Payout Queue */}
          {activeTab === 'payouts' && (
            <div className="space-y-3">
              {payoutsLoading && <div className="text-sm text-gray-400">Loading...</div>}
              {!payoutsLoading && (payoutRecords || []).length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">No payout records yet.</div>
              )}
              {(payoutRecords || []).map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-gray-900">
                      {p.payout_recipient_type === 'media_profile' ? 'Creator' : 'Outlet'} — {p.payout_recipient_id?.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-gray-500">${(p.amount / 100).toFixed(2)} {p.currency?.toUpperCase()} · {p.notes || 'No notes'}</div>
                    <div className="text-xs text-gray-400">{new Date(p.created_date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${PAYOUT_STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-500'}`}>
                      {p.status}
                    </span>
                    {p.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={approvingId === p.id}
                          onClick={() => handleApprovePayout(p.id, false)}
                          className="text-xs"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          disabled={approvingId === p.id}
                          onClick={() => handleApprovePayout(p.id, true)}
                          className="text-xs bg-green-700 hover:bg-green-800 text-white"
                        >
                          Approve & Pay
                        </Button>
                      </div>
                    )}
                    {p.stripe_transfer_id && (
                      <span className="text-xs text-gray-400 font-mono">{p.stripe_transfer_id.slice(0, 12)}...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Revenue Events */}
          {activeTab === 'events' && (
            <div className="space-y-2">
              {eventsLoading && <div className="text-sm text-gray-400">Loading...</div>}
              {!eventsLoading && (revenueEvents || []).length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">No revenue events yet.</div>
              )}
              {(revenueEvents || []).map(e => (
                <div key={e.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 capitalize">{e.revenue_type?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Gross: ${(e.gross_amount / 100).toFixed(2)} · Creator: ${(e.creator_amount / 100).toFixed(2)} · Platform: ${(e.platform_amount / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">{new Date(e.occurred_at || e.created_date).toLocaleDateString()}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${REVENUE_STATUS_COLORS[e.status] || 'bg-gray-100 text-gray-500'}`}>
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Revenue Agreements */}
          {activeTab === 'agreements' && (
            <div className="space-y-2">
              {(revenueAgreements || []).length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">No revenue agreements yet.</div>
              )}
              {(revenueAgreements || []).map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-gray-900 capitalize">{a.agreement_type?.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-gray-500">
                      Platform {a.platform_share_percent}% · Creator {a.creator_share_percent}% · Outlet {a.outlet_share_percent}%
                      {a.flat_fee_amount ? ` · Flat: $${(a.flat_fee_amount / 100).toFixed(2)}` : ''}
                    </div>
                    {a.notes && <div className="text-xs text-gray-400">{a.notes}</div>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    a.status === 'active' ? 'bg-green-100 text-green-700' :
                    a.status === 'revoked' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Payment Accounts */}
          {activeTab === 'accounts' && (
            <div className="space-y-2">
              {(paymentAccounts || []).length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">No payment accounts yet.</div>
              )}
              {(paymentAccounts || []).map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-gray-900 capitalize">{a.owner_type?.replace(/_/g, ' ')} — {a.owner_id?.slice(0, 12)}...</div>
                    {a.stripe_connected_account_id && (
                      <div className="text-xs text-gray-400 font-mono">{a.stripe_connected_account_id}</div>
                    )}
                    <div className="text-xs text-gray-400">
                      Payouts: {a.payouts_enabled ? '✓' : '✗'} · Charges: {a.charges_enabled ? '✓' : '✗'}
                      {a.last_sync_at ? ` · Synced: ${new Date(a.last_sync_at).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    a.account_status === 'active' ? 'bg-green-100 text-green-700' :
                    a.account_status === 'restricted' ? 'bg-red-100 text-red-700' :
                    a.account_status === 'onboarding_started' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{a.account_status?.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </ManagementShell>
    </ManagementLayout>
  );
}