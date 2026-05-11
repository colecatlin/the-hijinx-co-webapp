/**
 * REVISION R7E PART 5 — WorkspaceRedirectCard
 * Reusable component for redirecting legacy tabs to Event Workspace panels.
 * 
 * Purpose: Provide consistent UX for legacy module redirects during R7E migration.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, LayoutDashboard } from 'lucide-react';

export default function WorkspaceRedirectCard({ 
  moduleName = 'Module',
  description = 'This module now lives inside the Event Workspace so all event operations stay inside the same event file.',
  panel = 'overview',
  onOpenWorkspace 
}) {
  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-blue-400" /> 
          {moduleName} Moved to Event Workspace
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-400 text-sm">
          {description}
        </p>
        <p className="text-gray-500 text-xs">
          Legacy navigation is being preserved during migration.
        </p>
        <Button
          onClick={() => onOpenWorkspace(panel)}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          Open Event Workspace {moduleName}
        </Button>
      </CardContent>
    </Card>
  );
}