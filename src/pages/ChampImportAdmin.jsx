import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import ImportRunsList from '@/components/champ-import/ImportRunsList';
import ReconciliationPanel from '@/components/champ-import/ReconciliationPanel';
import StagingReviewPanel from '@/components/champ-import/StagingReviewPanel';
import { AlertTriangle, Play, RefreshCw, CheckCircle } from 'lucide-react';

export default function ChampImportAdmin() {
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [activeTab, setActiveTab] = useState('runs');
  const [reconcileReport, setReconcileReport] = useState(null);
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const startResultsMutation = useMutation({
    mutationFn: () => base44.functions.invoke('importChamp2025Results', {}),
    onSuccess: (res) => {
      toast.success(`Results import started — run ID: ${res.data?.import_run_id}`);
      qc.invalidateQueries({ queryKey: ['importRuns'] });
      if (res.data?.import_run_id) {
        setSelectedRunId(res.data.import_run_id);
        setActiveTab('staging');
      }
    },
    onError: (e) => toast.error(`Import failed: ${e.message}`),
  });

  const startStandingsMutation = useMutation({
    mutationFn: () => base44.functions.invoke('importChamp2025Standings', {}),
    onSuccess: (res) => {
      toast.success(`Standings import started — run ID: ${res.data?.import_run_id}`);
      qc.invalidateQueries({ queryKey: ['importRuns'] });
      if (res.data?.import_run_id) {
        setSelectedRunId(res.data.import_run_id);
        setActiveTab('staging');
      }
    },
    onError: (e) => toast.error(`Import failed: ${e.message}`),
  });

  const reconcileMutation = useMutation({
    mutationFn: () => base44.functions.invoke('reconcileChampImport', { importRunId: selectedRunId }),
    onSuccess: (res) => {
      setReconcileReport(res.data);
      setActiveTab('reconcile');
      toast.success('Reconciliation complete');
    },
    onError: (e) => toast.error(`Reconciliation failed: ${e.message}`),
  });

  const applyMutation = useMutation({
    mutationFn: (opts) => base44.functions.invoke('applyChampImport', { importRunId: selectedRunId, ...opts }),
    onSuccess: (res) => {
      toast.success(`Applied: ${res.data?.results_created} results, ${res.data?.standings_applied} standings`);
      qc.invalidateQueries({ queryKey: ['importRuns'] });
    },
    onError: (e) => toast.error(`Apply failed: ${e.message}`),
  });

  const rollbackMutation = useMutation({
    mutationFn: () => base44.functions.invoke('rollbackChampImport', { importRunId: selectedRunId, dry_run: false }),
    onSuccess: () => {
      toast.success('Rollback complete');
      qc.invalidateQueries({ queryKey: ['importRuns'] });
    },
    onError: (e) => toast.error(`Rollback failed: ${e.message}`),
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-500">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
        Admin access required.
      </div>
    );
  }

  const isRunning = startResultsMutation.isPending || startStandingsMutation.isPending;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CHAMP Off Road 2025 Import</h1>
        <p className="text-sm text-gray-500 mt-1">Staged import pipeline — results and standings from champoffroad.com</p>
      </div>

      {/* Top action bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <Button
          onClick={() => startResultsMutation.mutate()}
          disabled={isRunning}
          className="bg-slate-800 text-white hover:bg-slate-700"
        >
          <Play className="w-4 h-4 mr-2" />
          Import Results
        </Button>
        <Button
          onClick={() => startStandingsMutation.mutate()}
          disabled={isRunning}
          variant="outline"
        >
          <Play className="w-4 h-4 mr-2" />
          Import Standings
        </Button>

        {selectedRunId && (
          <>
            <div className="h-4 border-l border-slate-300" />
            <span className="text-xs text-slate-500 font-mono">Run: {selectedRunId}</span>
            <Button
              onClick={() => reconcileMutation.mutate()}
              disabled={reconcileMutation.isPending}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reconcile
            </Button>
            {reconcileReport && (
              <Button
                onClick={() => applyMutation.mutate({ apply_results: true, apply_standings: true })}
                disabled={applyMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Apply Import
              </Button>
            )}
            <Button
              onClick={() => { if (window.confirm('Rollback this import? This deletes all records created by this run.')) rollbackMutation.mutate(); }}
              disabled={rollbackMutation.isPending}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Rollback
            </Button>
          </>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="runs">Import Runs</TabsTrigger>
          <TabsTrigger value="staging" disabled={!selectedRunId}>Staging Data</TabsTrigger>
          <TabsTrigger value="reconcile" disabled={!reconcileReport}>Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="runs">
          <ImportRunsList
            selectedRunId={selectedRunId}
            onSelect={(id) => { setSelectedRunId(id); setReconcileReport(null); setActiveTab('staging'); }}
          />
        </TabsContent>

        <TabsContent value="staging">
          {selectedRunId && <StagingReviewPanel importRunId={selectedRunId} />}
        </TabsContent>

        <TabsContent value="reconcile">
          {reconcileReport && <ReconciliationPanel report={reconcileReport} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}