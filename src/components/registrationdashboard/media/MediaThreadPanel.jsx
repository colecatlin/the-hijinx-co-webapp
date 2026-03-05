import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function MediaThreadPanel({ request, currentUser, invalidateAfterOperation }) {
  const [msgText, setMsgText] = useState({});
  const queryClient = useQueryClient();

  const { data: threads = [] } = useQuery({
    queryKey: ['policyThreads', request?.id],
    queryFn: () => base44.entities.PolicyThread.filter({ request_id: request.id }),
    enabled: !!request?.id,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['allPolicies'],
    queryFn: () => base44.entities.Policy.list(),
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['policyMessages', request?.id],
    queryFn: async () => {
      const threadIds = threads.map(t => t.id);
      if (threadIds.length === 0) return [];
      const all = await base44.entities.PolicyMessage.list();
      return all.filter(m => threadIds.includes(m.thread_id))
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
        sender_user_id: currentUser?.id,
        message_text: text,
        created_at: new Date().toISOString(),
      });
      setMsgText(m => ({ ...m, [threadId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['policyMessages', request?.id] });
      invalidateAfterOperation?.('policy_thread_message_posted', { threadId });
      toast.success('Message sent');
    },
  });

  const getPolicyTitle = (policyId) => policies.find(p => p.id === policyId)?.title || policyId?.slice(0, 8) || '—';
  const getThreadMessages = (threadId) => allMessages.filter(m => m.thread_id === threadId);

  if (threads.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        <MessageSquare className="w-6 h-6 mx-auto mb-2 text-gray-700" />
        No policy change threads for this request.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {threads.map(thread => (
        <Card key={thread.id} className="bg-[#1A1A1A] border-gray-800">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-xs font-medium">
                {getPolicyTitle(thread.policy_id)}
              </CardTitle>
              <Badge className={thread.status === 'open' ? 'bg-orange-900/60 text-orange-300' : 'bg-gray-700 text-gray-400'}>
                {thread.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Messages */}
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {getThreadMessages(thread.id).length === 0 ? (
                <p className="text-gray-600 text-xs italic">No messages yet.</p>
              ) : getThreadMessages(thread.id).map(msg => (
                <div key={msg.id} className={`rounded p-2 text-xs ${msg.sender_user_id === currentUser?.id ? 'bg-blue-900/30 text-blue-200 ml-4' : 'bg-[#262626] text-gray-300'}`}>
                  <p>{msg.message_text}</p>
                  <p className="text-gray-600 mt-0.5">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</p>
                </div>
              ))}
            </div>
            {/* Reply */}
            <div className="flex gap-2">
              <Input
                value={msgText[thread.id] || ''}
                onChange={e => setMsgText(m => ({ ...m, [thread.id]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postMutation.mutate({ threadId: thread.id })}
                placeholder="Reply..."
                className="bg-[#0A0A0A] border-gray-700 text-white text-xs h-8"
              />
              <Button size="sm" className="h-8 px-2 bg-blue-700 hover:bg-blue-600"
                onClick={() => postMutation.mutate({ threadId: thread.id })}
                disabled={!msgText[thread.id]?.trim() || postMutation.isPending}>
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}