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
  MessageSquare, Search, Filter, ChevronRight, Shield, Calendar,
  AlertTriangle, UserCheck, Lock
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

const MODE_CONFIG = {
  claim: { label: 'Claim', color: 'bg-gray-100 text-gray-600 border-gray-300', Icon: Shield },
  dispute: { label: 'Dispute', color: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertTriangle },
  access_request: { label: 'Access Request', color: 'bg-blue-50 text-blue-600 border-blue-200', Icon: UserCheck },
};

const RESOLUTION_LABELS = {
  approved_as_owner: 'Approved as Owner',
  approved_as_editor: 'Approved as Editor',
  ownership_overridden: 'Ownership Overridden',
  ownership_retained: 'Ownership Retained',
  denied: 'Denied',
  needs_more_info: 'Needs More Info',
};

const DISPUTE_REASON_LABELS = {
  rightful_owner: 'Claims to be rightful owner',
  incorrect_current_claim: 'Believes current claim is incorrect',
  should_have_management_access: 'Requesting management access',
  ownership_review_requested: 'Requesting admin ownership review',
  other: 'Other reason',
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

function ModeBadge({ mode }) {
  const resolvedMode = mode || 'claim';
  const cfg = MODE_CONFIG[resolvedMode] || MODE_CONFIG.claim;
  return (
    <Badge className={`text-xs border px-1.5 py-0 ${cfg.color}`}>
      {cfg.label}
    </Badge>
  );
}

function safeDate(d) {
  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return '—'; }
}

function getClaimMode(claim) {
  if (claim.claim_mode) return claim.claim_mode;
  if (claim.claim_type === 'dispute') return 'dispute';
  return 'claim';
}

