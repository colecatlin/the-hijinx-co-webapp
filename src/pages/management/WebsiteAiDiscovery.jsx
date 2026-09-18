import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import AdminGuard from '@/components/management/AdminGuard';
import ManagementShell from '@/components/management/ManagementShell';
import AiDiscoveryOverview from '@/components/management/ai-discovery/AiDiscoveryOverview';
import AnswerabilityPanel from '@/components/management/ai-discovery/AnswerabilityPanel';
import EntityCoveragePanel from '@/components/management/ai-discovery/EntityCoveragePanel';
import StructuredDataPanel from '@/components/management/ai-discovery/StructuredDataPanel';
import CrawlDiscoveryPanel from '@/components/management/ai-discovery/CrawlDiscoveryPanel';
import { Activity, Database, FileCode, Globe, LayoutDashboard } from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'answerability', label: 'Answerability', icon: Activity },
  { key: 'coverage', label: 'Entity Coverage', icon: Database },
  { key: 'structured', label: 'Structured Data', icon: FileCode },
  { key: 'crawl', label: 'Crawl & Discovery', icon: Globe },
];

export default function WebsiteAiDiscovery() {
  const [activeTab, setActiveTab] = useState('overview');
  const [auditResult, setAuditResult] = useState(null);
  const [auditError, setAuditError] = useState(null);

  // ── Lightweight diagnostics (page load) ─────────────────────────────────────
  const { data: diagnosticsData, isLoading: diagnosticsLoading } = useQuery({
    queryKey: ['aiDiscoveryDiagnostics'],
    queryFn: () => base44.functions.invoke('getAiDiscoveryDiagnostics'),
    staleTime: 60 * 1000,
  });

  // ── Run Answerability Audit (explicit) ──────────────────────────────────────
  const auditMutation = useMutation({
    mutationFn: () => base44.functions.invoke('runAnswerabilityAudit', {}),
    onSuccess: (res) => {
      setAuditResult(res?.data || res);
      setAuditError(null);
    },
    onError: (err) => {
      setAuditError(err?.message || 'Audit execution failed');
    },
  });

  const handleRunAudit = useCallback(() => {
    auditMutation.mutate({});
  }, [auditMutation]);

  const diagnostics = diagnosticsData?.data;

  return (
    <ManagementLayout currentPage="management/website/ai-discovery">
      <AdminGuard>
        <ManagementShell
          title="Search & AI Discovery"
          subtitle="Manage search metadata and monitor machine-readable answerability"
        >
          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-divider overflow-x-auto mb-4">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-motion text-motion'
                      : 'border-transparent text-foreground-quiet hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Loading state */}
          {diagnosticsLoading && !diagnostics ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-divider border-t-motion rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <AiDiscoveryOverview
                  diagnostics={diagnostics}
                  auditResult={auditResult}
                  onRunAudit={handleRunAudit}
                  auditRunning={auditMutation.isPending}
                />
              )}
              {activeTab === 'answerability' && (
                <AnswerabilityPanel
                  auditResult={auditResult}
                  auditRunning={auditMutation.isPending}
                  auditError={auditError}
                  onRunAudit={handleRunAudit}
                />
              )}
              {activeTab === 'coverage' && <EntityCoveragePanel diagnostics={diagnostics} />}
              {activeTab === 'structured' && <StructuredDataPanel diagnostics={diagnostics} />}
              {activeTab === 'crawl' && <CrawlDiscoveryPanel diagnostics={diagnostics} />}
            </>
          )}
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}