import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Upload, Download, Trash2, RefreshCw, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function CSVFileManager() {
  const [uploadFile, setUploadFile] = useState(null);
  const queryClient = useQueryClient();

  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ['csvFiles'],
    queryFn: async () => {
      const res = await base44.functions.invoke('googleDriveCSV', { action: 'list' });
      return res.data.files || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const content = await file.text();
      const res = await base44.functions.invoke('googleDriveCSV', {
        action: 'upload',
        fileName: file.name,
        fileContent: content,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csvFiles'] });
      setUploadFile(null);
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (fileId) => {
      const res = await base44.functions.invoke('googleDriveCSV', { action: 'download', fileId });
      return res.data.content;
    },
    onSuccess: (content, fileId) => {
      const file = files.find(f => f.id === fileId);
      const blob = new Blob([content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file?.name || 'file.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId) => {
      const res = await base44.functions.invoke('googleDriveCSV', { action: 'delete', fileId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csvFiles'] });
    },
  });

  const handleUpload = () => {
    if (uploadFile) {
      uploadMutation.mutate(uploadFile);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">CSV File Manager</h2>
        <p className="text-gray-600">Upload and manage CSV files for drivers, tracks, teams, series, and standings in Google Drive</p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="flex-1"
            />
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || uploadMutation.isPending}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No CSV files yet. Upload one to get started.</p>
          </div>
        ) : (
          files.map((file, idx) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{file.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(file.modifiedTime), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadMutation.mutate(file.id)}
                      disabled={downloadMutation.isPending}
                      className="gap-1"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(file.id)}
                      disabled={deleteMutation.isPending}
                      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}