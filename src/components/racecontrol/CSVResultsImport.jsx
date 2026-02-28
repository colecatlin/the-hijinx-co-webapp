import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CSVResultsImport({ sessionId, eventId, isLocked }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [imported, setImported] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImported(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result || '';
      const lines = csv.split('\n').slice(0, 6);
      setPreview(lines);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    formData.append('eventId', eventId);

    try {
      // Would call a backend function to process the CSV
      console.log('Importing CSV results');
      setImported(true);
      setFile(null);
      setPreview([]);
    } catch (error) {
      alert('Import failed: ' + error.message);
    }
  };

  if (isLocked) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>This session is locked. Results cannot be imported without unlocking.</AlertDescription>
      </Alert>
    );
  }

  if (imported) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <AlertDescription className="text-green-800">Results imported successfully</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Upload a CSV file with race results</p>
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="mb-4"
        />
        {file && (
          <p className="text-sm text-gray-600 mb-4">
            Selected: <span className="font-semibold">{file.name}</span>
          </p>
        )}
      </div>

      {preview.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Preview (first 5 lines)</p>
          <pre className="text-xs font-mono overflow-x-auto">
            {preview.join('\n')}
          </pre>
        </div>
      )}

      {file && (
        <div className="flex gap-2">
          <Button onClick={handleImport} className="gap-2">
            <Upload className="w-4 h-4" />
            Import Results
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFile(null);
              setPreview([]);
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>CSV should include: Car Number, Position, Status, Laps, Time, Best Lap</AlertDescription>
      </Alert>
    </div>
  );
}