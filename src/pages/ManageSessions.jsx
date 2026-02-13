import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function ManageSessions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionForEdit, setSelectedSessionForEdit] = useState(null);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list('-created_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Session.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const filteredSessions = sessions.filter(session =>
    session.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedSessionForEdit) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setSelectedSessionForEdit(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-black mb-2">{selectedSessionForEdit.name}</h1>
              <p className="text-gray-600">Manage all session data</p>
            </div>
          </div>

          <Tabs defaultValue="core" className="mt-6">
            <TabsList>
              <TabsTrigger value="core">Core Details</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>
            <TabsContent value="core" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">Session core details editor coming soon</p>
              </div>
            </TabsContent>
            <TabsContent value="results" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">Results management coming soon</p>
              </div>
            </TabsContent>
            <TabsContent value="stats" className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">Stats management coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Management')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-black mb-2">Manage Sessions</h1>
            <p className="text-gray-600">{sessions.length} total sessions</p>
          </div>
          <Button className="bg-gray-900">
            <Plus className="w-4 h-4 mr-2" />
            Add Session
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Laps</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSessions.map(session => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{session.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{session.session_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{session.laps || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        session.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedSessionForEdit(session)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${session.name}?`)) {
                            deleteMutation.mutate(session.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}