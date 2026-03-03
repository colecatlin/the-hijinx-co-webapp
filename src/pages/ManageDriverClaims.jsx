import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, ExternalLink, AlertCircle, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ManageDriverClaims() {
  const queryClient = useQueryClient();
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['allDriverClaims'],
    queryFn: () => base44.entities.DriverClaim.list('-created_date'),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['allDrivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['allTracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['allEvents'],
    queryFn: () => base44.entities.Event.list(),
  });

  const updateClaimMutation = useMutation({
    mutationFn: async ({ claimId, status, notes }) => {
      const claim = claims.find(c => c.id === claimId);
      
      // If verifying, create necessary entities and results
      if (status === 'verified' && claim) {
        let trackId = null;
        let eventId = null;
        let sessionId = null;

        // Create or find Track
        if (claim.track_name_claimed) {
          const existingTrack = tracks.find(t => 
            t.name.toLowerCase() === claim.track_name_claimed.toLowerCase()
          );
          
          if (existingTrack) {
            trackId = existingTrack.id;
          } else {
            const newTrack = await base44.asServiceRole.entities.Track.create({
              name: claim.track_name_claimed,
              location_city: 'Unknown',
              location_country: 'Unknown',
              track_type: 'Other',
              surface_type: 'Asphalt',
              status: 'Active',
            });
            trackId = newTrack.id;
          }
        }

        // Create or find Event
        const existingEvent = events.find(e => 
          e.name.toLowerCase() === claim.event_name_claimed.toLowerCase() &&
          e.event_date === claim.event_date_claimed
        );

        if (existingEvent) {
          eventId = existingEvent.id;
        } else {
          const newEvent = await base44.asServiceRole.entities.Event.create({
            name: claim.event_name_claimed,
            event_date: claim.event_date_claimed,
            series: claim.series_name_claimed || 'Unknown',
            track_id: trackId || undefined,
            status: 'completed',
          });
          eventId = newEvent.id;
        }

        // Create Session
        const newSession = await base44.asServiceRole.entities.Session.create({
          event_id: eventId,
          session_type: 'Main',
          name: 'Main Event',
          status: 'completed',
        });
        sessionId = newSession.id;

        // Create Results entry
        const newResult = await base44.asServiceRole.entities.Results.create({
          driver_id: claim.driver_id,
          session_id: sessionId,
          position: claim.position_claimed,
          series: claim.series_name_claimed || undefined,
          class: claim.class_name_claimed || undefined,
          laps_completed: claim.laps_completed_claimed || undefined,
          best_lap_time: claim.best_lap_time_claimed || undefined,
          status_text: 'Running',
        });

        // Update claim with verified result reference
        return await base44.entities.DriverClaim.update(claimId, {
          status,
          reviewer_notes: notes,
          reviewed_by: user?.email,
          reviewed_date: new Date().toISOString(),
          verified_result_id: newResult.id,
        });
      }

      // For non-verified statuses, just update the claim
      return await base44.entities.DriverClaim.update(claimId, {
        status,
        reviewer_notes: notes,
        reviewed_by: user?.email,
        reviewed_date: new Date().toISOString(),
      });
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allDriverClaims'] });
      queryClient.invalidateQueries({ queryKey: ['allEvents'] });
      queryClient.invalidateQueries({ queryKey: ['allTracks'] });
      
      // Send email notification to driver
      const claim = claims.find(c => c.id === variables.claimId);
      const driver = drivers.find(d => d.id === claim?.driver_id);
      
      if (driver?.contact_email) {
        const statusText = variables.status === 'verified' ? 'verified' : 
                          variables.status === 'rejected' ? 'rejected' : 
                          'marked as duplicate';
        
        try {
          await base44.integrations.Core.SendEmail({
            to: driver.contact_email,
            subject: `Result Claim ${statusText.charAt(0).toUpperCase() + statusText.slice(1)} - ${claim.event_name_claimed}`,
            body: `
              <p>Hello ${driver.first_name},</p>
              <p>Your submitted race result for <strong>${claim.event_name_claimed}</strong> (${format(new Date(claim.event_date_claimed), 'MMM d, yyyy')}) has been ${statusText}.</p>
              ${variables.notes ? `<p><strong>Admin Note:</strong> ${variables.notes}</p>` : ''}
              <p>You can view your profile at: ${window.location.origin}${createPageUrl('DriverProfile', { slug: driver.slug })}</p>
              <p>Best regards,<br/>HIJINX Team</p>
            `,
          });
        } catch (error) {
          console.error('Failed to send notification email:', error);
        }
      }
      
      toast.success('Claim updated successfully');
      setSelectedClaim(null);
      setReviewAction(null);
      setReviewNotes('');
    },
    onError: (error) => {
      toast.error('Failed to update claim: ' + error.message);
    },
  });

  const handleReviewSubmit = () => {
    if (!selectedClaim || !reviewAction) return;
    
    updateClaimMutation.mutate({
      claimId: selectedClaim.id,
      status: reviewAction,
      notes: reviewNotes,
    });
  };

  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown Driver';
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { className: 'bg-blue-100 text-blue-800', label: 'Pending' },
      reviewed: { className: 'bg-yellow-100 text-yellow-800', label: 'Reviewed' },
      verified: { className: 'bg-green-100 text-green-800', label: 'Verified' },
      rejected: { className: 'bg-red-100 text-red-800', label: 'Rejected' },
      duplicate: { className: 'bg-gray-100 text-gray-800', label: 'Duplicate' },
    };
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const ClaimCard = ({ claim }) => {
    const driver = drivers.find(d => d.id === claim.driver_id);
    
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-semibold">
                <Link
                  to={createPageUrl('DriverProfile', { slug: driver?.slug })}
                  className="hover:underline text-blue-600"
                >
                  {getDriverName(claim.driver_id)}
                </Link>
              </span>
            </div>
            <h4 className="text-lg font-bold">{claim.event_name_claimed}</h4>
            <p className="text-sm text-gray-600">
              {format(new Date(claim.event_date_claimed), 'MMMM d, yyyy')}
            </p>
          </div>
          {getStatusBadge(claim.status)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
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
          {claim.class_name_claimed && (
            <div>
              <span className="text-gray-500">Class:</span>
              <div className="font-medium">{claim.class_name_claimed}</div>
            </div>
          )}
        </div>

        {claim.evidence_url && (
          <div className="mb-3">
            <a
              href={claim.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              View Evidence
            </a>
          </div>
        )}

        {claim.notes && (
          <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
            <span className="font-semibold">Driver Note:</span> {claim.notes}
          </div>
        )}

        {claim.reviewer_notes && (
          <div className="mb-3 p-2 bg-yellow-50 rounded text-sm">
            <span className="font-semibold">Admin Note:</span> {claim.reviewer_notes}
          </div>
        )}

        {claim.status === 'pending' && (
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              onClick={() => {
                setSelectedClaim(claim);
                setReviewAction('verified');
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Verify
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedClaim(claim);
                setReviewAction('rejected');
              }}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedClaim(claim);
                setReviewAction('duplicate');
              }}
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              Duplicate
            </Button>
          </div>
        )}
      </Card>
    );
  };

  const pendingClaims = claims.filter(c => c.status === 'pending');
  const verifiedClaims = claims.filter(c => c.status === 'verified');
  const rejectedClaims = claims.filter(c => c.status === 'rejected' || c.status === 'duplicate');

  return (
    <ManagementLayout currentPage="ManageDriverClaims">
      <ManagementShell title="Driver Result Claims" subtitle="Review and verify driver-submitted race results">

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending">
                <Clock className="w-4 h-4 mr-2" />
                Pending ({pendingClaims.length})
              </TabsTrigger>
              <TabsTrigger value="verified">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Verified ({verifiedClaims.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                <XCircle className="w-4 h-4 mr-2" />
                Rejected ({rejectedClaims.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingClaims.length === 0 ? (
                <Card className="p-12 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No pending claims</p>
                </Card>
              ) : (
                pendingClaims.map(claim => <ClaimCard key={claim.id} claim={claim} />)
              )}
            </TabsContent>

            <TabsContent value="verified" className="space-y-4">
              {verifiedClaims.length === 0 ? (
                <Card className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No verified claims</p>
                </Card>
              ) : (
                verifiedClaims.map(claim => <ClaimCard key={claim.id} claim={claim} />)
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {rejectedClaims.length === 0 ? (
                <Card className="p-12 text-center">
                  <XCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No rejected claims</p>
                </Card>
              ) : (
                rejectedClaims.map(claim => <ClaimCard key={claim.id} claim={claim} />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'verified' && 'Verify Result Claim'}
              {reviewAction === 'rejected' && 'Reject Result Claim'}
              {reviewAction === 'duplicate' && 'Mark as Duplicate'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                {reviewAction === 'verified' && 'This will mark the result as verified. The driver will be notified.'}
                {reviewAction === 'rejected' && 'This will reject the claim. Please provide a reason below.'}
                {reviewAction === 'duplicate' && 'This will mark the claim as a duplicate of existing data.'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Admin Notes {reviewAction !== 'verified' && '(Required)'}
              </label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes for the driver..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedClaim(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReviewSubmit}
              disabled={updateClaimMutation.isPending || (reviewAction !== 'verified' && !reviewNotes)}
            >
              {updateClaimMutation.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </ManagementShell>
    </ManagementLayout>
  );
}