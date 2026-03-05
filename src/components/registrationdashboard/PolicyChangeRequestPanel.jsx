import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronRight, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const THREAD_STATUS_COLOR = {
  open: 'bg-orange-100 text-orange-800',
  resolved: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-100 text-gray-800',
};

export default function PolicyChangeRequestPanel({
  request,
  applicantMediaUser,
  dashboardPermissions,
  currentUser,
  invalidateAfterOperation,
}) {
  const { data: acceptances = [] } = useQuery({
    queryKey: ['policyAcceptances', request?.id],
    queryFn: () => base44.entities.PolicyAcceptance.filter({ request_id: request.id }),
    enabled: !!request?.id,
  });

  const changeRequestedAcceptances = acceptances.filter((a) => a.status === 'change_requested');

  if (changeRequestedAcceptances.length === 0) return null;

  return (
    <div className="border-t border-orange-900/40 pt-4 space-y-3">
      <h3 className="font-semibold text-orange-300 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Policy Change Requests ({changeRequestedAcceptances.length})
      </h3>
      <p className="text-xs text-gray-400">
        These policies require discussion before the request can be approved.
      </p>
      {changeRequestedAcceptances.map((acceptance) => (
        <PolicyChangeItem
          key={acceptance.id}
          acceptance={acceptance}
          request={request}
          applicantMediaUser={applicantMediaUser}
          currentUser={currentUser}
          isAdmin={currentUser?.role === 'admin'}
          invalidateAfterOperation={invalidateAfterOperation}
        />
      ))}
    </div>
  );
}

function PolicyChangeItem({
  acceptance,
  request,
  applicantMediaUser,
  currentUser,
  isAdmin,
  invalidateAfterOperation,
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: policy } = useQuery({
    queryKey: ['policy', acceptance.policy_id],
    queryFn: () => base44.entities.Policy.get(acceptance.policy_id),
    enabled: !!acceptance.policy_id,
  });

  // Load or create thread
  const { data: threads = [], isError: threadError } = useQuery({
    queryKey: ['policyThreads', request.id, acceptance.policy_id],
    queryFn: () =>
      base44.entities.PolicyThread.filter({
        request_id: request.id,
        policy_id: acceptance.policy_id,
      }),
    enabled: !!request.id && !!acceptance.policy_id,
  });

  const thread = threads[0] || null;

  const createThreadMutation = useMutation({
    mutationFn: () =>
      base44.entities.PolicyThread.create({
        request_id: request.id,
        policy_id: acceptance.policy_id,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policyThreads', request.id, acceptance.policy_id] });
    },
  });

  // Auto-create thread when panel is opened and thread doesn't exist
  useEffect(() => {
    if (open && !thread && !createThreadMutation.isPending && threads !== undefined && !threadError) {
      createThreadMutation.mutate();
    }
  }, [open, thread, threads]);

  if (threadError) {
    return (
      <div className="bg-[#1A1A1A] border border-gray-700 rounded p-4">
        <p className="text-xs text-red-400">
          Could not initialize discussion threads, refresh and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] border border-orange-900/40 rounded overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#222] transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{policy?.title || 'Policy'}</p>
            <p className="text-xs text-gray-500">
              {acceptance.change_category && (
                <span className="uppercase mr-2">{acceptance.change_category}</span>
              )}
              {acceptance.change_details && (
                <span className="text-gray-400 truncate">{acceptance.change_details.slice(0, 60)}{acceptance.change_details.length > 60 ? '…' : ''}</span>
              )}
            </p>
          </div>
        </div>
        {thread && (
          <Badge className={`${THREAD_STATUS_COLOR[thread.status] || 'bg-gray-100 text-gray-800'} flex-shrink-0 ml-2`}>
            {thread.status}
          </Badge>
        )}
      </button>

      {/* Accordion Body */}
      {open && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {/* Change request detail */}
          <div className="bg-[#262626] rounded p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Change Request</p>
            {acceptance.change_category && (
              <Badge className="bg-orange-900/40 text-orange-300 mb-2">{acceptance.change_category}</Badge>
            )}
            <p className="text-sm text-gray-300">{acceptance.change_details || 'No details provided.'}</p>
          </div>

          {thread ? (
            <>
              <MessageThread
                thread={thread}
                request={request}
                applicantMediaUser={applicantMediaUser}
                currentUser={currentUser}
                isAdmin={isAdmin}
                invalidateAfterOperation={invalidateAfterOperation}
              />

              <ResolutionControls
                thread={thread}
                acceptance={acceptance}
                currentUser={currentUser}
                isAdmin={isAdmin}
                applicantMediaUser={applicantMediaUser}
                invalidateAfterOperation={invalidateAfterOperation}
              />
            </>
          ) : (
            <p className="text-xs text-gray-500">Initializing thread…</p>
          )}
        </div>
      )}
    </div>
  );
}

