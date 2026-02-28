import React from 'react';
import PageShell from '@/components/shared/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ManageRegistrations() {
  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Registration Management</h1>
          <p className="text-gray-600">Manage driver, team, and event registrations</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registrations Dashboard</CardTitle>
            <CardDescription>View and manage all registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-center py-12">Dashboard content coming soon</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}