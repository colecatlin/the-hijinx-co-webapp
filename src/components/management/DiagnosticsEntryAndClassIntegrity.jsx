/**
 * DiagnosticsEntryAndClassIntegrity.jsx
 * Entry and Class data integrity diagnostics panel.
 * 
 * Displays:
 * - total entries/classes and normalization status
 * - duplicate entry/class groups
 * - verification status and failures
 * 
 * Actions:
 * - Run Entry Normalization
 * - Run Class Normalization
 * - Run Entry Cleanup
 * - Run Class Cleanup
 * - Run Verification
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, AlertTriangle, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function DiagnosticsEntryAndClassIntegrity() {
  const [verificationResult, setVerificationResult] = useState(null);
  const queryClient = useQueryClient();

  // Verification
  const verificationQuery = useQuery({
    queryKey: ['diag_entry_class_integrity'],
    queryFn: async () => {
      const res = await base44.asServiceRole.functions.invoke('verifyEntryAndClassIntegrity', {});
      return res?.data;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (verificationQuery.data) {
      setVerificationResult(verificationQuery.data);
    }
  }, [verificationQuery.data]);

  // Backfill Entry Normalization
  const backfillEntryMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.asServiceRole.functions.invoke('backfillEntryNormalization', {});
      return res?.data;
    },
    onSuccess: (data) => {
      toast.success(`Backfilled ${data.keys_backfilled} entries`);
      queryClient.invalidateQueries({ queryKey: ['diag_entry_class_integrity'] });
      verificationQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Backfill failed: ${err.message}`);
    },
  });

  // Backfill Class Normalization
  const backfillClassMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.asServiceRole.functions.invoke('backfillClassNormalization', {});
      return res?.data;
    },
    onSuccess: (data) => {
      const total = (data.series_class_keys_backfilled || 0) + (data.event_class_keys_backfilled || 0);
      toast.success(`Backfilled ${total} classes`);
      queryClient.invalidateQueries({ queryKey: ['diag_entry_class_integrity'] });
      verificationQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Backfill failed: ${err.message}`);
    },
  });

  // Find and Repair Entry Duplicates
  const repairEntriesMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.asServiceRole.functions.invoke('repairDuplicateEntries', {});
      return res?.data;
    },
    onSuccess: (data) => {
      toast.success(`Repaired ${data.groups_processed} entry duplicate groups`);
      queryClient.invalidateQueries({ queryKey: ['diag_entry_class_integrity'] });
      verificationQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Repair failed: ${err.message}`);
    },
  });

  // Find and Repair Class Duplicates
  const repairClassesMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.asServiceRole.functions.invoke('repairDuplicateClasses', {});
      return res?.data;
    },
    onSuccess: (data) => {
      const total = (data.series_classes_processed || 0) + (data.event_classes_processed || 0);
      toast.success(`Repaired ${total} class duplicate groups, updated ${data.references_updated} references`);
      queryClient.invalidateQueries({ queryKey: ['diag_entry_class_integrity'] });
      verificationQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Repair failed: ${err.message}`);
    },
  });

  // Re-verify
  const reverifyMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.asServiceRole.functions.invoke('verifyEntryAndClassIntegrity', {});
      return res?.data;
    },
    onSuccess: (data) => {
      setVerificationResult(data);
      toast.success('Verification complete');
    },
    onError: (err) => {
      toast.error(`Verification failed: ${err.message}`);
    },
  });

  const details = verificationResult?.details || {};
  const failures = verificationResult?.failures || [];

  const allNormalized = verificationResult?.entry_normalization_ok && verificationResult?.series_class_normalization_ok && verificationResult?.event_class_normalization_ok;
  const noDuplicates = verificationResult?.duplicate_entries_remaining === 0 && verificationResult?.duplicate_series_classes_remaining === 0 && verificationResult?.duplicate_event_classes_remaining === 0;
  const isHealthy = allNormalized && noDuplicates;

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <Card className="bg-[#262626] border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            {isHealthy ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Entry & Class Integrity Healthy</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span>Entry & Class Integrity Issues Detected</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {/* Entries */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#171717] rounded p-3 border border-gray-700">
              <p className="text-gray-400 mb-1">Total Entries</p>
              <p className="text-white font-semibold">{details.total_entries}</p>
            </div>
            <div className="bg-[#171717] rounded p-3 border border-gray-700">
              <p className="text-gray-400 mb-1">With normalized_entry_key</p>
              <p className={`font-semibold ${verificationResult?.entry_normalization_ok ? 'text-green-400' : 'text-yellow-400'}`}>
                {details.entries_with_key} / {details.total_entries}
              </p>
            </div>
            <div className="bg-[#171717] rounded p-3 border border-gray-700">
              <p className="text-gray-400 mb-1">Duplicate Groups</p>
              <p className={`font-semibold ${verificationResult?.duplicate_entries_remaining === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {verificationResult?.duplicate_entries_remaining || 0}
              </p>
            </div>
          </div>

          {/* Series Classes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#171717] rounded p-3 border border-gray-700">
              <p className="text-gray-400 mb-1">Total SeriesClasses</p>
              <p className="text-white font-semibold">{details.total_series_classes}</p>
            </div>
            <div className="bg-[#171717] rounded p-3 border border-gray-700">
              <p className="text-gray-400 mb-1">With normalized key</p>
              <p className={`font-semibold ${verificationResult?.series_class_normalization_ok ? 'text-green-400' : 'text-yellow-400'}`}>
                {details.series_classes_with_key} / {details.total_series_classes}
              </p>
            </div>
            <div className="bg-[#171717] rounded p-3 border border-gray-700">
              <p className="text-gray-400 mb-1">Duplicate Groups</p>
              <p className={`font-semibold ${verificationResult?.duplicate_series_classes_remaining === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {verificationResult?.duplicate_series_classes_remaining || 0}
              </p>
            </div>
          </div>

          {/* Event Classes */}
          {details.total_event_classes > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#171717] rounded p-3 border border-gray-700">
                <p className="text-gray-400 mb-1">Total EventClasses</p>
                <p className="text-white font-semibold">{details.total_event_classes}</p>
              </div>
              <div className="bg-[#171717] rounded p-3 border border-gray-700">
                <p className="text-gray-400 mb-1">With normalized key</p>
                <p className={`font-semibold ${verificationResult?.event_class_normalization_ok ? 'text-green-400' : 'text-yellow-400'}`}>
                  {details.event_classes_with_key} / {details.total_event_classes}
                </p>
              </div>
              <div className="bg-[#171717] rounded p-3 border border-gray-700">
                <p className="text-gray-400 mb-1">Duplicate Groups</p>
                <p className={`font-semibold ${verificationResult?.duplicate_event_classes_remaining === 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {verificationResult?.duplicate_event_classes_remaining || 0}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failures */}
      {failures.length > 0 && (
        <Alert className="bg-red-900/20 border-red-700">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300 text-xs ml-2">
            <div className="font-semibold mb-1">Issues Found:</div>
            <ul className="list-disc list-inside space-y-0.5">
              {failures.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <Card className="bg-[#262626] border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm">Repair Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => backfillEntryMutation.mutate()}
              disabled={backfillEntryMutation.isPending}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-xs h-8"
            >
              {backfillEntryMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
              Backfill Entry Keys
            </Button>

            <Button
              onClick={() => backfillClassMutation.mutate()}
              disabled={backfillClassMutation.isPending}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-xs h-8"
            >
              {backfillClassMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
              Backfill Class Keys
            </Button>

            <Button
              onClick={() => repairEntriesMutation.mutate()}
              disabled={repairEntriesMutation.isPending || verificationResult?.duplicate_entries_remaining === 0}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-xs h-8"
            >
              {repairEntriesMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
              Repair Entry Duplicates
            </Button>

            <Button
              onClick={() => repairClassesMutation.mutate()}
              disabled={repairClassesMutation.isPending || (verificationResult?.duplicate_series_classes_remaining === 0 && verificationResult?.duplicate_event_classes_remaining === 0)}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-xs h-8"
            >
              {repairClassesMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
              Repair Class Duplicates
            </Button>
          </div>

          <Button
            onClick={() => reverifyMutation.mutate()}
            disabled={reverifyMutation.isPending}
            size="sm"
            className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-xs h-8"
          >
            {reverifyMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
            Re-verify Integrity
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}