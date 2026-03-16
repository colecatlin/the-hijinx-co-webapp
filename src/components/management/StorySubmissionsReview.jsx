import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield } from 'lucide-react';
import SubmissionReviewPanel from '@/components/editorial/SubmissionReviewPanel';
import WriterTrustManager from '@/components/editorial/WriterTrustManager';

export default function StorySubmissionsReview() {
  const [activeView, setActiveView] = useState('submissions');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveView('submissions')}
          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
            activeView === 'submissions' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Submissions
        </button>
        <button
          onClick={() => setActiveView('trust')}
          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
            activeView === 'trust' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Writer Trust
        </button>
      </div>

      {activeView === 'submissions' && <SubmissionReviewPanel currentUser={currentUser} />}
      {activeView === 'trust' && <WriterTrustManager currentUser={currentUser} />}
    </div>
  );
}