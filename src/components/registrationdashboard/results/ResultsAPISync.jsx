import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResultsAPISync({ session }) {
  const [loading, setLoading] = useState(false);

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke('syncTimingTest', {
        event_id: session.event_id,
        session_id: session.id,
      });
      toast.success('Timing system connection test not yet implemented');
    } catch (error) {
      toast.error('Timing system connection test not yet implemented');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke('syncTimingNow', {
        event_id: session.event_id,
        session_id: session.id,
      });
      toast.success('Timing data sync not yet implemented');
    } catch (error) {
      toast.error('Timing data sync not yet implemented');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#262626] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Timing System Integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-[#171717] rounded-lg border border-yellow-900/50">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-400 font-medium mb-1">
                Timing integration coming soon
              </p>
              <p className="text-xs text-gray-400">
                This feature will allow you to sync live timing data from connected
                timing systems (RaceHero, MyLaps, etc.).
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              Connection Status
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-sm text-gray-400">Not configured</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              Last Sync
            </p>
            <span className="text-sm text-gray-400">Never</span>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={loading}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Test Connection
          </Button>
          <Button
            onClick={handleSyncNow}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}