import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ChevronRight, Send, MessageSquare } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-700 text-gray-300',
  applied: 'bg-blue-900/60 text-blue-300',
  change_requested: 'bg-orange-900/60 text-orange-300',
  under_review: 'bg-yellow-900/60 text-yellow-300',
  approved: 'bg-green-900/60 text-green-300',
  denied: 'bg-red-900/60 text-red-300',
  cancelled: 'bg-gray-800 text-gray-400',
};

function RequestDetail({ request, currentUser }) {
  const queryClient = useQueryClient();
  const [msgText, setMsgText] = useState({});

  const { data: policyAcceptances = [] } = useQuery({
    queryKey: ['policyAcceptancesByRequest', request.id],
    queryFn: () => base44.entities.PolicyAcceptance.filter({ request_id: request.id }),
  });

  const { data: threads = [] } = useQuery({
    queryKey: ['policyThreadsByRequest', request.id],
    queryFn: () => base44.entities.PolicyThread.filter({ request_id: request.id }),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['allPolicies'],
    queryFn: () => base44.entities.Policy.list(),
  });

  const allThreadIds = threads.map(t => t.id);
  const { data: allMessages = [] } = useQuery({
    queryKey: ['policyMessagesByThreads', allThreadIds.join(',')],
    queryFn: async () => {
      if (!allThreadIds.length) return [];
      const all = await base44.entities.PolicyMessage.list();
      return all.filter(m => allThreadIds.includes(m.thread_id))
        .sort((a, b) => new Date(a.created_at || a.created_date) - new Date(b.created_at || b.created_date));
    },
    enabled: threads.length > 0,
  });

  const postMutation = useMutation({
    mutationFn: async ({ threadId }) => {
      const text = msgText[threadId]?.trim();
      if (!text) return;
      await base44.entities.PolicyMessage.create({
        thread_id: threadId,
        sender_user_id: currentUser.id,
        message_text: text,
        created_at: new Date().toISOString(),
      });
      setMsgText(m => ({ ...m, [threadId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['policyMessagesByThreads', allThreadIds.join(',')] });
      toast.success('Message sent');
    },
  });

  const getPolicyTitle = (policyId) => policies.find(p => p.id === policyId)?.title || 'Policy';
  const getThreadMessages = (threadId) => allMessages.filter(m => m.thread_id === threadId);

  return (
    <Tabs defaultValue="details">
      <TabsList className="bg-[#262626] border border-gray-700 mb-4">
        <TabsTrigger value="details" className="text-xs text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700">Details</TabsTrigger>
        <TabsTrigger value="policies" className="text-xs text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700">
          Policies
          {policyAcceptances.some(p => p.status === 'change_requested') && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />}
        </TabsTrigger>
        <TabsTrigger value="threads" className="text-xs text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700">
          Threads {threads.length > 0 && `(${threads.length})`}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-gray-500 text-xs mb-0.5">Status</p><Badge className={STATUS_COLORS[request.status]}>{request.status}</Badge></div>
          <div><p className="text-gray-500 text-xs mb-0.5">Access</p><p className="text-white text-xs">{request.requested_access_level}</p></div>
          <div><p className="text-gray-500 text-xs mb-0.5">Target</p><p className="text-white text-xs">{request.target_entity_type}</p></div>
          <div><p className="text-gray-500 text-xs mb-0.5">Roles</p><p className="text-white text-xs">{request.requested_roles?.join(', ') || '—'}</p></div>
          <div className="col-span-2"><p className="text-gray-500 text-xs mb-0.5">Submitted</p><p className="text-white text-xs">{request.created_at ? new Date(request.created_at).toLocaleDateString() : '—'}</p></div>
        </div>
        {request.assignment_description && (
          <div>
            <p className="text-gray-500 text-xs mb-1">Assignment</p>
            <p className="text-gray-300 text-xs bg-[#1A1A1A] rounded p-2 border border-gray-800">{request.assignment_description}</p>
          </div>
        )}
        {request.review_notes && (
          <div>
            <p className="text-gray-500 text-xs mb-1">Review Notes</p>
            <p className="text-gray-300 text-xs bg-[#1A1A1A] rounded p-2 border border-orange-900/40 border">{request.review_notes}</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="policies" className="space-y-2">
        {policyAcceptances.length === 0 ? (
          <p className="text-gray-500 text-xs">No policy records.</p>
        ) : policyAcceptances.map(pa => (
          <div key={pa.id} className="bg-[#262626] border border-gray-700 rounded p-3 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-white">{getPolicyTitle(pa.policy_id)}</span>
              <Badge className={pa.status === 'accepted' ? 'bg-green-900/60 text-green-300' : 'bg-orange-900/60 text-orange-300'}>{pa.status}</Badge>
            </div>
            {pa.status === 'change_requested' && (
              <p className="text-orange-300 text-xs">{pa.change_category}: {pa.change_details}</p>
            )}
          </div>
        ))}
      </TabsContent>

      <TabsContent value="threads" className="space-y-3">
        {threads.length === 0 ? (
          <div className="text-center py-6 text-gray-600">
            <MessageSquare className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm">No threads.</p>
          </div>
        ) : threads.map(thread => (
          <div key={thread.id} className="bg-[#262626] border border-gray-700 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-xs font-medium">{getPolicyTitle(thread.policy_id)}</p>
              <Badge className={thread.status === 'open' ? 'bg-orange-900/60 text-orange-300' : 'bg-gray-700 text-gray-400'}>{thread.status}</Badge>
            </div>
            <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto">
              {getThreadMessages(thread.id).map(msg => (
                <div key={msg.id} className={`rounded p-2 text-xs ${msg.sender_user_id === currentUser?.id ? 'bg-blue-900/30 text-blue-200 ml-4' : 'bg-[#1A1A1A] text-gray-300'}`}>
                  <p>{msg.message_text}</p>
                  <p className="text-gray-600 mt-0.5">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</p>
                </div>
              ))}
            </div>
            {thread.status === 'open' && (
              <div className="flex gap-2">
                <Input value={msgText[thread.id] || ''} onChange={e => setMsgText(m => ({ ...m, [thread.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postMutation.mutate({ threadId: thread.id })}
                  placeholder="Reply..." className="bg-[#0A0A0A] border-gray-700 text-white text-xs h-7" />
                <Button size="sm" className="h-7 px-2 bg-blue-700 hover:bg-blue-600"
                  onClick={() => postMutation.mutate({ threadId: thread.id })}
                  disabled={!msgText[thread.id]?.trim() || postMutation.isPending}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}

export default function MyRequestsTab({ mediaUser, currentUser }) {
  const [selectedReq, setSelectedReq] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['myCredentialRequests', mediaUser?.id],
    queryFn: () => base44.entities.CredentialRequest.filter({ holder_media_user_id: mediaUser.id }),
    enabled: !!mediaUser?.id,
    select: (data) => [...data].sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date)),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['eventsForMediaApply'],
    queryFn: () => base44.entities.Event.list(),
    enabled: !!mediaUser,
  });
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracksForMediaApply'],
    queryFn: () => base44.entities.Track.list(),
    enabled: !!mediaUser,
  });
  const { data: seriesList = [] } = useQuery({
    queryKey: ['seriesForMediaApply'],
    queryFn: () => base44.entities.Series.list(),
    enabled: !!mediaUser,
  });

  const getTargetName = (req) => {
    if (req.target_entity_type === 'event') return events.find(e => e.id === req.target_entity_id)?.name;
    if (req.target_entity_type === 'track') return tracks.find(t => t.id === req.target_entity_id)?.name;
    if (req.target_entity_type === 'series') return seriesList.find(s => s.id === req.target_entity_id)?.name;
    return req.target_entity_id?.slice(0, 8);
  };

  if (!mediaUser) return (
    <div className="text-center py-16 text-gray-600">
      <p className="text-sm">Complete your profile to view requests.</p>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-white font-bold text-lg">My Requests</h2>
          <p className="text-gray-500 text-sm">{requests.length} total requests</p>
        </div>

        {isLoading ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : requests.length === 0 ? (
          <Card className="bg-[#171717] border-gray-800">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No credential requests yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Date</th>
                  <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Target</th>
                  <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Access</th>
                  <th className="text-left text-gray-500 pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-gray-800/50 hover:bg-[#171717] cursor-pointer transition-colors"
                    onClick={() => setSelectedReq(req)}>
                    <td className="py-2 pr-4 text-gray-400">{req.created_at ? new Date(req.created_at).toLocaleDateString() : req.created_date ? new Date(req.created_date).toLocaleDateString() : '—'}</td>
                    <td className="py-2 pr-4"><span className="text-gray-500 mr-1">{req.target_entity_type}:</span><span className="text-white">{getTargetName(req) || req.target_entity_id?.slice(0,8)}</span></td>
                    <td className="py-2 pr-4 text-gray-400">{req.requested_access_level}</td>
                    <td className="py-2 pr-4"><Badge className={STATUS_COLORS[req.status] || 'bg-gray-700 text-gray-300'}>{req.status}</Badge></td>
                    <td className="py-2"><ChevronRight className="w-3 h-3 text-gray-600" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={!!selectedReq} onOpenChange={o => !o && setSelectedReq(null)}>
        <SheetContent side="right" className="bg-[#1A1A1A] border-gray-800 w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-white">Request Details</SheetTitle>
          </SheetHeader>
          {selectedReq && <RequestDetail request={selectedReq} currentUser={currentUser} />}
        </SheetContent>
      </Sheet>
    </>
  );
}