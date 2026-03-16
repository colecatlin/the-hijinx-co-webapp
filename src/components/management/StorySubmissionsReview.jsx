import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Check, X, Eye, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import SubmissionReviewPanel from '@/components/editorial/SubmissionReviewPanel';
import WriterTrustManager from '@/components/editorial/WriterTrustManager';

export default function StorySubmissionsReview() {
  const [activeView, setActiveView] = useState('submissions'); // 'submissions' | 'trust'
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
          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeView === 'submissions' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Submissions
        </button>
        <button
          onClick={() => setActiveView('trust')}
          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${activeView === 'trust' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <Shield className="w-3.5 h-3.5" /> Writer Trust
        </button>
      </div>

      {activeView === 'submissions' && <SubmissionReviewPanel currentUser={currentUser} />}
      {activeView === 'trust' && <WriterTrustManager currentUser={currentUser} />}
    </div>
  );

  // Legacy inline review (kept below for reference but not rendered):
  const _Legacy = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['storySubmissions'],
    queryFn: () => base44.entities.StorySubmission.list('-created_date'),
  });

  const acceptMutation = useMutation({
    mutationFn: (submissionId) =>
      base44.functions.invoke('acceptStorySubmission', { submissionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storySubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Submission accepted and story created!');
    },
    onError: (error) => {
      toast.error(`Failed to accept submission: ${error.message}`);
    },
  });

  const declineMutation = useMutation({
    mutationFn: (submissionId) =>
      base44.entities.StorySubmission.update(submissionId, { status: 'declined' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storySubmissions'] });
      toast.success('Submission declined');
    },
    onError: (error) => {
      toast.error(`Failed to decline submission: ${error.message}`);
    },
  });

  const filteredSubmissions = submissions.filter(
    (sub) =>
      sub.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingSubmissions = filteredSubmissions.filter((sub) => sub.status === 'pending');

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Review Submissions</h2>
        <p className="text-gray-600 mt-1">Review and manage story submissions from users</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search submissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="px-4 py-2 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">{pendingSubmissions.length} pending</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No submissions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Title</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Submitter</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Category</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Submitted</th>
                <th className="w-40 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{submission.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{submission.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded bg-gray-100">{submission.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(submission.status)}`}>
                      {submission.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(submission.created_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelectedSubmission(submission)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{selectedSubmission?.title}</DialogTitle>
                          </DialogHeader>
                          {selectedSubmission && (
                            <div className="space-y-4">
                              <div>
                                <h3 className="font-semibold text-sm text-gray-700">Submitter</h3>
                                <p className="text-sm">{selectedSubmission.name}</p>
                                <p className="text-sm text-gray-600">{selectedSubmission.email}</p>
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm text-gray-700">Category</h3>
                                <p className="text-sm">{selectedSubmission.category}</p>
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm text-gray-700">Pitch</h3>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedSubmission.pitch}</p>
                              </div>
                              {selectedSubmission.writing_sample_url && (
                                <div>
                                  <h3 className="font-semibold text-sm text-gray-700">Writing Sample</h3>
                                  <a
                                    href={selectedSubmission.writing_sample_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    {selectedSubmission.writing_sample_url}
                                  </a>
                                </div>
                              )}
                              {selectedSubmission.photo_urls?.length > 0 && (
                                <div>
                                  <h3 className="font-semibold text-sm text-gray-700">Submitted Photos</h3>
                                  <div className="grid grid-cols-2 gap-2">
                                    {selectedSubmission.photo_urls.map((url, idx) => (
                                      <img key={idx} src={url} alt={`Submission photo ${idx + 1}`} className="w-full h-32 object-cover rounded" />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {selectedSubmission.status === 'pending' && (
                                <div className="flex gap-3 pt-4 border-t">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      if (confirm('Decline this submission?')) {
                                        declineMutation.mutate(selectedSubmission.id);
                                        setShowPreview(false);
                                      }
                                    }}
                                    disabled={declineMutation.isPending}
                                    className="flex-1"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Decline
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      acceptMutation.mutate(selectedSubmission.id);
                                      setShowPreview(false);
                                    }}
                                    disabled={acceptMutation.isPending}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Accept & Create Draft
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}