function ClaimRow({ claim, onOpen }) {
  const mode = getClaimMode(claim);
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
          <ModeBadge mode={mode} />
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
  const [resolution, setResolution] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!claim) return null;

  const mode = getClaimMode(claim);
  const isActionable = claim.status === 'pending' || claim.status === 'needs_more_info';

  const handleConfirm = async () => {
    if (!resolution) return;
    setProcessing(true);
    const res = await base44.functions.invoke('approveEntityClaim', {
      claim_id: claim.id,
      resolution_type: resolution,
      admin_notes: adminNotes,
    });
    const data = res?.data;
    if (data?.success) {
      toast.success(RESOLUTION_LABELS[data.resolution_type] || 'Done.');
      invalidateDataGroups(queryClient, ['access', 'collaborators', 'profile']);
      onActionComplete();
    } else {
      toast.error(data?.error || 'Action failed.');
    }
    setProcessing(false);
  };

  const isApproveResolution = ['approved_as_owner', 'approved_as_editor', 'ownership_overridden'].includes(resolution);
  const isDenyResolution = ['denied', 'ownership_retained'].includes(resolution);

  // Mode-specific action sets
  const standardActions = [
    { id: 'approved_as_owner', label: 'Approve as Owner', color: 'green', Icon: CheckCircle2 },
    { id: 'approved_as_editor', label: 'Approve as Editor', color: 'teal', Icon: UserCheck },
    { id: 'needs_more_info', label: 'Needs Info', color: 'blue', Icon: MessageSquare },
    { id: 'denied', label: 'Deny', color: 'red', Icon: XCircle },
  ];
  const disputeActions = [
    { id: 'ownership_overridden', label: 'Override — Grant Ownership', color: 'orange', Icon: AlertTriangle },
    { id: 'approved_as_editor', label: 'Grant Editor Access', color: 'teal', Icon: UserCheck },
    { id: 'needs_more_info', label: 'Needs Info', color: 'blue', Icon: MessageSquare },
    { id: 'ownership_retained', label: 'Retain Current Owner / Deny', color: 'red', Icon: Lock },
  ];
  const accessRequestActions = [
    { id: 'approved_as_editor', label: 'Approve as Editor', color: 'teal', Icon: UserCheck },
    { id: 'needs_more_info', label: 'Needs Info', color: 'blue', Icon: MessageSquare },
    { id: 'denied', label: 'Deny', color: 'red', Icon: XCircle },
  ];

  const actionSet = mode === 'dispute' ? disputeActions : mode === 'access_request' ? accessRequestActions : standardActions;

  const colorMap = {
    green: { active: 'bg-green-600 hover:bg-green-700 text-white border-green-600', inactive: 'border-green-200 text-green-700 hover:bg-green-50' },
    teal: { active: 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600', inactive: 'border-teal-200 text-teal-700 hover:bg-teal-50' },
    blue: { active: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600', inactive: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
    orange: { active: 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600', inactive: 'border-orange-200 text-orange-700 hover:bg-orange-50' },
    red: { active: 'bg-red-600 hover:bg-red-700 text-white border-red-600', inactive: 'border-red-200 text-red-600 hover:bg-red-50' },
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-500" />
            Claim Review
          </DialogTitle>
          <DialogDescription>
            {mode === 'dispute' ? 'Ownership dispute — review carefully before acting'
              : mode === 'access_request' ? 'Access request — grant editor access or deny'
              : 'Standard ownership claim'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Entity + mode */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs border ${ENTITY_COLORS[claim.entity_type] || ''}`}>{claim.entity_type}</Badge>
              <span className="font-semibold text-sm text-gray-900">{claim.entity_name}</span>
              <ModeBadge mode={mode} />
            </div>
            <p className="text-xs text-gray-500">Entity ID: {claim.entity_id}</p>
          </div>

          {/* Dispute context banner */}
          {mode === 'dispute' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <p className="font-semibold">⚠ This is an ownership dispute</p>
              <p>This profile is already claimed. The claimant is contesting current ownership.</p>
              {claim.existing_owner_user_id && (
                <p>Current owner ID at submission: <span className="font-mono">{claim.existing_owner_user_id}</span></p>
              )}
            </div>
          )}

          {/* Claimant */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Claimant</p>
            <p className="text-sm text-gray-900">{claim.user_email}</p>
            <p className="text-xs text-gray-400">User ID: {claim.user_id}</p>
          </div>

          {/* Dispute reason */}
          {claim.dispute_reason && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Dispute Reason</p>
              <p className="text-sm text-gray-700">{DISPUTE_REASON_LABELS[claim.dispute_reason] || claim.dispute_reason}</p>
            </div>
          )}

          {/* Justification */}
          {claim.justification && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Their Statement</p>
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

          {/* Previous resolution if any */}
          {claim.admin_resolution_type && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Previous Resolution</p>
              <p className="text-sm text-gray-700">{RESOLUTION_LABELS[claim.admin_resolution_type] || claim.admin_resolution_type}</p>
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
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Admin Resolution</p>
              <div className="flex gap-2 flex-wrap">
                {actionSet.map(({ id, label, color, Icon: ActionIcon }) => {
                  const c = colorMap[color] || colorMap.blue;
                  const isSelected = resolution === id;
                  return (
                    <Button
                      key={id}
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => setResolution(id)}
                      className={`gap-1.5 text-xs ${isSelected ? c.active : c.inactive}`}
                    >
                      <ActionIcon className="w-3.5 h-3.5" />
                      {label}
                    </Button>
                  );
                })}
              </div>

              {resolution && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">
                    {isApproveResolution ? 'Admin Notes (optional)' : isDenyResolution ? 'Reason (optional)' : 'What info is needed?'}
                  </p>
                  <Textarea
                    rows={3}
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder={
                      resolution === 'needs_more_info' ? 'e.g. Please provide proof of identity or racing license...'
                        : resolution === 'ownership_overridden' ? 'Notes on why ownership is being transferred...'
                        : resolution === 'ownership_retained' ? 'Why the dispute is being denied...'
                        : 'Internal notes...'
                    }
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          {isActionable && resolution && (
            <Button
              size="sm"
              disabled={processing}
              onClick={handleConfirm}
              className={
                isApproveResolution ? 'bg-green-600 hover:bg-green-700 text-white' :
                isDenyResolution ? 'bg-red-600 hover:bg-red-700 text-white' :
                'bg-blue-600 hover:bg-blue-700 text-white'
              }
            >
              {processing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Processing...</>
                : `Confirm — ${RESOLUTION_LABELS[resolution] || resolution}`
              }
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
  const [filterMode, setFilterMode] = useState('all');
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
      const mode = getClaimMode(c);
      const matchesMode = filterMode === 'all' || mode === filterMode;
      return matchesSearch && matchesType && matchesMode;
    });
  }, [claims, searchQuery, filterType, filterMode]);

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

  const disputeCount = claims.filter(c => getClaimMode(c) === 'dispute' && c.status === 'pending').length;

  return (
    <ManagementLayout currentPage="ManageEntityClaims">
      <ManagementShell
        title="Claim Review Center"
        subtitle="Review ownership claims, disputes, and access requests for Drivers, Teams, Tracks, and Series"
      >
        {disputeCount > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span><strong>{disputeCount}</strong> pending ownership dispute{disputeCount > 1 ? 's' : ''} require review.</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
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
              <SelectTrigger className="w-32 h-9 text-sm"><SelectValue placeholder="Entity type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Driver">Driver</SelectItem>
                <SelectItem value="Team">Team</SelectItem>
                <SelectItem value="Track">Track</SelectItem>
                <SelectItem value="Series">Series</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMode} onValueChange={setFilterMode}>
              <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Claim mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="claim">Claims</SelectItem>
                <SelectItem value="dispute">Disputes</SelectItem>
                <SelectItem value="access_request">Access Requests</SelectItem>
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
                      {(searchQuery || filterType !== 'all' || filterMode !== 'all') && ' matching your filters'}
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