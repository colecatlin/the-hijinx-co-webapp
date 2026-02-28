import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function APISyncResults({ sessionId, eventId, isLocked }) {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Would call a backend function to sync from timing system API
      console.log('Syncing results from API');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSynced(true);
      setLastSync(new Date());
    } catch (error) {
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  if (isLocked) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>This session is locked. Results cannot be synced without unlocking.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <Zap className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <p className="text-blue-900 mb-4 font-semibold">Connect to Timing System</p>
        <p className="text-sm text-blue-800 mb-6">
          Automatically fetch results from your timing and scoring system API
        </p>
        <Button
          onClick={handleSync}
          disabled={syncing || synced}
          className="gap-2"
        >
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Syncing...
            </>
          ) : synced ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Synced
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Start Sync
            </>
          )}
        </Button>
      </div>

      {lastSync && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Last synced: {lastSync.toLocaleString()}
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          API sync requires configuring your timing system connection in settings
        </AlertDescription>
      </Alert>
    </div>
  );
}