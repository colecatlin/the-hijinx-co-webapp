import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import IssueForm from '@/components/management/IssueForm';
import { createPageUrl } from '@/components/utils';

export default function ManageIssues() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIssue, setEditingIssue] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState([]);

  const queryClient = useQueryClient();

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['issues'],
    queryFn: () => base44.entities.OutletIssue.list('-volume'),
  });

  const deleteIssueMutation = useMutation({
    mutationFn: (id) => base44.entities.OutletIssue.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.OutletIssue.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setSelectedIssues([]);
    },
  });

  const filteredIssues = issues.filter(issue =>
    issue.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIssues(filteredIssues.map(i => i.id));
    } else {
      setSelectedIssues([]);
    }
  };

  const handleSelectIssue = (id, checked) => {
    if (checked) {
      setSelectedIssues([...selectedIssues, id]);
    } else {
      setSelectedIssues(selectedIssues.filter(iid => iid !== id));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedIssues.length} issues?`)) {
      bulkDeleteMutation.mutate(selectedIssues);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this issue?')) {
      deleteIssueMutation.mutate(id);
    }
  };

  const handleEdit = (issue) => {
    setEditingIssue(issue);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingIssue(null);
    setShowForm(true);
  };

  return (
    <ManagementLayout currentPage="ManageIssues">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link to={createPageUrl('Management')} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#232323] mb-4 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to Management
        </Link>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Issues</h1>
            <p className="text-gray-600 mt-1">Create and manage magazine issues</p>
          </div>
          <Button onClick={handleAdd} className="bg-[#232323] hover:bg-[#1A3249]">
            <Plus className="w-4 h-4 mr-2" />
            Add Issue
          </Button>
        </div>

        {showForm ? (
          <IssueForm
            issue={editingIssue}
            onClose={() => {
              setShowForm(false);
              setEditingIssue(null);
            }}
          />
        ) : (
          <>
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedIssues.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedIssues.length}
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">No issues found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={selectedIssues.length === filteredIssues.length && filteredIssues.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Title</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Volume</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Issue #</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Published</th>
                      <th className="w-32 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map((issue) => (
                      <tr key={issue.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedIssues.includes(issue.id)}
                            onCheckedChange={(checked) => handleSelectIssue(issue.id, checked)}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{issue.title}</td>
                        <td className="px-4 py-3 text-gray-600">{issue.volume}</td>
                        <td className="px-4 py-3 text-gray-600">{issue.issue_number}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded ${
                            issue.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {issue.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {issue.published_date ? new Date(issue.published_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(issue)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(issue.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </ManagementLayout>
  );
}