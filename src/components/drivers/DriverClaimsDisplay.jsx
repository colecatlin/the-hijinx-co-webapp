import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function DriverClaimsDisplay({ driverId }) {
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['driverClaims', driverId],
    queryFn: () => base44.entities.DriverClaim.filter({ driver_id: driverId }),
    enabled: !!driverId,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </Card>
    );
  }

  if (claims.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>No submitted results yet</p>
      </Card>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'duplicate':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-blue-100 text-blue-800',
      reviewed: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      duplicate: 'bg-gray-100 text-gray-800',
    };
    return variants[status] || variants.pending;
  };

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <Card key={claim.id} className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(claim.status)}
              <h4 className="font-bold">{claim.event_name_claimed}</h4>
            </div>
            <Badge className={getStatusBadge(claim.status)}>
              {claim.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
            <div>
              <span className="text-gray-500">Date:</span>
              <div className="font-medium">
                {format(new Date(claim.event_date_claimed), 'MMM d, yyyy')}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Position:</span>
              <div className="font-medium">{claim.position_claimed}</div>
            </div>
            {claim.track_name_claimed && (
              <div>
                <span className="text-gray-500">Track:</span>
                <div className="font-medium">{claim.track_name_claimed}</div>
              </div>
            )}
            {claim.series_name_claimed && (
              <div>
                <span className="text-gray-500">Series:</span>
                <div className="font-medium">{claim.series_name_claimed}</div>
              </div>
            )}
          </div>

          {claim.evidence_url && (
            <div className="mb-2">
              <a
                href={claim.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View Evidence
              </a>
            </div>
          )}

          {claim.reviewer_notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
              <div className="font-semibold text-gray-700 mb-1">Admin Note:</div>
              <div className="text-gray-600">{claim.reviewer_notes}</div>
            </div>
          )}

          {claim.notes && (
            <div className="mt-2 text-xs text-gray-600">
              <span className="font-semibold">Note:</span> {claim.notes}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}