function MessageThread({ thread, request, applicantMediaUser, currentUser, isAdmin, invalidateAfterOperation }) {
  const [messageText, setMessageText] = useState('');
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['policyMessages', thread.id],
    queryFn: () =>
      base44.entities.PolicyMessage.filter({ thread_id: thread.id }),
    enabled: !!thread.id,
    select: (data) => [...data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      await base44.entities.PolicyMessage.create({
        thread_id: thread.id,
        sender_user_id: currentUser.id,
        message_text: messageText.trim(),
        created_at: now,
      });
      await base44.entities.PolicyThread.update(thread.id, { updated_at: now });
      queryClient.invalidateQueries({ queryKey: ['policyMessages', thread.id] });
      invalidateAfterOperation?.('policy_message_updated', { threadId: thread.id });
    },
    onSuccess: () => setMessageText(''),
  });

  const getSenderLabel = (msg) => {
    if (msg.sender_user_id === currentUser?.id) return 'You';
    if (applicantMediaUser?.user_id && msg.sender_user_id === applicantMediaUser.user_id) {
      return applicantMediaUser.full_name || 'Applicant';
    }
    return 'Entity Reviewer';
  };

  const isApplicantUser =
    currentUser?.id &&
    applicantMediaUser?.user_id &&
    currentUser.id === applicantMediaUser.user_id;

  const canMessage = isAdmin || isApplicantUser || true; // entity reviewers can always message
  const isOnlyApplicantRestricted =
    !isAdmin && !isApplicantUser && !currentUser; // edge: no current user

  return (
    <div className="space-y-3">
      {/* Message list */}
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">No messages yet. Start the conversation.</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_user_id === currentUser?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 ${isMe ? 'bg-[#1A3249] text-white' : 'bg-[#262626] text-gray-200'}`}>
                <p className={`text-[10px] mb-1 ${isMe ? 'text-blue-300' : 'text-gray-500'}`}>
                  {getSenderLabel(msg)} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm">{msg.message_text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {canMessage && currentUser ? (
        <div className="flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message…"
            rows={2}
            className="bg-[#262626] border-gray-700 text-white text-sm flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && messageText.trim()) {
                e.preventDefault();
                sendMutation.mutate();
              }
            }}
          />
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!messageText.trim() || sendMutation.isPending}
            size="sm"
            className="self-end bg-[#1A3249] hover:bg-[#234469]"
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Send
          </Button>
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">Applicant messaging available after login.</p>
      )}
    </div>
  );
}

function ResolutionControls({
  thread,
  acceptance,
  currentUser,
  isAdmin,
  applicantMediaUser,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();

  const isEntityReviewer =
    isAdmin ||
    (currentUser?.id &&
      applicantMediaUser?.user_id &&
      currentUser.id !== applicantMediaUser.user_id);

  const isApplicant =
    currentUser?.id &&
    applicantMediaUser?.user_id &&
    currentUser.id === applicantMediaUser.user_id;

  const resolveThreadMutation = useMutation({
    mutationFn: async (newStatus) => {
      await base44.entities.PolicyThread.update(thread.id, {
        status: newStatus,
        updated_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['policyThreads', acceptance.request_id, acceptance.policy_id] });
      invalidateAfterOperation?.('policy_thread_updated', { requestId: acceptance.request_id });
      toast.success(newStatus === 'resolved' ? 'Thread marked resolved' : 'Thread closed');
    },
  });

  const acceptPolicyMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.PolicyAcceptance.update(acceptance.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['policyAcceptances', acceptance.request_id] });
      invalidateAfterOperation?.('policy_acceptance_updated', { requestId: acceptance.request_id });
      toast.success('Policy accepted');
    },
  });

  return (
    <div className="border-t border-gray-800 pt-3 space-y-3">
      {/* Entity reviewer controls */}
      {isEntityReviewer && thread.status === 'open' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => resolveThreadMutation.mutate('resolved')}
            disabled={resolveThreadMutation.isPending}
            className="bg-blue-800 hover:bg-blue-700 text-white"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Mark Resolved
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => resolveThreadMutation.mutate('closed')}
              disabled={resolveThreadMutation.isPending}
              className="border-gray-700 text-gray-400"
            >
              Close Thread
            </Button>
          )}
        </div>
      )}

      {/* Applicant accept prompt */}
      {isApplicant && thread.status === 'resolved' && (
        <div className="bg-blue-950/40 border border-blue-800 rounded p-3 space-y-2">
          <p className="text-sm text-blue-200">
            Entity marked this policy discussion resolved. To proceed, accept the policy.
          </p>
          <Button
            size="sm"
            onClick={() => acceptPolicyMutation.mutate()}
            disabled={acceptPolicyMutation.isPending}
            className="bg-blue-700 hover:bg-blue-600"
          >
            Accept Final Policy
          </Button>
        </div>
      )}
    </div>
  );
}