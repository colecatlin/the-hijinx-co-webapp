import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Database, Link2, ArrowRight, Eye } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function PlatformDataMap() {
  const [dataMap, setDataMap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDataMap();
  }, []);

  const fetchDataMap = async () => {
    try {
      const res = await base44.functions.invoke('getPlatformDataMap', {});
      setDataMap(res.data);
    } catch (err) {
      console.error('Failed to fetch platform data map:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Platform Data Map...</p>
        </div>
      </div>
    );
  }

  if (!dataMap) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-red-700">Failed to load data map. Please try again.</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-600" />
            HIJINX Platform Data Map
          </h1>
          <p className="text-gray-600">Complete architecture blueprint showing entity structure, relationships, and data flows.</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="access">Access System</TabsTrigger>
            <TabsTrigger value="imports">Imports</TabsTrigger>
            <TabsTrigger value="pages">Pages & Flows</TabsTrigger>
          </TabsList>

          {/* ENTITY CATEGORIES */}
          <TabsContent value="categories" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(dataMap.entity_categories).map(([key, category]) => (
                <Card key={key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-indigo-700 capitalize">
                      {key.replace(/_/g, ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-gray-600">{category.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {category.entities.map((entity, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full"
                        >
                          {entity}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ENTITY RELATIONSHIPS */}
          <TabsContent value="relationships" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(dataMap.entity_relationships).map(([entity, relationships]) => (
                <Card key={entity}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                      <Link2 className="w-4 h-4" /> {entity}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {relationships.map((rel, i) => (
                        <li key={i} className="text-xs text-gray-700 flex gap-2">
                          <span className="text-blue-500 font-bold mt-0.5">→</span>
                          <span>{rel}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ACCESS SYSTEM */}
          <TabsContent value="access" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(dataMap.access_relationships).map(([entity, details]) => (
                <Card key={entity}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-purple-700">{entity}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {details.map((detail, i) => (
                        <li key={i} className="text-xs text-gray-700 flex gap-2">
                          <span className="text-purple-500 font-bold mt-0.5">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* IMPORT FLOWS */}
          <TabsContent value="imports" className="space-y-4">
            <div className="space-y-6">
              {/* Source Ingestion */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Source Ingestion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dataMap.import_flows.source_ingestion.map((flow, i) => (
                    <div key={i} className="border-l-4 border-green-300 pl-4 py-2">
                      <p className="text-xs font-semibold text-gray-800">{flow.source}</p>
                      <p className="text-xs text-gray-600 mt-1">{flow.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {flow.targets.map((t, j) => (
                          <span key={j} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Operational Ingestion */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Operational Ingestion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dataMap.import_flows.operational_ingestion.map((flow, i) => (
                    <div key={i} className="border-l-4 border-orange-300 pl-4 py-2">
                      <p className="text-xs font-semibold text-gray-800">{flow.source}</p>
                      <p className="text-xs text-gray-600 mt-1">{flow.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {flow.targets.map((t, j) => (
                          <span key={j} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Detailed Flows */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-amber-700">Detailed Operational Flows</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dataMap.import_flows.detailed_operational_flow.map((flow, i) => (
                    <div key={i} className="border-l-4 border-amber-300 pl-4 py-2">
                      <p className="text-xs font-semibold text-gray-800">{flow.name}</p>
                      <p className="text-xs text-gray-600 mt-1">{flow.flow}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PAGES & DATA FLOWS */}
          <TabsContent value="pages" className="space-y-4">
            <div className="space-y-6">
              {/* Page Dependencies */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-cyan-700 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Page Dependencies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(dataMap.page_dependencies).map(([page, dependencies]) => (
                      <div key={page} className="border rounded-lg p-4 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-800 mb-2">{page}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(dependencies) ? (
                            dependencies.map((dep, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded"
                              >
                                {dep}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-600 italic">{dependencies}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Data Flows */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-teal-700">System Data Flows</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(dataMap.data_flows).map(([flowName, description]) => (
                    <div key={flowName} className="border-l-4 border-teal-300 pl-4 py-2">
                      <p className="text-xs font-semibold text-gray-800 capitalize">
                        {flowName.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="pt-6">
            <p className="text-xs text-indigo-700">
              <strong>Master Blueprint:</strong> This data map represents the complete architecture of the HIJINX platform. Use it as a reference when developing new features, understanding data flows, and maintaining system integrity.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}