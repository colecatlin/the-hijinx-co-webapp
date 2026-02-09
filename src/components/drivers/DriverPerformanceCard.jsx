import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DriverPerformanceCard({ performance }) {
  if (!performance) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Performance Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {performance.recent_form && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Current Form</p>
            <Badge className={
              performance.recent_form === 'Hot' ? 'bg-red-100 text-red-900' :
              performance.recent_form === 'Steady' ? 'bg-blue-100 text-blue-900' :
              'bg-orange-100 text-orange-900'
            }>
              {performance.recent_form}
            </Badge>
          </div>
        )}

        {performance.specialties && performance.specialties.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Specialties</p>
            <div className="flex flex-wrap gap-2">
              {performance.specialties.map(specialty => (
                <Badge key={specialty} variant="outline" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {performance.highlights && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Highlights</p>
            <p className="text-sm text-gray-700">{performance.highlights}</p>
          </div>
        )}

        {performance.championships && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Championships</p>
            <p className="text-sm text-gray-700">{performance.championships}</p>
          </div>
        )}

        {performance.notable_wins && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Notable Wins</p>
            <p className="text-sm text-gray-700">{performance.notable_wins}</p>
          </div>
        )}

        {performance.career_stats && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Career Statistics</p>
            <p className="text-sm text-gray-700">{performance.career_stats}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}