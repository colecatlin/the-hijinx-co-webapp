import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export default function DriverBioCard({ driver }) {
  const age = driver.date_of_birth ? calculateAge(new Date(driver.date_of_birth)) : null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Biographical Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date of Birth</p>
            <p className="font-medium">
              {driver.date_of_birth && format(new Date(driver.date_of_birth), 'MMM d, yyyy')}
              {age && ` (${age} years old)`}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nationality</p>
            <p className="font-medium">{driver.nationality}</p>
          </div>
        </div>
        
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Hometown</p>
          <p className="font-medium">
            {driver.hometown_city}{driver.hometown_state ? `, ${driver.hometown_state}` : ''} • {driver.hometown_country}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function calculateAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}