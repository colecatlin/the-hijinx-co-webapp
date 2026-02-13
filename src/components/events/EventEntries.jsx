import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';

export default function EventEntries({ eventId }) {
  const [selectedClass, setSelectedClass] = useState('all');

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => base44.entities.EventEntry.filter({ event_id: eventId, status: 'Published' })
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.filter({ status: 'Published' }),
    enabled: entries.length > 0
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: async () => {
      const classIds = [...new Set(entries.map(e => e.class_id))];
      if (classIds.length === 0) return [];
      const allClasses = await base44.entities.Class.filter({ status: 'Published' });
      return allClasses.filter(c => classIds.includes(c.id));
    },
    enabled: entries.length > 0
  });

  const filteredEntries = selectedClass === 'all' 
    ? entries 
    : entries.filter(e => e.class_id === selectedClass);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Entries</h2>
        {classes.length > 0 && (
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filteredEntries.length > 0 ? (
        <div className="space-y-2">
          {filteredEntries.map(entry => {
            const driver = drivers.find(d => d.id === entry.driver_id);
            const classInfo = classes.find(c => c.id === entry.class_id);
            return (
              <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <div>
                    {driver && (
                      <p className="font-semibold">
                        {driver.first_name} {driver.last_name}
                      </p>
                    )}
                    <div className="flex gap-2 text-sm text-gray-600">
                      {entry.car_number && <span>#{entry.car_number}</span>}
                      {entry.team_name && <span>• {entry.team_name}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {classInfo && (
                    <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                      {classInfo.name}
                    </span>
                  )}
                  {entry.is_late_add && (
                    <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      Late Add
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-gray-600">No entries available</p>
        </div>
      )}
    </div>
  );
}