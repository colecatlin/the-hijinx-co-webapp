import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ENTITY_TYPES = [
  'Driver', 'Team', 'Track', 'Series', 'Event', 'Results', 'Session',
  'SeriesClass', 'DriverProgram', 'DriverClaim', 'Standings', 'PointsConfig',
  'OutletStory', 'OutletIssue', 'Product', 'StorySubmission', 'CreativeInquiry',
  'NewsletterSubscriber', 'ContactMessage', 'Announcement', 'FoodBeverage', 'Tech',
  'Invitation', 'EntityCollaborator', 'DriverMedia', 'Advertisement', 'AdAnalytics',
  'UserFollowDriver', 'HomepageSettings'
];

export default function ManageCSVImportExport() {
  const [selectedEntity, setSelectedEntity] = useState('Driver');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);

  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleExport = async () => {
    setLoading(true);
    setStatus(null);
    
    try {
      const response = await base44.functions.invoke('csvEntityManager', {
        action: 'export',
        entityType: selectedEntity
      });

      downloadFile(response.data, `${selectedEntity}_export.csv`);
      setStatus({ type: 'success', message: `Exported ${selectedEntity} data successfully` });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const response = await base44.functions.invoke('csvEntityManager', {
        action: 'export',
        entityType: selectedEntity,
        templateOnly: true
      });

      downloadFile(response.data, `${selectedEntity}_template.csv`);
      setStatus({ type: 'success', message: `Downloaded ${selectedEntity} template successfully` });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setStatus({ type: 'error', message: 'Please select a CSV file' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/functions/csvEntityManager', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Function-Payload': JSON.stringify({
            action: 'import',
            entityType: selectedEntity
          })
        }
      });

      // Alternative: use the function through base44 directly with file handling
      // For now, let's use a simpler approach that works with the SDK
      
      const fileContent = await file.text();
      const response2 = await base44.functions.invoke('csvEntityManager', {
        action: 'import',
        entityType: selectedEntity,
        csvContent: fileContent
      });

      const result = response2.data;
      setStatus({
        type: 'success',
        message: `Import complete: ${result.created} created, ${result.updated} updated, ${result.failed} failed`,
        details: result.errors
      });
      setFile(null);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">CSV Import/Export</h1>
        <p className="text-gray-600">Bulk import and export entity data as CSV files</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entity Type</CardTitle>
          <CardDescription>Select the entity you want to import or export</CardDescription>
        </CardHeader>
        <CardContent className="mb-6">
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-96">
              {ENTITY_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="export" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export {selectedEntity}</CardTitle>
              <CardDescription>Download all {selectedEntity} records as CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleExport}
                disabled={loading}
                className="gap-2 w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export All Data
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownloadTemplate}
                disabled={loading}
                variant="outline"
                className="gap-2 w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Template
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import {selectedEntity}</CardTitle>
              <CardDescription>Upload a CSV file to create or update records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={loading}
                  className="w-full"
                />
                {file && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={loading || !file}
                className="gap-2 w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import CSV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {status && (
        <Alert className={`mt-6 ${status.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex gap-3">
            {status.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <AlertDescription className={status.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {status.message}
              </AlertDescription>
              {status.details && status.details.length > 0 && (
                <div className="mt-3 text-xs space-y-1">
                  {status.details.slice(0, 5).map((err, idx) => (
                    <div key={idx} className="text-gray-700">
                      Row {err.row}: {err.error}
                    </div>
                  ))}
                  {status.details.length > 5 && (
                    <div className="text-gray-700">
                      +{status.details.length - 5} more errors
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}