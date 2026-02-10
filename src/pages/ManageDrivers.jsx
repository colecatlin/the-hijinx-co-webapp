import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Pencil, Trash2, ArrowLeft, Upload, Download } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import DriverForm from '@/components/management/DriverForm';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadTemplate } from '@/components/shared/downloadTemplate';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DriverProgramsSection from '@/components/management/DriverManagement/DriverProgramsSection.jsx';
import DriverMediaSection from '@/components/management/DriverManagement/DriverMediaSection.jsx';
import DriverPerformanceSection from '@/components/management/DriverManagement/DriverPerformanceSection.jsx';
import DriverCommunitySection from '@/components/management/DriverManagement/DriverCommunitySection.jsx';
import DriverPartnershipSection from '@/components/management/DriverManagement/DriverPartnershipSection.jsx';
import DriverCoreDetailsSection from '@/components/management/DriverManagement/DriverCoreDetailsSection.jsx';
import { toast } from 'sonner';

export default function ManageDrivers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDriver, setEditingDriver] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [selectedDriverForEdit, setSelectedDriverForEdit] = useState(null);
  const [editingStatuses, setEditingStatuses] = useState({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('-updated_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Driver.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.Driver.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setSelectedDrivers([]);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Driver.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setEditingStatuses({});
    },
  });

  const filteredDrivers = drivers.filter(driver => {
    const query = searchQuery.toLowerCase();
    return (
      driver.first_name?.toLowerCase().includes(query) ||
      driver.last_name?.toLowerCase().includes(query) ||
      driver.display_name?.toLowerCase().includes(query)
    );
  });

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedDrivers(filteredDrivers.map(d => d.id));
    } else {
      setSelectedDrivers([]);
    }
  };

  const handleSelectDriver = (id) => {
    setSelectedDrivers(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedDrivers.length} selected driver(s)?`)) {
      bulkDeleteMutation.mutate(selectedDrivers);
    }
  };

  const handleEdit = (driver) => {
    setSelectedDriverForEdit(driver);
  };

  const handleDelete = async (driver) => {
    if (window.confirm(`Delete ${driver.display_name}?`)) {
      deleteMutation.mutate(driver.id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDriver(null);
  };

  const handleSaveSuccess = (newDriverId) => {
    if (newDriverId) {
      setSelectedDriverForEdit({ id: newDriverId });
      toast.success('Driver created successfully!');
    } else {
      setSelectedDriverForEdit(null);
      toast.success('Driver updated successfully!');
    }
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(drivers, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drivers-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        const dataArray = Array.isArray(importedData) ? importedData : [importedData];
        
        await base44.entities.Driver.bulkCreate(dataArray.map(({ id, created_date, updated_date, created_by, ...rest }) => rest));
        queryClient.invalidateQueries({ queryKey: ['drivers'] });
        alert(`Successfully imported ${dataArray.length} driver(s)`);
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (showForm) {
    return <DriverForm driver={editingDriver} onClose={handleFormClose} />;
  }

  if (selectedDriverForEdit) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setSelectedDriverForEdit(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-black mb-2">
                {selectedDriverForEdit.first_name} {selectedDriverForEdit.last_name}
              </h1>
              <p className="text-gray-600">Manage all driver data</p>
            </div>
          </div>

          <Tabs defaultValue="core" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="core">Core Details</TabsTrigger>
              <TabsTrigger value="programs">Programs</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="community">Community</TabsTrigger>
              <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
            </TabsList>
            <TabsContent value="core" className="mt-6">
              <DriverCoreDetailsSection driverId={selectedDriverForEdit.id} onSaveSuccess={handleSaveSuccess} />
            </TabsContent>
            <TabsContent value="programs" className="mt-6">
              <DriverProgramsSection driverId={selectedDriverForEdit.id} onSaveSuccess={handleSaveSuccess} />
            </TabsContent>
            <TabsContent value="media" className="mt-6">
              <DriverMediaSection driverId={selectedDriverForEdit.id} onSaveSuccess={handleSaveSuccess} />
            </TabsContent>
            <TabsContent value="performance" className="mt-6">
              <DriverPerformanceSection driverId={selectedDriverForEdit.id} onSaveSuccess={handleSaveSuccess} />
            </TabsContent>
            <TabsContent value="community" className="mt-6">
              <DriverCommunitySection driverId={selectedDriverForEdit.id} onSaveSuccess={handleSaveSuccess} />
            </TabsContent>
            <TabsContent value="partnerships" className="mt-6">
              <DriverPartnershipSection driverId={selectedDriverForEdit.id} onSaveSuccess={handleSaveSuccess} />
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
            <h1 className="text-4xl font-black mb-2">Manage Drivers</h1>
            <p className="text-gray-600">{drivers.length} total drivers</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadTemplate('driver', 'Driver')} title="Download import template">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('import-drivers').click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <input
              id="import-drivers"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button onClick={() => setSelectedDriverForEdit({ id: 'new', first_name: '', last_name: '', date_of_birth: '', nationality: '', hometown_city: '', hometown_country: '', primary_number: '', primary_discipline: '', status: 'Active' })} className="bg-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Add Driver
            </Button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {selectedDrivers.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedDrivers.length}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <Checkbox 
                      checked={selectedDrivers.length === filteredDrivers.length && filteredDrivers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Discipline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Checkbox 
                        checked={selectedDrivers.includes(driver.id)}
                        onCheckedChange={() => handleSelectDriver(driver.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{driver.first_name} {driver.last_name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {driver.hometown_city}, {driver.hometown_state}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {driver.primary_discipline}
                    </td>
                    <td className="px-6 py-4">
                      {editingStatuses[driver.id] ? (
                        <Select 
                          value={editingStatuses[driver.id]} 
                          onValueChange={(value) => {
                            updateStatusMutation.mutate({ id: driver.id, status: value });
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                            <SelectItem value="Part Time">Part Time</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span 
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded cursor-pointer ${
                            driver.status === 'Active' ? 'bg-green-100 text-green-800' :
                            driver.status === 'Part Time' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                          onClick={() => setEditingStatuses({ [driver.id]: driver.status })}
                        >
                          {driver.status || 'Active'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDriverForEdit(driver)}
                          title="Manage driver details"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(driver)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredDrivers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No drivers found
          </div>
        )}
      </div>
    </PageShell>
  );
}