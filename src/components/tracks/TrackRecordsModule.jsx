import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy } from 'lucide-react';

export default function TrackRecordsModule({ trackId }) {
  const [selectedLayout, setSelectedLayout] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const { data: layouts = [] } = useQuery({
    queryKey: ['layouts', trackId],
    queryFn: () => base44.entities.TrackLayout.filter({ track_id: trackId, status: 'Published' })
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['allClasses'],
    queryFn: () => base44.entities.Class.filter({ status: 'Published' })
  });

  const { data: records = [] } = useQuery({
    queryKey: ['records', trackId, selectedLayout, selectedClass],
    queryFn: async () => {
      const filter = { track_id: trackId, status: 'Published' };
      if (selectedLayout) filter.layout_id = selectedLayout;
      if (selectedClass) filter.class_id = selectedClass;
      return base44.entities.TrackRecord.filter(filter);
    },
    enabled: !!selectedLayout || !!selectedClass
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.filter({ status: 'Published' }),
    enabled: records.length > 0
  });

  React.useEffect(() => {
    if (layouts.length > 0 && !selectedLayout) {
      setSelectedLayout(layouts[0].id);
    }
  }, [layouts, selectedLayout]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Track Records</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Layout</label>
          <Select value={selectedLayout} onValueChange={setSelectedLayout}>
            <SelectTrigger>
              <SelectValue placeholder="Select layout" />
            </SelectTrigger>
            <SelectContent>
              {layouts.map(layout => (
                <SelectItem key={layout.id} value={layout.id}>
                  {layout.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Class</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All classes</SelectItem>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {records.length > 0 ? (
        <div className="space-y-4">
          {records.map(record => {
            const driver = drivers.find(d => d.id === record.holder_driver_id);
            return (
              <div key={record.id} className="flex items-start justify-between border-b pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                    <span className="font-semibold">{record.record_type}</span>
                  </div>
                  <p className="text-2xl font-bold">{record.record_value_text}</p>
                  {driver && (
                    <p className="text-sm text-gray-600 mt-1">
                      {driver.first_name} {driver.last_name}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-600">No records found for selected filters</p>
      )}
    </div>
  );
}