import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ActivityTab from '@/components/management/ActivityTab';
import PublishTab from '@/components/management/PublishTab';

import { Search, Plus, Pencil, Trash2, ArrowLeft, Upload, Download, Sparkles, CheckCircle2, XCircle, Eye, EyeOff, AlertCircle, Hash, ExternalLink } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { buildRaceCoreUrl } from '@/components/registrationdashboard/raceCoreLinks';
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
import DriverBrandingSection from '@/components/management/DriverManagement/DriverBrandingSection.jsx';
import DriverCareerManager from '@/components/management/DriverManagement/DriverCareerManager.jsx';
import DriverSponsorManager from '@/components/management/DriverManagement/DriverSponsorManager.jsx';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import { toast } from 'sonner';
import { useEntityEditPermission } from '@/components/access/entityEditPermission';
import AdminOverridePanel from '@/components/management/AdminOverridePanel';

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
  const [driverDupCount, setDriverDupCount] = useState(null);

  // Lightweight background duplicate check on first load
  React.useEffect(() => {
    base44.functions.invoke('findDuplicateSourceEntities', { entity_type: 'driver' })
      .then(res => { if (res?.data?.duplicate_count > 0) setDriverDupCount(res.data.duplicate_count); })
      .catch(() => {});
  }, []);
  const [backfillingIds, setBackfillingIds] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkProfileStatus, setBulkProfileStatus] = useState('');
  const [bulkDiscipline, setBulkDiscipline] = useState('');
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  // Permission check for the currently-open driver edit view
  const editingDriverRecord = selectedDriverForEdit?.id && selectedDriverForEdit.id !== 'new'
    ? drivers.find(d => d.id === selectedDriverForEdit.id) || selectedDriverForEdit
    : selectedDriverForEdit;
  const {
    canEditManagement: canEditDriverManagement,
    canEditProtectedFields: canEditDriverProtectedFields,
  } = useEntityEditPermission('Driver', selectedDriverForEdit?.id, editingDriverRecord);

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
    mutationFn: ({ id, visibility_status }) => base44.entities.Driver.update(id, { visibility_status }),
    onSuccess: (_, { visibility_status }) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success(`Profile set to ${visibility_status}`);
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
    mutationFn: ({ id, racing_status }) => base44.entities.Driver.update(id, { racing_status }),
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
      } else if (sortField === 'visibility_status') {
        aVal = a.visibility_status || 'draft';
        bVal = b.visibility_status || 'draft';
      } else if (sortField === 'racing_status') {
        aVal = a.racing_status || '';
        bVal = b.racing_status || '';
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

  const handleBulkApply = async () => {
    if (!bulkStatus && !bulkProfileStatus && !bulkDiscipline) return;
    if (!window.confirm(`Apply changes to ${selectedDrivers.length} selected driver(s)?`)) return;
    setApplyingBulk(true);
    const updates = {};
    if (bulkStatus) updates.racing_status = bulkStatus;
    if (bulkProfileStatus) updates.visibility_status = bulkProfileStatus;
    if (bulkDiscipline) updates.primary_discipline = bulkDiscipline;
    for (const id of selectedDrivers) {
      await base44.entities.Driver.update(id, updates);
    }
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
    toast.success(`Updated ${selectedDrivers.length} driver(s)`);
    setBulkStatus('');
    setBulkProfileStatus('');
    setBulkDiscipline('');
    setApplyingBulk(false);
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
        let created = 0, updated = 0;
        for (const { id: _id, created_date, updated_date, created_by, ...rest } of dataArray) {
          const res = await base44.functions.invoke('syncSourceAndEntityRecord', {
            entity_type: 'driver',
            payload: rest,
            triggered_from: 'driver_json_import',
          });
          if (res?.data?.action === 'created') created++;
          else updated++;
        }
        queryClient.invalidateQueries({ queryKey: ['drivers'] });
        alert(`Import complete: ${created} created, ${updated} updated`);
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
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="core">Core Details</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="career">Career History</TabsTrigger>
              <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
              <TabsTrigger value="programs">Programs</TabsTrigger>
              <TabsTrigger value="results">Race Results</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
              {isAdmin && <TabsTrigger value="override">⚙ Override</TabsTrigger>}
            </TabsList>
            <TabsContent value="core" className="mt-6">
              <DriverCoreDetailsSection
                driverId={selectedDriverForEdit.id}
                onSaveSuccess={handleSaveSuccess}
                isReadOnly={!canEditDriverManagement}
                isAdmin={isAdmin}
              />
            </TabsContent>
            <TabsContent value="branding" className="mt-6">
              <DriverBrandingSection driverId={selectedDriverForEdit.id} driver={selectedDriverForEdit} onSaveSuccess={handleSaveSuccess} />
            </TabsContent>
            <TabsContent value="career" className="mt-6">
              <DriverCareerManager driverId={selectedDriverForEdit.id} />
            </TabsContent>
            <TabsContent value="sponsors" className="mt-6">
              <DriverSponsorManager driverId={selectedDriverForEdit.id} />
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
            {isAdmin && (
              <TabsContent value="override" className="mt-6">
                <AdminOverridePanel
                  entityType="Driver"
                  entityId={selectedDriverForEdit.id}
                  entityRecord={editingDriverRecord}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ['drivers', 'all'] })}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="ManageDrivers">
      <ManagementShell
        title="Drivers"
        subtitle={`${drivers.length} total drivers`}
        actions={activeTab === 'data' ? <>
          <input id="import-drivers" type="file" accept=".json" onChange={handleImport} className="hidden" />
          <Button variant="outline" onClick={() => downloadTemplate('driver', 'Driver')} title="Download import template"><Download className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button variant="outline" onClick={() => document.getElementById('import-drivers').click()}><Upload className="w-4 h-4 mr-2" />Import</Button>
          <Button onClick={async () => { setBackfillingIds(true); try { const res = await base44.functions.invoke('assignDriverNumericIds'); toast.success(`Assigned IDs to ${res.data?.driversUpdated ?? 0} drivers`); queryClient.invalidateQueries({ queryKey: ['drivers'] }); } catch (e) { toast.error('Failed to assign IDs: ' + e.message); } finally { setBackfillingIds(false); } }} disabled={backfillingIds} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50"><Hash className="w-4 h-4 mr-2" />{backfillingIds ? 'Assigning...' : 'Assign IDs'}</Button>
          <Button onClick={() => setShowDuplicateFinder(true)} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50"><AlertCircle className="w-4 h-4 mr-2" />Find Duplicates</Button>
          <Button onClick={() => setSelectedDriverForEdit({ id: 'new', first_name: '', last_name: '', date_of_birth: '', nationality: '', hometown_city: '', hometown_country: '', primary_number: '', primary_discipline: '', racing_status: 'Active' })} className="bg-gray-900"><Plus className="w-4 h-4 mr-2" />Add Driver</Button>
        </> : undefined}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600">{drivers.filter(d => d.racing_status === 'Active').length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Profiles Live</p>
                <p className="text-2xl font-bold text-blue-600">{drivers.filter(d => d.visibility_status === 'live').length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Part Time</p>
                <p className="text-2xl font-bold text-yellow-600">{drivers.filter(d => d.racing_status === 'Part Time').length}</p>
              </div>
            </div>
            <Button onClick={() => setSelectedDriverForEdit({ id: 'new', first_name: '', last_name: '', date_of_birth: '', nationality: '', hometown_city: '', hometown_country: '', primary_number: '', primary_discipline: '', racing_status: 'Active' })} className="w-full bg-[#232323] hover:bg-[#1A3249]">
              <Plus className="w-4 h-4 mr-2" />
              Add Driver
            </Button>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">

        {driverDupCount > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Potential duplicate driver records detected ({driverDupCount} group{driverDupCount > 1 ? 's' : ''}). Review before creating new records.</span>
            </div>
            <Link to={createPageUrl('Diagnostics')} className="text-xs font-semibold underline whitespace-nowrap">Open Diagnostics</Link>
          </div>
        )}

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
          {isAdmin && selectedDrivers.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex-wrap">
              <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">{selectedDrivers.length} selected</span>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Part Time">Part Time</SelectItem>
                </SelectContent>
              </Select>
              <Select value={bulkProfileStatus} onValueChange={setBulkProfileStatus}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Profile..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
              <Select value={bulkDiscipline} onValueChange={setBulkDiscipline}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Discipline..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Off Road">Off Road</SelectItem>
                  <SelectItem value="Snowmobile">Snowmobile</SelectItem>
                  <SelectItem value="Asphalt Oval">Asphalt Oval</SelectItem>
                  <SelectItem value="Road Racing">Road Racing</SelectItem>
                  <SelectItem value="Rallycross">Rallycross</SelectItem>
                  <SelectItem value="Drag Racing">Drag Racing</SelectItem>
                  <SelectItem value="Mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={handleBulkApply}
                disabled={applyingBulk || (!bulkStatus && !bulkProfileStatus && !bulkDiscipline)}
              >
                {applyingBulk ? 'Applying...' : 'Apply'}
              </Button>
              <Button 
                variant="destructive"
                size="sm"
                className="h-8 text-xs"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
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
                  {isAdmin && <th className="px-6 py-3 text-left w-12">
                    <Checkbox 
                      checked={selectedDrivers.length === filteredDrivers.length && filteredDrivers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>}
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('name')}>
                    Name <SortIcon field="name" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('primary_discipline')}>
                    Discipline <SortIcon field="primary_discipline" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('racing_status')}>
                    Status <SortIcon field="racing_status" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('visibility_status')}>
                    Profile <SortIcon field="visibility_status" />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    {isAdmin && <td className="px-6 py-4">
                      <Checkbox 
                        checked={selectedDrivers.includes(driver.id)}
                        onCheckedChange={() => handleSelectDriver(driver.id)}
                      />
                    </td>}
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
                            updateStatusMutation.mutate({ id: driver.id, racing_status: value });
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
                            driver.racing_status === 'Active' ? 'bg-green-100 text-green-800' :
                            driver.racing_status === 'Part Time' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                          onClick={() => setEditingStatuses({ [driver.id]: driver.racing_status })}
                        >
                          {driver.racing_status || 'Active'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const { isReady, missing } = getProfileReadiness(driver);
                        const isLive = driver.visibility_status === 'live';
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
                                      visibility_status: isLive ? 'draft' : 'live',
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
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(buildRaceCoreUrl({
                            tab: 'entries',
                            focusDriverId: driver.id,
                          }))}
                          title="Open in Race Core"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDriverForEdit(driver)}
                          title="Manage driver details"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleDelete(driver)}
                           disabled={deleteMutation.isPending}
                           className={deleteMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
                         >
                           {deleteMutation.isPending ? (
                             <div className="text-gray-400"><BurnoutSpinner /></div>
                           ) : (
                             <Trash2 className="w-4 h-4 text-red-600" />
                           )}
                         </Button>}
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

            <DriverDuplicateFinder
              drivers={drivers}
              open={showDuplicateFinder}
              onOpenChange={setShowDuplicateFinder}
            />
          </TabsContent>

          <TabsContent value="relationships" className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Driver Relationships</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Teams</p>
                  <p className="text-lg font-semibold">Associated via DriverProgram</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Series</p>
                  <p className="text-lg font-semibold">Associated via DriverProgram</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Manage driver team and series associations by editing the driver's program section.</p>
            </div>
          </TabsContent>

          <TabsContent value="publish">
            <PublishTab 
              entityCount={drivers.length}
              draftCount={drivers.filter(d => d.visibility_status === 'draft').length}
              liveCount={drivers.filter(d => d.visibility_status === 'live').length}
              hasPublishControl={true}
            />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab entityName="Driver" />
          </TabsContent>
        </Tabs>
      </ManagementShell>
    </ManagementLayout>
  );
}