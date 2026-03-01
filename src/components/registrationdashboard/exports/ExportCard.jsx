import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function ExportCard({
  title,
  description,
  onExport,
  requirementsMet,
  warning,
  disabled = false,
}) {
  return (
    <Card className="bg-[#262626] border-gray-700 flex flex-col">
      <CardContent className="py-6 flex-1 flex flex-col">
        <h3 className="font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 flex-1 mb-4">{description}</p>

        {warning && (
          <div className="flex gap-2 items-start mb-4 p-2 bg-red-900/20 rounded border border-red-700/50">
            <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{warning}</p>
          </div>
        )}

        <Button
          onClick={onExport}
          disabled={!requirementsMet || disabled}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Export
        </Button>
      </CardContent>
    </Card>
  );
}