import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportButton({ entityName, data, columns, filename }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('exportToGoogleSheets', {
        entityName,
        filename,
        data,
        columns,
      });

      if (response.data.success) {
        toast.success(`Exported to ${response.data.filename}`);
        if (response.data.webViewLink) {
          window.open(response.data.webViewLink, '_blank');
        }
      } else {
        toast.error('Export failed');
      }
    } catch (error) {
      toast.error('Export error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isLoading || !data || data.length === 0}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      Export to Sheets
    </Button>
  );
}