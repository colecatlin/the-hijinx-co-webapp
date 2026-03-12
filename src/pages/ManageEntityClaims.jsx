import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, User, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ENTITY_COLORS = {
  Driver: 'bg-blue-50 text-blue-700 border-blue-200',
  Team: 'bg-purple-50 text-purple-700 border-purple-200',
  Track: 'bg-green-50 text-green-700 border-green-200',
  Series: 'bg-orange-50 text-orange-700 border-orange-200',
};

function ClaimCard({ claim, onAction }) {
  const safeDate = (d) => { try { return format(new Date(d), 'MMM d, yyyy'); } catch { return '—'; } };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-gray-900 text-sm">{claim.entity_name}</span>
              <Badge className={`text-xs border px-1.5 py-0 ${ENTITY_COLORS[claim.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {claim.entity_type}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <User className="w-3 h-3" />
              <span>{claim.user_email}</span>
            </div>
            {claim.justification && (
              <p className="text-xs text-gray-600 mt-2 bg-gray-50 border border-gray-100 rounded p-2 italic">
                "{claim.justification}"
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">Submitted {safeDate(claim.created_date)}</p>
          </div>
          {claim.status === 'pending' && (
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                onClick={() => onAction(claim, 'approve')}>
                <CheckCircle2 className="w-3 h-3" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                onClick={() => onAction(claim, 'reject')}>
                <XCircle className="w-3 h-3" /> Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManageEntityClaims() {
  const queryClient = useQueryClient();
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [grantRole, setGrantRole] = useState('owner');
  const [processing, setProcessing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['entityClaimRequests'],
    queryFn: () => base44.entities.EntityClaimRequest.list('-created_date', 200),
  });

  const pending = claims.filter(c => c.status === 'pending');
  const approved = claims.filter(c => c.status === 'approved');
  const rejected = claims.filter(c => c.status === 'rejected');

  const handleAction = (claim, action) => {
    setSelectedClaim(claim);
    setActionType(action);
    setGrantRole('owner');
  };

  const handleConfirm = async () => {
    if (!selectedClaim || !actionType) return;
    setProcessing(true);
    const res = await base44.functions.invoke('approveEntityClaim', {
      claim_id: selectedClaim.id,
      action: actionType,
      role: grantRole,
    });
    const data = res?.data;
    if (data?.success) {
      toast.success(actionType === 'approve' ? 'Claim approved — access granted.' : 'Claim rejected.');
      queryClient.invalidateQueries({ queryKey: ['entityClaimRequests'] });
    } else {
      toast.error(data?.error || 'Action failed.');
    }
    setProcessing(false);
    setSelectedClaim(null);
    setActionType(null);
  };

  return (
    <ManagementLayout currentPage="ManageEntityClaims">
      <ManagementShell title="Entity Claim Requests" subtitle="Review ownership claims for Drivers, Teams, Tracks, and Series">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-5">
            <TabsList>
              <TabsTrigger value="pending" className="gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Pending ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approved ({approved.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Rejected ({rejected.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3">
              {pending.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-gray-500 text-sm">No pending claims</CardContent></Card>
              ) : pending.map(c => <ClaimCard key={c.id} claim={c} onAction={handleAction} />)}
            </TabsContent>

            <TabsContent value="approved" className="space-y-3">
              {approved.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-gray-500 text-sm">No approved claims</CardContent></Card>
              ) : approved.map(c => (
                <Card key={c.id}><CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{c.entity_name} <Badge className={`text-xs ml-1 ${ENTITY_COLORS[c.entity_type] || ''}`}>{c.entity_type}</Badge></p>
                    <p className="text-xs text-gray-500">{c.user_email} · Approved as {c.granted_role}</p>
                  </div>
                  <Badge className="text-xs bg-green-100 text-green-700 border border-green-200">Approved</Badge>
                </CardContent></Card>
              ))}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-3">
              {rejected.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-gray-500 text-sm">No rejected claims</CardContent></Card>
              ) : rejected.map(c => (
                <Card key={c.id}><CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{c.entity_name} <Badge className={`text-xs ml-1 ${ENTITY_COLORS[c.entity_type] || ''}`}>{c.entity_type}</Badge></p>
                    <p className="text-xs text-gray-500">{c.user_email}</p>
                  </div>
                  <Badge className="text-xs bg-red-100 text-red-600 border border-red-200">Rejected</Badge>
                </CardContent></Card>
              ))}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve Claim' : 'Reject Claim'}
              </DialogTitle>
            </DialogHeader>
            {selectedClaim && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <p><span className="text-gray-500">Entity:</span> <strong>{selectedClaim.entity_name}</strong> ({selectedClaim.entity_type})</p>
                  <p><span className="text-gray-500">Claimant:</span> {selectedClaim.user_email}</p>
                  {selectedClaim.justification && <p className="mt-2 italic text-gray-600">"{selectedClaim.justification}"</p>}
                </div>
                {actionType === 'approve' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Grant Role</label>
                    <Select value={grantRole} onValueChange={setGrantRole}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {actionType === 'reject' && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    This will mark the claim as rejected. The user will see this status on their dashboard.
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSelectedClaim(null)}>Cancel</Button>
              <Button size="sm" disabled={processing}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                onClick={handleConfirm}>
                {processing ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Processing...</> : (actionType === 'approve' ? 'Approve & Grant Access' : 'Confirm Rejection')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ManagementShell>
    </ManagementLayout>
  );
}