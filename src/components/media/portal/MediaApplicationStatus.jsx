import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, XCircle, AlertCircle, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Pending Review',
    message: 'Your application has been submitted and is under review. We will update you once it is processed.',
  },
  approved: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700 border-green-200',
    label: 'Approved',
    message: 'Your media contributor application has been approved. You now have contributor access.',
  },
  denied: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700 border-red-200',
    label: 'Not Approved',
    message: 'Your application was not approved at this time. See review notes below if available.',
  },
  needs_more_info: {
    icon: AlertCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    label: 'More Info Needed',
    message: 'The review team has requested additional information. Please check the notes below.',
  },
  withdrawn: {
    icon: XCircle,
    color: 'text-gray-500',
    bg: 'bg-gray-50 border-gray-200',
    badge: 'bg-gray-100 text-gray-600 border-gray-200',
    label: 'Withdrawn',
    message: 'Your application was withdrawn.',
  },
};

export default function MediaApplicationStatus({ application, isContributor }) {
  if (isContributor) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-800">Approved Contributor</p>
          <p className="text-xs text-green-700 mt-0.5">
            You have approved media contributor access on this platform.
          </p>
          <div className="mt-3">
            <Link to={createPageUrl('MediaPortal')}>
              <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white gap-1.5 text-xs">
                <Camera className="w-3.5 h-3.5" /> Open Media Portal
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!application) return null;

  const config = STATUS_CONFIG[application.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className={`p-4 border rounded-xl ${config.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-gray-900">Media Application</p>
            <Badge className={`text-xs border ${config.badge}`}>{config.label}</Badge>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{config.message}</p>

          {application.review_notes && (
            <div className="mt-2 p-2 bg-white/70 border border-gray-200 rounded-lg">
              <p className="text-xs font-medium text-gray-700">Review Notes:</p>
              <p className="text-xs text-gray-600 mt-0.5">{application.review_notes}</p>
            </div>
          )}

          {application.created_date && (
            <p className="text-xs text-gray-400 mt-2">
              Submitted {(() => { try { return format(new Date(application.created_date), 'MMM d, yyyy'); } catch { return ''; } })()}
              {application.reviewed_at && ` · Reviewed ${(() => { try { return format(new Date(application.reviewed_at), 'MMM d, yyyy'); } catch { return ''; } })()}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}