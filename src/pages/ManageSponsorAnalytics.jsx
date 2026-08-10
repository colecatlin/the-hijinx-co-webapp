import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shield, Download, FileJson, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import SponsorAnalyticsHero from '@/components/sponsor-analytics/SponsorAnalyticsHero';
import SponsorReadinessGauge from '@/components/sponsor-analytics/SponsorReadinessGauge';
import SponsorFinancialCard from '@/components/sponsor-analytics/SponsorFinancialCard';
import SponsorExecutionCard from '@/components/sponsor-analytics/SponsorExecutionCard';
import SponsorExposureCard from '@/components/sponsor-analytics/SponsorExposureCard';
import SponsorMediaCard from '@/components/sponsor-analytics/SponsorMediaCard';
import SponsorTrendCard from '@/components/sponsor-analytics/SponsorTrendCard';
import SponsorEvidenceTable from '@/components/sponsor-analytics/SponsorEvidenceTable';
import SponsorStatisticsGrid from '@/components/sponsor-analytics/SponsorStatisticsGrid';

export default function ManageSponsorAnalytics() {
  const [selectedOrgId, setSelectedOrgId] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: sponsors } = useQuery({
    queryKey: ['sponsorOrgs'],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.filter({ type: 'Sponsor' });
      return orgs.filter(o => o.visibility_status === 'live' && !o.is_archived);
    },
  });

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['sponsorAnalytics', selectedOrgId],
    queryFn: () => base44.functions.invoke('getSponsorAnalytics', { organization_id: selectedOrgId }),
    enabled: !!selectedOrgId && user?.role === 'admin',
  });

  if (user && user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-sm opacity-60">Sponsor Analytics is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  const handleExport = (format) => {
    if (!selectedOrgId) return;
    base44.functions.invoke('exportSponsorAnalytics', { organization_id: selectedOrgId, format }).then((res) => {
      if (format === 'csv') {
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sponsor-analytics-${selectedOrgId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sponsor-analytics-${selectedOrgId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sponsor Analytics & ROI</h1>
          <p className="text-sm opacity-60 mt-1">Commercial intelligence dashboard — Phase 17F</p>
        </div>
        {selectedOrgId && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <FileJson className="w-4 h-4 mr-2" /> JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
            </Button>
          </div>
        )}
      </div>

      {/* Sponsor selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1 w-full">
          <Label className="text-xs font-semibold uppercase tracking-wide mb-2">Select Sponsor</Label>
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a sponsor organization..." />
            </SelectTrigger>
            <SelectContent>
              {(sponsors || []).map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name} {org.industry ? `· ${org.industry}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {!selectedOrgId && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm opacity-50">Select a sponsor to view analytics</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          Error loading analytics: {error.message}
        </div>
      )}

      {analytics && !isLoading && (
        <div className="space-y-6">
          <SponsorAnalyticsHero analytics={analytics} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <SponsorReadinessGauge readiness={analytics.readiness} />
            </div>
            <div className="lg:col-span-2">
              <SponsorStatisticsGrid analytics={analytics} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SponsorFinancialCard financial={analytics.financial_metrics} />
            <SponsorExecutionCard
              activations={analytics.activation_metrics}
              deliverables={analytics.deliverable_metrics}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SponsorExposureCard exposure={analytics.exposure_metrics} />
            <SponsorMediaCard
              media={analytics.media_metrics}
              advertisements={analytics.advertisement_metrics}
            />
          </div>
          <SponsorTrendCard trends={analytics.trend_metrics} />
          <SponsorEvidenceTable evidence={analytics.evidence_matrix} />
        </div>
      )}
    </div>
  );
}