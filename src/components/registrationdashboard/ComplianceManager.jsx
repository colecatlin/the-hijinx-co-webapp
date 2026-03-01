import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, FileText } from 'lucide-react';
import EntryDetailDrawer from './EntryDetailDrawer';

export default function ComplianceManager({ selectedEvent }) {
  const [classFilter, setClassFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['entries', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.Entry.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.EventClass.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
  });

  const getDriverName = (driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
  };

  const getEventClassName = (seriesClassId) => {
    const seriesClass = seriesClasses.find((sc) => sc.id === seriesClassId);
    return seriesClass?.class_name || 'Unknown';
  };

  // Compute compliance issues
  const complianceData = useMemo(() => {
    if (!entries.length) return { missingWaivers: 0, expiredLicenses: 0, duplicates: 0, missingTransponders: 0, issues: [] };

    const today = new Date().toISOString().split('T')[0];
    const issues = [];

    // Find duplicates
    const carNumberCounts = {};
    entries.forEach((entry) => {
      carNumberCounts[entry.car_number] = (carNumberCounts[entry.car_number] || 0) + 1;
    });
    const duplicateCarNumbers = new Set(
      Object.keys(carNumberCounts).filter((key) => carNumberCounts[key] > 1)
    );

    let missingWaivers = 0;
    let expiredLicenses = 0;
    let missingTransponders = 0;

    entries.forEach((entry) => {
      // Missing waiver
      if (!entry.waiver_verified) {
        missingWaivers++;
        issues.push({
          entryId: entry.id,
          issueType: 'Missing Waiver',
          carNumber: entry.car_number,
          driver: getDriverName(entry.driver_id),
          class: getEventClassName(entry.series_class_id),
        });
      }

      // Expired license
      if (entry.license_expiration_date && entry.license_expiration_date < today) {
        expiredLicenses++;
        issues.push({
          entryId: entry.id,
          issueType: 'Expired License',
          carNumber: entry.car_number,
          driver: getDriverName(entry.driver_id),
          class: getEventClassName(entry.series_class_id),
        });
      }

      // Duplicate car number
      if (duplicateCarNumbers.has(entry.car_number)) {
        issues.push({
          entryId: entry.id,
          issueType: 'Duplicate Car Number',
          carNumber: entry.car_number,
          driver: getDriverName(entry.driver_id),
          class: getEventClassName(entry.series_class_id),
        });
      }

      // Missing transponder
      if (!entry.transponder_id || entry.transponder_id.trim() === '') {
        missingTransponders++;
        issues.push({
          entryId: entry.id,
          issueType: 'Missing Transponder',
          carNumber: entry.car_number,
          driver: getDriverName(entry.driver_id),
          class: getEventClassName(entry.series_class_id),
        });
      }
    });

    // Deduplicate issues by entry + type
    const uniqueIssues = [];
    const seen = new Set();
    issues.forEach((issue) => {
      const key = `${issue.entryId}-${issue.issueType}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueIssues.push(issue);
      }
    });

    return {
      missingWaivers,
      expiredLicenses,
      duplicates: duplicateCarNumbers.size,
      missingTransponders,
      issues: uniqueIssues,
    };
  }, [entries, drivers, seriesClasses]);

  // Filter issues
  const filteredIssues = useMemo(() => {
    return complianceData.issues.filter((issue) => {
      if (classFilter !== 'all' && issue.class !== classFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          issue.driver.toLowerCase().includes(search) ||
          issue.carNumber.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [complianceData.issues, classFilter, searchTerm]);

  const getEntryById = (entryId) => entries.find((e) => e.id === entryId);
  const classNames = useMemo(() => [...new Set(complianceData.issues.map((i) => i.class))], [complianceData.issues]);

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to view compliance.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-gray-400 block mb-1">Class</label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="bg-[#262626] border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classNames.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-400 block mb-1">Search</label>
            <Input
              placeholder="Driver, car number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#262626] border-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-400">Missing Waivers</span>
            </div>
            <p className="text-2xl font-bold text-yellow-500">{complianceData.missingWaivers}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-400">Expired Licenses</span>
            </div>
            <p className="text-2xl font-bold text-orange-500">{complianceData.expiredLicenses}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-400">Duplicate Car #</span>
            </div>
            <p className="text-2xl font-bold text-red-500">{complianceData.duplicates}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-400">Missing Transponders</span>
            </div>
            <p className="text-2xl font-bold text-purple-500">{complianceData.missingTransponders}</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance issues table */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-300">
            Compliance Issues ({filteredIssues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : filteredIssues.length === 0 ? (
            <p className="text-gray-400 text-sm">No compliance issues found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Issue Type</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Car #</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Driver</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Class</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((issue, idx) => (
                    <tr key={`${issue.entryId}-${issue.issueType}-${idx}`} className="border-b border-gray-800">
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            issue.issueType === 'Missing Waiver'
                              ? 'bg-yellow-900/40 text-yellow-300'
                              : issue.issueType === 'Expired License'
                              ? 'bg-orange-900/40 text-orange-300'
                              : issue.issueType === 'Duplicate Car Number'
                              ? 'bg-red-900/40 text-red-300'
                              : 'bg-purple-900/40 text-purple-300'
                          }`}
                        >
                          {issue.issueType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-300 font-medium">{issue.carNumber}</td>
                      <td className="py-3 px-3 text-gray-300">{issue.driver}</td>
                      <td className="py-3 px-3 text-gray-300">{issue.class}</td>
                      <td className="py-3 px-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const entry = getEntryById(issue.entryId);
                            if (entry) setSelectedEntry(entry);
                          }}
                          className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                          Open Entry
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry detail drawer */}
      {selectedEntry && (
        <EntryDetailDrawer
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSave={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}