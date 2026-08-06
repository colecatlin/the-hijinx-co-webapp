/**
 * REVISION R8J PART 2 — WorkspaceRedirectCard
 * Navigates directly to /race-control/events/:eventId/:panel.
 * Falls back to legacy onOpenWorkspace behavior when no eventId is available.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, FolderOpen } from 'lucide-react';

export default function WorkspaceRedirectCard({ 
  moduleName = 'Module',
  description = 'This module now lives inside the Event Workspace so all event operations stay inside the same event file.',
  panel = 'overview',
  eventId,
  onOpenWorkspace,
}) {
  const navigate = useNavigate();

  const handleOpen = () => {
    if (eventId) {
      navigate(`/race-control/events/${eventId}/${panel}`);
    } else if (onOpenWorkspace) {
      // Legacy fallback — still works for embedded workspace flows
      onOpenWorkspace(panel);
    }
  };

  return (
    <Card className="bg-surface border-divider">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-motion" /> 
          {moduleName} — Now in Event Files
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-foreground-quiet text-sm">
          {description}
        </p>
        <Button
          onClick={handleOpen}
          disabled={!eventId && !onOpenWorkspace}
          className="bg-motion hover:bg-motion-hover gap-2"
        >
          <FolderOpen className="w-4 h-4" />
          {eventId ? `Open Event File — ${moduleName}` : 'Select an event to continue'}
        </Button>
        {!eventId && (
          <p className="text-foreground-quiet text-xs">
            Select an event in the context bar above to open this module.
          </p>
        )}
      </CardContent>
    </Card>
  );
}