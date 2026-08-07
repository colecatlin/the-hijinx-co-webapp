import React, { useState, useMemo } from 'react';
import EventRacerCard from './EventRacerCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EventEntryList({ entries, classes }) {
  const [classFilter, setClassFilter] = useState('all');

  const filteredEntries = useMemo(() => {
    if (classFilter === 'all') return entries;
    return entries.filter(e => e.event_class_id === classFilter);
  }, [entries, classFilter]);

  if (!entries || entries.length === 0) {
    return (
      <div className="bg-surface border border-divider rounded-lg p-8 text-center">
        <p className="text-sm text-foreground-quiet">No entries have been published yet for this event.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {classes && classes.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-foreground-quiet font-medium">Filter:</span>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-48 text-sm"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map(cls => <SelectItem key={cls.event_class_id} value={cls.event_class_id}>{cls.class_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-foreground-quiet">{filteredEntries.length} entries</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredEntries.map((entry) => (
          <EventRacerCard
            key={entry.entry_id}
            racer={entry.racer}
            car_number={entry.car_number}
            class_name={entry.class_name}
            team={entry.team}
            vehicle={entry.vehicle}
            result={{ position: entry.best_result_position, points: entry.points }}
          />
        ))}
      </div>
    </div>
  );
}