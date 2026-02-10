import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

import DriverEditor from './DriverEditor';

export default function EntityEditor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const accessCode = searchParams.get('id');

  const { data: entityData, isLoading, error } = useQuery({
    queryKey: ['entity', accessCode],
    queryFn: async () => {
      const response = await base44.functions.invoke('getEntityWithAccess', { accessCode });
      return response.data;
    },
    enabled: !!accessCode,
  });

  if (!accessCode) {
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p className="text-gray-500">No access code provided.</p>
          <Button onClick={() => navigate(createPageUrl('Home'))} className="mt-4">
            Back Home
          </Button>
        </div>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-6 py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </PageShell>
    );
  }

  if (!entityData || error) {
    const isAccessDenied = error?.response?.status === 403;
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p className="text-gray-500">
            {isAccessDenied ? 'You do not have access to this entity.' : 'Entity not found.'}
          </p>
          <Button onClick={() => navigate(createPageUrl('Home'))} className="mt-4">
            Back Home
          </Button>
        </div>
      </PageShell>
    );
  }

  const { entityType, entityId } = entityData;

  // Route to the appropriate editor based on entity type
  switch (entityType) {
    case 'Driver':
      return <DriverEditor driverId={entityId} />;
    case 'Series':
      return <div>Series Editor coming soon</div>;
    case 'Team':
      return <div>Team Editor coming soon</div>;
    case 'Track':
      return <div>Track Editor coming soon</div>;
    case 'StandingsEntry':
      return <div>Standings Editor coming soon</div>;
    default:
      return (
        <PageShell>
          <div className="max-w-6xl mx-auto px-6 py-12">
            <p className="text-gray-500">Unknown entity type: {entityType}</p>
            <Button onClick={() => navigate(createPageUrl('Home'))} className="mt-4">
              Back Home
            </Button>
          </div>
        </PageShell>
      );
  }
}