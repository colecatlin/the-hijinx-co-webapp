import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AmsoilResultsTemplate from '@/components/management/AmsoilResultsTemplate';

export default function TemplatesSection() {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
        Templates
      </h2>
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>AMSOIL Results</CardTitle>
            <CardDescription>Bulk import race results via CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <AmsoilResultsTemplate />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}