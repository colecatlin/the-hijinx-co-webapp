import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { User, Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Skeleton } from '@/components/ui/skeleton';

export default function DriversDirectory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(search.toLowerCase()) ||
      driver.hometown_city?.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (!isAdmin) {
      matchesStatus = driver.status === 'Active';
    } else if (statusFilter !== 'all') {
      matchesStatus = driver.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <SectionHeader
          title="Drivers"
          subtitle="Professional racing drivers and competitors"
        />

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search drivers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {isAdmin && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No drivers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredDrivers.map(driver => (
              <Link
                key={driver.id}
                to={createPageUrl('DriverDetail', { slug: driver.slug })}
                className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {driver.hero_image ? (
                    <img
                      src={driver.hero_image}
                      alt={driver.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-base group-hover:text-blue-600 transition-colors">
                      {driver.name}
                    </h3>
                    <Badge variant={driver.status === 'Active' ? 'default' : 'outline'} className="text-xs">
                      {driver.status}
                    </Badge>
                  </div>
                  {driver.primary_discipline && (
                    <p className="text-xs text-gray-600 mb-1">{driver.primary_discipline}</p>
                  )}
                  {driver.hometown_city && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {driver.hometown_city}{driver.hometown_state_region && `, ${driver.hometown_state_region}`}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}