import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';

export default function ManageStorySubmissions({ user }) {
  const [expandedId, setExpandedId] = useState(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['userStorySubmissions', user?.email],
    queryFn: () => 
      base44.entities.StorySubmission.filter(
        { created_by: user?.email },
        '-created_date'
      ),
    enabled: !!user?.email,
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No stories submitted yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold">Your Story Submissions</h2>
        <p className="text-sm text-gray-600 mt-1">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="divide-y divide-gray-200">
        {submissions.map((submission) => (
          <div key={submission.id} className="p-4 sm:p-6">
            <button
              onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
              className="w-full text-left flex items-start justify-between hover:bg-gray-50 p-0 gap-2"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2">{submission.title}</h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
                  <Badge className={getStatusColor(submission.status)}>
                    {submission.status}
                  </Badge>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {new Date(submission.created_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <ChevronDown 
                className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform flex-shrink-0 mt-1 ${
                  expandedId === submission.id ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedId === submission.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm text-gray-700 mb-1">Category</h4>
                  <p className="text-xs sm:text-sm text-gray-600">{submission.category}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-xs sm:text-sm text-gray-700 mb-1">Pitch</h4>
                  <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-wrap">{submission.pitch}</p>
                </div>

                {submission.writing_sample_url && (
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-gray-700 mb-1">Writing Sample</h4>
                    <a
                      href={submission.writing_sample_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm text-blue-600 hover:underline break-all"
                    >
                      View Sample
                    </a>
                  </div>
                )}

                {submission.photo_urls?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-gray-700 mb-2">Photos</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {submission.photo_urls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-20 sm:h-24 object-cover rounded"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {submission.status === 'declined' && submission.decline_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h4 className="font-semibold text-xs sm:text-sm text-red-900 mb-1">Decline Reason</h4>
                    <p className="text-xs sm:text-sm text-red-800 whitespace-pre-wrap">{submission.decline_reason}</p>
                  </div>
                )}

                {submission.status === 'accepted' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs sm:text-sm text-green-800 font-medium">✓ Your story has been accepted and published!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}