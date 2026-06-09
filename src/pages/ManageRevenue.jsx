import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import RaceCorePageShell from '@/components/racecore/RaceCorePageShell';
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

function StatsCard({ icon: IconComponent, label, value, sub }) {
  const Icon = IconComponent;
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

export default function ManageRevenue({ embedded = false }) {
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
      <RaceCorePageShell title="Revenue & Payments" description="Review and manage creator payments">
        <div className="py-24 flex flex-col items-center gap-4">
          <ShieldOff className="w-10 h-10 text-gray-600" />
          <p className="text-gray-500 text-sm">Admin access required.</p>
          <Button size="sm" onClick={() => navigate('/racecore')}>Back</Button>
        </div>
      </RaceCorePageShell>
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
    <RaceCorePageShell title="Revenue & Payments" description="Review and manage creator payments, payout approvals, and revenue events">
      <div className="space-y-6">
...
      </div>
    </RaceCorePageShell>
  );
}