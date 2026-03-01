import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function ResultsCSVUpload({ session, drivers, driverPrograms }) {
  const [csvText, setCsvText] = useState('');
  const [columnMapping, setColumnMapping] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [step, setStep] = useState('upload'); // upload, mapping, preview
  const queryClient = useQueryClient();

  const csvColumns = [
    'Car Number',
    'Driver First Name',
    'Driver Last Name',
    'Team',
    'Finish Position',
    'Status',
    'Laps Completed',
    'Best Lap Time (ms)',
    'Points',
    'Notes',
  ];

  const resultFields = [
    'car_number',
    'driver_id',
    'team_id',
    'position',
    'status',
    'laps_completed',
    'best_lap_time_ms',
    'points',
    'notes',
  ];

  const handleCSVPaste = (text) => {
    setCsvText(text);
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    const initialMapping = {};
    csvColumns.forEach((col) => {
      const match = headers.find((h) =>
        h.toLowerCase().includes(col.toLowerCase().split(' ')[0])
      );
      if (match) {
        initialMapping[col] = headers.indexOf(match);
      }
    });
    setColumnMapping(initialMapping);
    setStep('mapping');
  };

  const parseCSV = () => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c) => c.trim());
      const row = {};
      csvColumns.forEach((col) => {
        const colIndex = columnMapping[col];
        if (colIndex !== undefined && cells[colIndex]) {
          row[col] = cells[colIndex];
        }
      });
      rows.push(row);
    }

    setPreviewData(rows);
    setStep('preview');
  };

  const importMutation = useMutation({
    mutationFn: async (resultsData) => {
      // Create/update Results records
      for (const result of resultsData) {
        await base44.entities.Results.create(result);
      }

      // Log operation
      await base44.functions.invoke('logOperation', {
        operation_type: 'import',
        source_type: 'csv',
        entity_name: 'Results',
        function_name: 'ResultsConsoleCSVImport',
        status: 'completed',
        total_records: resultsData.length,
        created_records: [
          {
            entity: 'Results',
            ids: resultsData.map((r) => r.id),
          },
        ],
      });

      // Update session status
      await base44.entities.Session.update(session.id, { status: 'Draft' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Results imported successfully');
      setCsvText('');
      setPreviewData([]);
      setStep('upload');
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const handleImport = () => {
    const resultsData = previewData.map((row) => {
      const driverName = `${row['Driver First Name']} ${row['Driver Last Name']}`;
      const driver = drivers.find(
        (d) =>
          `${d.first_name} ${d.last_name}`.toLowerCase() ===
          driverName.toLowerCase()
      );

      return {
        driver_id: driver?.id || '',
        program_id: '', // Would be set if we had more context
        event_id: session.event_id,
        session_id: session.id,
        position: parseInt(row['Finish Position']) || 0,
        status: row['Status'] || 'Running',
        laps_completed: parseInt(row['Laps Completed']) || 0,
        best_lap_time_ms: parseInt(row['Best Lap Time (ms)']) || 0,
        points: parseInt(row['Points']) || 0,
        notes: row['Notes'] || `car_number_entered: ${row['Car Number']}`,
      };
    });

    importMutation.mutate(resultsData);
  };

  return (
    <div className="space-y-4">
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center bg-[#0A0A0A]">
            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm mb-4">
              Paste CSV text or upload a file
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste CSV data here (headers required)"
              className="w-full h-32 bg-[#171717] border border-gray-700 rounded p-3 text-white text-sm font-mono"
            />
            <div className="flex gap-2 mt-4 justify-center">
              <Button variant="outline" className="border-gray-700">
                <Upload className="w-4 h-4 mr-2" /> Upload File
              </Button>
              <Button
                onClick={() => handleCSVPaste(csvText)}
                disabled={!csvText.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-4">
          <Card className="bg-[#262626] border-gray-700">
            <CardContent className="pt-6">
              <h3 className="text-white text-sm font-semibold mb-4">
                Map CSV columns to Result fields
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {csvColumns.map((csvCol, idx) => (
                  <div key={csvCol}>
                    <label className="text-xs text-gray-400 mb-2 block">
                      {csvCol}
                    </label>
                    <Select
                      value={(columnMapping[csvCol] ?? '').toString()}
                      onValueChange={(val) =>
                        setColumnMapping({
                          ...columnMapping,
                          [csvCol]: parseInt(val),
                        })
                      }
                    >
                      <SelectTrigger className="bg-[#171717] border-gray-700 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#171717] border-gray-700">
                        <SelectItem value={null} className="text-white">
                          Skip
                        </SelectItem>
                        {csvText
                          .split('\n')[0]
                          .split(',')
                          .map((col, i) => (
                            <SelectItem
                              key={i}
                              value={i.toString()}
                              className="text-white"
                            >
                              {col.trim()}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep('upload')}
                  className="border-gray-700"
                >
                  Back
                </Button>
                <Button
                  onClick={parseCSV}
                  className="bg-blue-600 hover:bg-blue-700 ml-auto"
                >
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-[#262626]">
                <TableRow>
                  {csvColumns.map((col) => (
                    <TableHead key={col} className="text-gray-400 text-xs">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 10).map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-[#262626]">
                    {csvColumns.map((col) => (
                      <TableCell key={col} className="text-gray-300 text-xs">
                        {row[col] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {previewData.length > 10 && (
            <p className="text-xs text-gray-400">
              Showing 10 of {previewData.length} rows
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep('mapping')}
              className="border-gray-700"
            >
              Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="bg-green-600 hover:bg-green-700 ml-auto"
            >
              {importMutation.isPending ? 'Importing...' : 'Import Results'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}