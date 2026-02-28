import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { Search, Plus, Pencil, Trash2, ArrowLeft, Upload, Download, Sparkles, CheckCircle2, XCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import DriverForm from '@/components/management/DriverForm';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadTemplate } from '@/components/shared/downloadTemplate';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DriverCoreDetailsSection from '@/components/management/DriverManagement/DriverCoreDetailsSection.jsx';
import DriverAccessSection from '@/components/management/DriverManagement/DriverAccessSection.jsx';
import DriverProgramSection from '@/components/management/DriverManagement/DriverProgramSection.jsx';
import DriverProgramsList from '@/components/management/DriverManagement/DriverProgramsList.jsx';
import DriverMediaSection from '@/components/management/DriverEditor/DriverMediaSection.jsx';
import DriverStatsManagement from '@/components/management/DriverManagement/DriverStatsManagement.jsx';
import DriverClaimsDisplay from '@/components/drivers/DriverClaimsDisplay.jsx';
import DriverResultsSection from '@/components/management/DriverManagement/DriverResultsSection.jsx';
import DriverDuplicateFinder from '@/components/management/DriverDuplicateFinder';
import { toast } from 'sonner';

export default function ManageDrivers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDriver, setEditingDriver] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [selectedDriverForEdit, setSelectedDriverForEdit] = useState(null);
  const [editingStatuses, setEditingStatuses] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importSeries, setImportSeries] = useState('nascar-cup-series');
  const [sortField, setSortField] = useState('updated_date');
  const [sortDir, setSortDir] = useState('desc');
  const [showDuplicateFinder, setShowDuplicateFinder] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Support deep-link: ?driverId=xxx opens that driver directly
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const driverId = params.get('driverId');
    if (driverId) {
      setSelectedDriverForEdit({ id: driverId });
    }
  }, []);

  const handleNascarImport = async () => {
    setImporting(true);
    setImportResult(null);
    const res = await base44.functions.invoke('importNascarStandings', { series: importSeries });
    setImporting(false);
    setImportResult(res.data);
    if (res.data?.success) {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    }
  };

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers', 'all'],
    queryFn: () => base44.entities.Driver.list('-updated_date', 500),
  });

  const { data: allPrograms = [] } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list(),
  });

  const { data: allMedia = [] } = useQuery({
    queryKey: ['driverMedia'],
    queryFn: () => base44.entities.DriverMedia.list(),
  });

  const programsByDriver = React.useMemo(() => {
    const map = {};
    allPrograms.forEach(p => {
      if (!map[p.driver_id]) map[p.driver_id] = [];
      map[p.driver_id].push(p);
    });
    return map;
  }, [allPrograms]);

  const mediaByDriver = React.useMemo(() => {
    const map = {};
    allMedia.forEach(m => { map[m.driver_id] = m; });
    return map;
  }, [allMedia]);

  const getProfileReadiness = (driver) => {
    const missing = [];
    if (!driver.first_name || !driver.last_name) missing.push('Name');
    const media = mediaByDriver[driver.id];
    if (!media?.headshot_url) missing.push('Headshot');
    if (!driver.date_of_birth) missing.push('Age (DOB)');
    if (!driver.hometown_country) missing.push('Nationality');
    const programs = programsByDriver[driver.id] || [];
    if (programs.length === 0) missing.push('1 Program (Series)');
    return { isReady: missing.length === 0, missing };
  };

  const toggleProfileStatusMutation = useMutation({
    mutationFn: ({ id, profile_status }) => base44.entities.Driver.update(id, { profile_status }),
    onSuccess: (_, { profile_status }) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success(`Profile set to ${profile_status}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id, driver) => {
      await base44.entities.Driver.delete(id);
      await base44.functions.invoke('logDeletion', { entityName: 'Driver', recordIds: [id], recordNames: [driver?.display_name || `${driver?.first_name} ${driver?.last_name}`] });
      await new Promise(r => setTimeout(r, 150));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver deleted');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids, selectedItems) => {
      for (const id of ids) {
        await base44.entities.Driver.delete(id);
        await new Promise(r => setTimeout(r, 100));
      }
      const names = selectedItems?.map(d => d.display_name || `${d.first_name} ${d.last_name}`) || [];
      await base44.functions.invoke('logDeletion', { entityName: 'Driver', recordIds: ids, recordNames: names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setSelectedDrivers([]);
      toast.success('Drivers deleted successfully');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Driver.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setEditingStatuses({});
    },
  });

  const filteredDrivers = React.useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = drivers.filter(driver =>
      driver.first_name?.toLowerCase().includes(query) ||
      driver.last_name?.toLowerCase().includes(query) ||
      driver.display_name?.toLowerCase().includes(query)
    );
    return [...filtered].sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'name') {
        aVal = `${a.last_name} ${a.first_name}`.toLowerCase();
        bVal = `${b.last_name} ${b.first_name}`.toLowerCase();
      } else if (sortField === 'profile_status') {
        aVal = a.profile_status || 'draft';
        bVal = b.profile_status || 'draft';
      } else if (sortField === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      } else {
        aVal = a[sortField] || '';
        bVal = b[sortField] || '';
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [drivers, searchQuery, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

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
      const selectedItems = drivers.filter(d => selectedDrivers.includes(d.id));
      bulkDeleteMutation.mutate(selectedDrivers, selectedItems);
    }
  };

  const handleEdit = (driver) => {
    setSelectedDriverForEdit(driver);
  };

  const handleDelete = async (driver) => {
    if (window.confirm(`Delete ${driver.display_name}?`)) {
      deleteMutation.mutate(driver.id, driver);
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
      <ManagementLayout currentPage="ManageDrivers">
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

          <Tabs defaultValue="core" className="mt-6">
            <TabsList>
              <TabsTrigger value="core">Core Details</TabsTrigger>
              <TabsTrigger value="programs">Programs</TabsTrigger>
              <TabsTrigger value="results">Race Results</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
            </TabsList>
            <TabsContent value="core" className="mt-6">
              <DriverCoreDetailsSection driverId={selectedDriverForEdit.id} onSaveSuccess={handleSaveSuccess} />
            </TabsContent>
            <TabsContent value="programs" className="mt-6">
              <DriverProgramsList driverId={selectedDriverForEdit.id} />
            </TabsContent>
            <TabsContent value="results" className="mt-6">
              <div className="space-y-6">
                <DriverResultsSection driverId={selectedDriverForEdit.id} />
                <DriverClaimsDisplay driverId={selectedDriverForEdit.id} />
              </div>
            </TabsContent>
            <TabsContent value="media" className="mt-6">
              <DriverMediaSection driverId={selectedDriverForEdit.id} />
            </TabsContent>
            <TabsContent value="stats" className="mt-6">
              <DriverStatsManagement driverId={selectedDriverForEdit.id} />
            </TabsContent>
            <TabsContent value="access" className="mt-6">
              <DriverAccessSection driverId={selectedDriverForEdit.id} />
            </TabsContent>
          </Tabs>
        </div>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="ManageDrivers">
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
            <Button
              onClick={() => setShowDuplicateFinder(true)}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Find Duplicates
            </Button>
            <Button onClick={() => setSelectedDriverForEdit({ id: 'new', first_name: '', last_name: '', date_of_birth: '', nationality: '', hometown_city: '', hometown_country: '', primary_number: '', primary_discipline: '', status: 'Active' })} className="bg-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Add Driver
            </Button>
          </div>
        </div>

        {importResult && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${importResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {importResult.success
              ? `✓ ${importResult.series_name} (${importResult.season}) — Drivers: ${importResult.drivers?.created} created, ${importResult.drivers?.skipped} already existed. Teams: ${importResult.teams?.created} created, ${importResult.teams?.skipped} already existed.`
              : importResult.error}
          </div>
        )}

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
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('name')}>
                    Name <SortIcon field="name" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('primary_discipline')}>
                    Discipline <SortIcon field="primary_discipline" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('status')}>
                    Status <SortIcon field="status" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('profile_status')}>
                    Profile <SortIcon field="profile_status" />
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
                    <td className="px-6 py-4">
                      {(() => {
                        const { isReady, missing } = getProfileReadiness(driver);
                        const isLive = driver.profile_status === 'live';
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    if (!isReady && !isLive) {
                                      toast.error(`Missing: ${missing.join(', ')}`);
                                      return;
                                    }
                                    toggleProfileStatusMutation.mutate({
                                      id: driver.id,
                                      profile_status: isLive ? 'draft' : 'live',
                                    });
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors ${
                                    isLive
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : isReady
                                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                  }`}
                                >
                                  {isLive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                  {isLive ? 'Live' : 'Draft'}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isLive
                                  ? 'Publicly visible — click to hide'
                                  : isReady
                                  ? 'Ready to publish — click to make live'
                                  : `Not ready. Missing: ${missing.join(', ')}`}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
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

      <DriverDuplicateFinder
        drivers={drivers}
        open={showDuplicateFinder}
        onOpenChange={setShowDuplicateFinder}
      />
    </ManagementLayout>
  );
}