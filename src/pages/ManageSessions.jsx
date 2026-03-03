import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
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

  const operationalStatuses = ['Provisional', 'Official', 'Locked'];
  const isOperationalSession = (session) => operationalStatuses.includes(session.status);

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
      <ManagementLayout currentPage="ManageSessions">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <h3 className="font-bold text-blue-900 mb-1">Session Lifecycle Notice</h3>
            <p className="text-sm text-blue-800">Session lifecycle transitions (Provisional, Official, Locked) are managed exclusively through RegistrationDashboard.</p>
          </div>

          {isOperationalSession(selectedSessionForEdit) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-red-800"><strong>Operational Session:</strong> Lifecycle fields are locked. Modify through RegistrationDashboard only.</p>
            </div>
          )}

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
                {isOperationalSession(selectedSessionForEdit) ? (
                  <div className="space-y-4">
                    <p className="text-gray-600 font-medium">Session core details editor</p>
                    <div className="grid grid-cols-2 gap-6 mt-4 opacity-60">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Session Name</label>
                        <p className="mt-1 text-base text-gray-700">{selectedSessionForEdit.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Type (Locked)</label>
                        <p className="mt-1 text-base text-gray-700">{selectedSessionForEdit.session_type}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Laps</label>
                        <p className="mt-1 text-base text-gray-700">{selectedSessionForEdit.laps || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status (Locked)</label>
                        <p className="mt-1 text-base text-gray-700">{selectedSessionForEdit.status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Advancement Rules (Locked)</label>
                        <p className="mt-1 text-base text-gray-700">{selectedSessionForEdit.advancement_rules || 'None'}</p>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-sm text-red-700">This session is in an operational state. Editing is disabled.</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">Session core details editor coming soon</p>
                )}
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
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="ManageSessions">
      <ManagementShell title="Manage Sessions" subtitle={`${sessions.length} total sessions`}>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-900 mb-1">Session Lifecycle Notice</h3>
          <p className="text-sm text-blue-800">Session lifecycle transitions (Provisional, Official, Locked) are managed exclusively through RegistrationDashboard.</p>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1" />
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
                      <Button variant="ghost" size="sm" onClick={() => setSelectedSessionForEdit(session)} disabled={isOperationalSession(session)}>
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
                        disabled={isOperationalSession(session)}
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
    </ManagementLayout>
  );
}