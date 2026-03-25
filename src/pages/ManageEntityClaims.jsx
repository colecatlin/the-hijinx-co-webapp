import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2, XCircle, Clock, User, AlertCircle, Loader2,
  MessageSquare, Search, Filter, ChevronRight, Shield, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { invalidateDataGroups } from '@/components/data/invalidationContract';

const ENTITY_COLORS = {
  Driver: 'bg-blue-50 text-blue-700 border-blue-200',
  Team: 'bg-purple-50 text-purple-700 border-purple-200',
  Track: 'bg-green-50 text-green-700 border-green-200',
  Series: 'bg-orange-50 text-orange-700 border-orange-200',
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-600 border-red-200', Icon: XCircle },
  needs_more_info: { label: 'Needs Info', color: 'bg-blue-50 text-blue-700 border-blue-200', Icon: MessageSquare },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Badge className={`text-xs border px-1.5 py-0.5 flex items-center gap-1 ${cfg.color}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function safeDate(d) {
  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return '—'; }
}

function ClaimRow({ claim, onOpen }) {
  return (
    <button
      onClick={() => onOpen(claim)}
      className="w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
    >
      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${ENTITY_COLORS[claim.entity_type] || 'bg-gray-50 border-gray-200'}`}>
        <User className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900">{claim.entity_name}</span>
          <Badge className={`text-xs border px-1.5 py-0 ${ENTITY_COLORS[claim.entity_type] || ''}`}>{claim.entity_type}</Badge>
          {claim.claim_type === 'dispute' && (
            <Badge className="text-xs border px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">Dispute</Badge>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{claim.user_email}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{safeDate(claim.created_date)}</span>
        </div>
      </div>
      <StatusBadge status={claim.status} />
      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </button>
  );
}

function ClaimDetailDialog({ claim, onClose, onActionComplete }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState(null); // 'approve' | 'reject' | 'needs_more_info'
  const [grantRole, setGrantRole] = useState('owner');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!claim) return null;

  const handleConfirm = async () => {
    if (!action) return;
    setProcessing(true);
    const res = await base44.functions.invoke('approveEntityClaim', {
      claim_id: claim.id,
      action,
      role: grantRole,
      admin_notes: adminNotes,
    });
    const data = res?.data;
    if (data?.success) {
      const msgs = { approve: 'Claim approved — access granted.', reject: 'Claim rejected.', needs_more_info: 'More info requested.' };
      toast.success(msgs[action] || 'Done.');
      invalidateDataGroups(queryClient, ['access', 'collaborators', 'profile']);
      onActionComplete();
    } else {
      toast.error(data?.error || 'Action failed.');
    }
    setProcessing(false);
  };

  const isActionable = claim.status === 'pending' || claim.status === 'needs_more_info';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-500" />
            Claim Review
          </DialogTitle>
          <DialogDescription>Review and act on this ownership claim</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Entity */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs border ${ENTITY_COLORS[claim.entity_type] || ''}`}>{claim.entity_type}</Badge>
              <span className="font-semibold text-sm text-gray-900">{claim.entity_name}</span>
              {claim.claim_type === 'dispute' && (
                <Badge className="text-xs border bg-amber-50 text-amber-700 border-amber-200">Ownership Dispute</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">Entity ID: {claim.entity_id}</p>
          </div>

          {/* Claimant */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Claimant</p>
            <p className="text-sm text-gray-900">{claim.user_email}</p>
            <p className="text-xs text-gray-400">User ID: {claim.user_id}</p>
          </div>

          {/* Justification */}
          {claim.justification && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Their Reason</p>
              <p className="text-sm text-gray-700 italic">"{claim.justification}"</p>
            </div>
          )}

          {/* Previous admin notes */}
          {claim.admin_notes && claim.status !== 'pending' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Previous Admin Notes</p>
              <p className="text-sm text-blue-800">{claim.admin_notes}</p>
            </div>
          )}

          {/* Submitted */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Submitted {safeDate(claim.created_date)}</span>
            <StatusBadge status={claim.status} />
          </div>

          {/* Actions */}
          {isActionable && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Admin Action</p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant={action === 'approve' ? 'default' : 'outline'}
                  onClick={() => setAction('approve')}
                  className={`gap-1.5 text-xs ${action === 'approve' ? 'bg-green-600 hover:bg-green-700 border-green-600' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button size="sm" variant={action === 'needs_more_info' ? 'default' : 'outline'}
                  onClick={() => setAction('needs_more_info')}
                  className={`gap-1.5 text-xs ${action === 'needs_more_info' ? 'bg-blue-600 hover:bg-blue-700 border-blue-600' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}>
                  <MessageSquare className="w-3.5 h-3.5" /> Needs Info
                </Button>
                <Button size="sm" variant={action === 'reject' ? 'default' : 'outline'}
                  onClick={() => setAction('reject')}
                  className={`gap-1.5 text-xs ${action === 'reject' ? 'bg-red-600 hover:bg-red-700 border-red-600' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </Button>
              </div>

              {action === 'approve' && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">Grant Role</p>
                  <Select value={grantRole} onValueChange={setGrantRole}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {action && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">
                    {action === 'approve' ? 'Admin Notes (optional)' : action === 'reject' ? 'Reason for rejection (optional)' : 'What info is needed?'}
                  </p>
                  <Textarea
                    rows={3}
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder={action === 'needs_more_info' ? 'e.g. Please provide proof of identity or racing license...' : 'Internal notes...'}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          {isActionable && action && (
            <Button size="sm" disabled={processing} onClick={handleConfirm}
              className={
                action === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' :
                action === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' :
                'bg-blue-600 hover:bg-blue-700 text-white'
              }>
              {processing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Processing...</>
                : action === 'approve' ? 'Approve & Grant Access'
                : action === 'reject' ? 'Confirm Rejection'
                : 'Request More Info'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ManageEntityClaims() {
  const queryClient = useQueryClient();
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('pending');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: claims = [], isLoading, refetch } = useQuery({
    queryKey: ['entityClaimRequests'],
    queryFn: () => base44.entities.EntityClaimRequest.list('-created_date', 500),
    enabled: user?.role === 'admin',
  });

  if (user && user.role !== 'admin') {
    return (
      <ManagementLayout currentPage="ManageEntityClaims">
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-20 text-center text-gray-500">This page is for administrators only.</div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  const filtered = useMemo(() => {
    return claims.filter(c => {
      const matchesSearch = !searchQuery ||
        c.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || c.entity_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [claims, searchQuery, filterType]);

  const byStatus = (status) => filtered.filter(c => c.status === status);
  const pending = byStatus('pending');
  const needsInfo = byStatus('needs_more_info');
  const approved = byStatus('approved');
  const rejected = byStatus('rejected');

  const tabData = [
    { id: 'pending', label: 'Pending', count: pending.length, items: pending, Icon: Clock },
    { id: 'needs_more_info', label: 'Needs Info', count: needsInfo.length, items: needsInfo, Icon: MessageSquare },
    { id: 'approved', label: 'Approved', count: approved.length, items: approved, Icon: CheckCircle2 },
    { id: 'rejected', label: 'Rejected', count: rejected.length, items: rejected, Icon: XCircle },
  ];

  return (
    <ManagementLayout currentPage="ManageEntityClaims">
      <ManagementShell
        title="Claim Review Center"
        subtitle="Review, approve, or deny ownership claims for Drivers, Teams, Tracks, and Series"
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by entity name or claimant email…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Entity type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Driver">Driver</SelectItem>
                <SelectItem value="Team">Team</SelectItem>
                <SelectItem value="Track">Track</SelectItem>
                <SelectItem value="Series">Series</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex-wrap gap-1 h-auto">
              {tabData.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs">
                  <tab.Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1 bg-white/60 rounded-full px-1.5 py-0 text-xs font-semibold">{tab.count}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabData.map(tab => (
              <TabsContent key={tab.id} value={tab.id}>
                {tab.items.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-400 text-sm">
                      No {tab.label.toLowerCase()} claims
                      {(searchQuery || filterType !== 'all') && ' matching your filters'}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-100">
                        {tab.items.map(c => (
                          <ClaimRow key={c.id} claim={c} onOpen={setSelectedClaim} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        <ClaimDetailDialog
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
          onActionComplete={() => { setSelectedClaim(null); refetch(); }}
        />
      </ManagementShell>
    </ManagementLayout>
  );
}