import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

const STATUS_COLORS = {
  pending: 'bg-amber-900/60 text-amber-300',
  reviewing: 'bg-blue-900/60 text-blue-300',
  accepted: 'bg-green-900/60 text-green-300',
  declined: 'bg-red-900/60 text-red-300',
};

export default function MySubmissionsTab({ currentUser, isContributor, hasMediaRole }) {
  const [showForm, setShowForm] = useState(false);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['myStorySubmissions', currentUser?.email],
    queryFn: () => base44.entities.StorySubmission.filter({ email: currentUser.email }, '-created_date', 50),
    enabled: !!currentUser?.email,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">My Submissions</h2>
          <p className="text-gray-500 text-sm">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(s => !s)}
          className="bg-white text-black hover:bg-gray-100 gap-1.5 text-xs"
        >
          <Plus className="w-3 h-3" /> New Submission
        </Button>
      </div>

      {/* Inline submission form shortcut */}
      {showForm && (
        <div className="bg-[#171717] border border-gray-700 rounded-xl p-5">
          <p className="text-white font-semibold text-sm mb-1">Submit a Story or Pitch</p>
          <p className="text-gray-500 text-xs mb-4">Fill in the form below or visit the full submission page.</p>
          <Link to={createPageUrl('OutletSubmit')}>
            <Button className="bg-white text-black hover:bg-gray-100 gap-1.5 text-sm">
              Open Full Submission Form <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="ml-3 text-gray-500 text-xs" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Writer workspace shortcut for approved contributors */}
      {isContributor && (hasMediaRole?.('writer') || hasMediaRole?.('editor') || hasMediaRole?.('contributor')) && (
        <div className="bg-blue-900/10 border border-blue-900/40 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-blue-300 font-semibold text-sm">Writer Workspace Access</p>
            <p className="text-gray-400 text-xs mt-0.5">You have writer-level access. View your assigned stories in the Writer Workspace.</p>
          </div>
          <Link to="/management/editorial/writer-workspace">
            <Button size="sm" variant="outline" className="border-blue-800 text-blue-300 hover:bg-blue-900/20 gap-1.5 text-xs shrink-0">
              Open <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-gray-600 animate-spin" /></div>
      ) : submissions.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <FileText className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No submissions yet.</p>
            <p className="text-gray-600 text-xs mt-1">Submit a story pitch or tip from the Outlet submission form.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {submissions.map(sub => (
            <div key={sub.id} className="bg-[#171717] border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{sub.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {sub.category && (
                      <span className="text-gray-500 text-xs">{sub.category}</span>
                    )}
                    {sub.created_date && (
                      <span className="text-gray-600 text-xs">{new Date(sub.created_date).toLocaleDateString()}</span>
                    )}
                  </div>
                  {sub.pitch && (
                    <p className="text-gray-500 text-xs mt-1.5 line-clamp-2">{sub.pitch}</p>
                  )}
                  {sub.decline_reason && sub.status === 'declined' && (
                    <div className="mt-2 bg-red-900/10 border border-red-900/30 rounded p-2">
                      <p className="text-red-300 text-xs">{sub.decline_reason}</p>
                    </div>
                  )}
                </div>
                <Badge className={STATUS_COLORS[sub.status] || 'bg-gray-700 text-gray-300'}>
                  {sub.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}