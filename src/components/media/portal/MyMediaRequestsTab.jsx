// MyMediaRequestsTab — creator-facing requests view inside MediaPortal (dark theme)

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Inbox } from 'lucide-react';
import MediaRequestCard from '@/components/media/requests/MediaRequestCard';
import { REQUEST_STATUSES } from '@/components/media/requests/requestHelpers';

export default function MyMediaRequestsTab({ currentUser, myProfile, mediaUser }) {
  const [tab, setTab] = useState('incoming');

  // Requests sent directly to this creator
  const { data: directRequests = [], isLoading: loadingDirect, refetch: refetchDirect } = useQuery({
    queryKey: ['myIncomingRequests', myProfile?.id],
    queryFn: () => base44.entities.MediaRequest.filter(
      { target_creator_profile_id: myProfile.id },
      '-created_date',
      100
    ),
    enabled: !!myProfile?.id,
  });

  // Open requests visible to all eligible creators
  const { data: openRequests = [], isLoading: loadingOpen } = useQuery({
    queryKey: ['openMediaRequests'],
    queryFn: () => base44.entities.MediaRequest.filter(
      { open_to_applicants: true, request_status: 'open' },
      '-created_date',
      50
    ),
    enabled: !!currentUser?.id,
  });

  const incoming = directRequests.filter(r =>
    ['sent_to_creator', 'matched', 'open'].includes(r.request_status)
  );
  const accepted = directRequests.filter(r => ['accepted', 'converted_to_assignment'].includes(r.request_status));
  const declined = directRequests.filter(r => r.request_status === 'declined');

  const tabs = [
    { key: 'incoming', label: 'Incoming', count: incoming.length },
    { key: 'open', label: 'Open Board', count: openRequests.length },
    { key: 'accepted', label: 'Accepted', count: accepted.length },
    { key: 'declined', label: 'Declined', count: declined.length },
  ];

  const isLoading = loadingDirect || loadingOpen;

  const currentList = tab === 'incoming' ? incoming
    : tab === 'open' ? openRequests
    : tab === 'accepted' ? accepted
    : declined;

  if (!myProfile) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <Inbox className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Complete your contributor profile to receive requests.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-bold text-lg">My Requests</h2>
        <p className="text-gray-500 text-sm">Hiring and collaboration requests from teams, outlets, and editorial.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-800 pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-t border-b-2 -mb-px ${
              tab === t.key ? 'text-white border-white' : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                tab === t.key ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
        </div>
      ) : currentList.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <Inbox className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No {tab} requests.</p>
            {tab === 'incoming' && (
              <p className="text-gray-600 text-xs mt-1">
                Requests from teams, outlets, and editorial will appear here.
              </p>
            )}
            {tab === 'open' && (
              <p className="text-gray-600 text-xs mt-1">
                Open requests available to all eligible creators will appear here.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {currentList.map(r => (
            <MediaRequestCard
              key={r.id}
              request={r}
              currentUser={currentUser}
              mediaUserId={mediaUser?.id}
              onUpdated={() => {
                refetchDirect();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}