import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import { 
  MapPin, Calendar, Trophy, Users, BarChart3, 
  Clock, FileText, Award, Database 
} from 'lucide-react';

export default function ManagementDashboard() {
  const sections = [
    {
      title: 'Core Data',
      items: [
        { name: 'Tracks', page: 'ManageTracks', icon: MapPin, description: 'Manage track profiles and layouts' },
        { name: 'Drivers', page: 'ManageDrivers', icon: Users, description: 'Manage driver profiles' },
        { name: 'Series', page: 'ManageSeries', icon: Trophy, description: 'Manage racing series' },
        { name: 'Classes', page: 'ManageClasses', icon: Award, description: 'Manage competition classes' }
      ]
    },
    {
      title: 'Events & Competition',
      items: [
        { name: 'Events', page: 'ManageEvents', icon: Calendar, description: 'Manage events and schedules' },
        { name: 'Sessions', page: 'ManageSessions', icon: Clock, description: 'Manage event sessions' },
        { name: 'Entries', page: 'ManageEntries', icon: FileText, description: 'Manage event entries' },
        { name: 'Results', page: 'ManageResults', icon: BarChart3, description: 'Manage session results' }
      ]
    },
    {
      title: 'Data & Records',
      items: [
        { name: 'Timing', page: 'ManageTiming', icon: Clock, description: 'Manage lap timing data' },
        { name: 'Standings', page: 'ManageStandings', icon: Trophy, description: 'Manage championship standings' },
        { name: 'Records', page: 'ManageRecords', icon: Award, description: 'Manage track records' },
        { name: 'Imports', page: 'ManageImports', icon: Database, description: 'CSV import tools' }
      ]
    }
  ];

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Management Dashboard</h1>
          <p className="text-lg text-gray-600">Backend management for motorsports data</p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={createPageUrl(item.page)}
                      className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-[#232323] hover:shadow-lg transition-all group"
                    >
                      <div className="flex flex-col items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-[#232323] transition-colors">
                          <Icon className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}