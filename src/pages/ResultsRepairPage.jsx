/**
 * ResultsRepairPage — R9CC
 * RaceCore data utility: Smart Results Import + Bulk Upload repair tools.
 * Route: /racecore/data/results-repair
 *
 * No general results CRUD. No event operations. No publish controls.
 * Results editing lives in EventFile only.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import RaceCorePageShell from '@/components/racecore/RaceCorePageShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Wrench } from 'lucide-react';
import SmartResultsImport from '@/components/management/results/SmartResultsImport';
import ResultsBulkUpload from '@/components/management/results/ResultsBulkUpload';

export default function ResultsRepairPage({ embedded = false }) {
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (userLoading) return null;
  if (!currentUser) { base44.auth.redirectToLogin(); return null; }
  if (currentUser.role !== 'admin') {
    return (
      <RaceCorePageShell
        title="Results Repair"
        description="RaceCore data repair tooling"
        icon={Wrench}
      >
        <div className="py-20 text-center text-gray-600 text-sm">Admin access required.</div>
      </RaceCorePageShell>
    );
  }

  return (
    <RaceCorePageShell
      title="Results Repair"
      description="Smart import and bulk upload tools for historical or corrective result data"
      icon={Wrench}
    >
      <div className="space-y-4">

        <div className="px-4 py-3 rounded-lg border text-xs" style={{ borderColor: 'rgba(29,161,161,0.25)', background: 'rgba(29,161,161,0.06)', color: 'rgba(255,255,255,0.5)' }}>
          Active result entry, publishing, and standings workflow are managed inside{' '}
          <span className="text-teal-400 font-medium">EventFile → Results</span>.
          This page is for data repair and historical imports only.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-200 flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-500" /> Smart Season Import
              </CardTitle>
              <CardDescription className="text-xs text-gray-600">
                Auto-detect entity mapping and import a full season of results from a structured CSV.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowSmartImport(true)}
                className="w-full bg-teal-700 hover:bg-teal-600 text-white"
              >
                <Upload className="w-4 h-4 mr-2" /> Open Smart Import
              </Button>
            </CardContent>
          </Card>

          <Card style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-200 flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-500" /> Bulk Upload
              </CardTitle>
              <CardDescription className="text-xs text-gray-600">
                Upload a results CSV file to create or repair result records in bulk.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowBulkUpload(true)}
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Upload className="w-4 h-4 mr-2" /> Open Bulk Upload
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Smart Import Dialog */}
      <Dialog open={showSmartImport} onOpenChange={setShowSmartImport}>
        <DialogContent className="max-w-2xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle className="text-gray-200">Smart Season Import</DialogTitle>
          </DialogHeader>
          <SmartResultsImport onDone={() => setShowSmartImport(false)} />
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent className="max-w-2xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle className="text-gray-200">Bulk Upload Results</DialogTitle>
          </DialogHeader>
          <ResultsBulkUpload onDone={() => setShowBulkUpload(false)} />
        </DialogContent>
      </Dialog>
    </RaceCorePageShell>
  );
}