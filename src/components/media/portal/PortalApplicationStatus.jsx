import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, XCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

const STATE_CONFIG = {
  pending: {
    icon: Clock,
    iconColor: 'text-amber-400',
    bg: 'bg-amber-900/10 border-amber-800/60',
    title: 'Application Under Review',
    badge: 'bg-amber-900/60 text-amber-300',
    badgeLabel: 'Pending',
  },
  needs_more_info: {
    icon: AlertCircle,
    iconColor: 'text-blue-400',
    bg: 'bg-blue-900/10 border-blue-800/60',
    title: 'More Information Requested',
    badge: 'bg-blue-900/60 text-blue-300',
    badgeLabel: 'Needs Info',
  },
  denied: {
    icon: XCircle,
    iconColor: 'text-red-400',
    bg: 'bg-red-900/10 border-red-800/60',
    title: 'Application Not Approved',
    badge: 'bg-red-900/60 text-red-300',
    badgeLabel: 'Denied',
  },
};

export default function PortalApplicationStatus({ application, onNavigate }) {
  const cfg = STATE_CONFIG[application.status] || STATE_CONFIG.pending;
  const Icon = cfg.icon;
  const submittedDate = application.created_date
    ? new Date(application.created_date).toLocaleDateString()
    : null;

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div className={`border rounded-xl p-5 ${cfg.bg}`}>
        <div className="flex items-start gap-4">
          <Icon className={`w-5 h-5 ${cfg.iconColor} mt-0.5 shrink-0`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white font-semibold">{cfg.title}</p>
              <Badge className={cfg.badge + ' text-[10px]'}>{cfg.badgeLabel}</Badge>
            </div>
            {submittedDate && (
              <p className="text-gray-500 text-xs mb-2">Submitted {submittedDate}</p>
            )}
            {application.status === 'pending' && (
              <p className="text-gray-400 text-sm">Your contributor application has been submitted and is in the review queue. You'll receive an update once reviewed.</p>
            )}
            {application.status === 'needs_more_info' && (
              <div>
                <p className="text-gray-300 text-sm mb-2">The review team has a question about your application:</p>
                {application.review_notes && (
                  <div className="bg-[#1a1a1a] border border-blue-900/40 rounded-lg p-3">
                    <p className="text-blue-200 text-sm">{application.review_notes}</p>
                  </div>
                )}
              </div>
            )}
            {application.status === 'denied' && (
              <div>
                <p className="text-gray-400 text-sm mb-2">Your application was not approved at this time.</p>
                {application.review_notes && (
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3">
                    <p className="text-gray-300 text-sm">{application.review_notes}</p>
                  </div>
                )}
                <Link to={createPageUrl('Profile') + '?tab=media'}>
                  <Button size="sm" className="mt-3 bg-white text-black hover:bg-gray-100 gap-1.5 text-xs">
                    Reapply from Profile <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submission access while pending */}
      <div className="bg-[#171717] border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-white text-sm font-medium">Submit a Story While You Wait</p>
          <p className="text-gray-500 text-xs">Story submissions are open to all registered members.</p>
        </div>
        <Button size="sm" onClick={() => onNavigate('submissions')} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 shrink-0 gap-1.5 text-xs">
          Submit <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}