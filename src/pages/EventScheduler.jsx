import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import { createPageUrl } from '@/components/utils';
import EventSchedulerForm from '@/components/management/EventScheduler/EventSchedulerForm';

export default function EventScheduler() {
  const { seriesId } = useParams();
  const navigate = useNavigate();

  const { data: series, isLoading } = useQuery({
    queryKey: ['series-for-scheduler', seriesId],
    queryFn: () => base44.entities.Series.get(seriesId),
    enabled: !!seriesId,
  });

  const handleSuccess = (event) => {
    navigate(`/race-core/events/${event.id}`);
  };

  return (
    <ManagementLayout currentPage="EventScheduler">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('RegistrationDashboard'))}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">
              Race Core / Event Scheduler
            </p>
            <h1 className="text-4xl font-black mb-2">
              {isLoading ? 'Loading...' : `Schedule Events for ${series?.name || 'Series'}`}
            </h1>
            <p className="text-gray-500 text-sm">
              Create events with multiple rounds/sessions in one quick form
            </p>
          </div>
        </div>

        {!isLoading && series && (
          <EventSchedulerForm
            seriesId={seriesId}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </ManagementLayout>
  );
}