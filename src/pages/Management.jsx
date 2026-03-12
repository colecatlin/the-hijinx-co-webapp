import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import ManagementSearch from '@/components/management/ManagementSearch';
import CommandPalette from '@/components/management/CommandPalette';
import StatsBar from '@/components/management/StatsBar';
import DataHealthPanel from '@/components/management/DataHealthPanel';
import { MANAGEMENT_SECTIONS } from '@/components/management/managementConfig';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldOff } from 'lucide-react';

export default function Management() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(MANAGEMENT_SECTIONS[0].title);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (userLoading) return null;

  if (!user) {
    base44.auth.redirectToLogin(createPageUrl('Management'));
    return null;
  }

  if (user.role !== 'admin') {
    return (
      <ManagementLayout currentPage="Management">
        <ManagementShell title="Access Denied" subtitle="">
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <ShieldOff className="w-10 h-10 text-gray-300" />
            <p className="text-gray-600 font-medium">Access denied</p>
            <p className="text-gray-400 text-sm max-w-sm">You do not currently have permission to access this area.</p>
            <Button size="sm" onClick={() => navigate(createPageUrl('MyDashboard'))}>Go to My Dashboard</Button>
          </div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  return (
    <>
      <CommandPalette />
      <ManagementLayout currentPage="Management">
        <ManagementShell title="Management" subtitle="Admin studio for Index46 data and site systems" maxWidth="max-w-none">
          <StatsBar />

          <div className="mt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1 rounded-lg mb-6">
                {MANAGEMENT_SECTIONS.map(section => (
                  <TabsTrigger
                    key={section.title}
                    value={section.title}
                    className="text-xs px-3 py-1.5"
                  >
                    {section.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {MANAGEMENT_SECTIONS.map(section => (
                <TabsContent key={section.title} value={section.title}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.page}
                          onClick={() => navigate(createPageUrl(item.page))}
                          className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors">
                            {Icon && <Icon className="w-5 h-5 text-gray-600" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.description}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="mt-6">
            <DataHealthPanel />
          </div>
        </ManagementShell>
      </ManagementLayout>
    </>
  );
}