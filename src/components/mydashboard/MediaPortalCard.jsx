import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/components/utils';
import { Camera, ExternalLink, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const STATUS_CONFIG = {
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200', Icon: CheckCircle2 },
  pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700 border-amber-200', Icon: Clock },
  rejected: { label: 'Not Approved', color: 'bg-red-100 text-red-700 border-red-200', Icon: AlertCircle },
};

export default function MediaPortalCard({ mediaProfile }) {
  if (!mediaProfile) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
            <Camera className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Media Access</p>
            <p className="text-xs text-gray-400">Apply for media credentials and access.</p>
          </div>
        </div>
        <Link to={createPageUrl('MediaApply')}>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 flex-shrink-0">
            Apply <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    );
  }

  const statusKey = mediaProfile.status || 'pending';
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
  const { label, color } = statusCfg;
  const StatusIcon = statusCfg.Icon;

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-center flex-shrink-0">
          <Camera className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">Media Portal</p>
            <Badge className={`text-xs px-2 py-0.5 border ${color}`}>
              <Icon className="w-3 h-3 mr-1 inline" />{label}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{mediaProfile.full_name || mediaProfile.organization_id || 'Media User'}</p>
        </div>
      </div>
      {statusKey === 'approved' && (
        <Link to={createPageUrl('MediaPortal')}>
          <Button size="sm" className="text-xs gap-1.5 bg-teal-700 hover:bg-teal-800 text-white flex-shrink-0">
            Open Portal <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      )}
    </div>
  );
}