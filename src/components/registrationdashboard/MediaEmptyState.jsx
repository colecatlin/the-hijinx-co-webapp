import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function MediaEmptyState({ state, onAction }) {
  // state: 'no_org' | 'no_event' | 'no_data'

  const config = {
    no_org: {
      title: 'Select Organization',
      message: 'Select a Track or Series to manage media requests, policies, and credentials.',
      buttonLabel: null,
    },
    no_event: {
      title: 'Select Event (Optional)',
      message: 'Select an Event to manage event-scoped media requests, or stay at org level to manage ongoing credentials and policies.',
      buttonLabel: 'Open Event Builder',
    },
    no_data: {
      title: 'No Media Activity Yet',
      message: 'No media activity yet. When media applies, requests will appear here.',
      buttonLabel: 'View Policies',
    },
  };

  const current = config[state] || config.no_org;

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardContent className="py-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="w-10 h-10 text-gray-500" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">{current.title}</h3>
            <p className="text-sm text-gray-400 max-w-md">{current.message}</p>
          </div>
          {current.buttonLabel && (
            <Button
              onClick={onAction}
              className="mt-2 bg-blue-700 hover:bg-blue-600"
            >
              {current.buttonLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}