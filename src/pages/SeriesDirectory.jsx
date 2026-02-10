import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Trophy, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Skeleton } from '@/components/ui/skeleton';

export default function SeriesDirectory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  const filteredSeries = series.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.discipline?.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (!isAdmin) {
      matchesStatus = s.status === 'Active';
    } else if (statusFilter !== 'all') {
      matchesStatus = s.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <SectionHeader
          title="Series"
          subtitle="Racing championships and competitions"
        />

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search series..."
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filteredSeries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No series found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSeries.map(s => (
              <Link
                key={s.id}
                to={createPageUrl('SeriesDetail', { slug: s.slug })}
                className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <Trophy className="w-8 h-8 text-gray-400" />
                  <Badge variant={s.status === 'Active' ? 'default' : 'outline'}>
                    {s.status}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 transition-colors">
                  {s.name}
                </h3>
                <p className="text-sm text-gray-600">{s.discipline}</p>
                {s.sanctioning_body && (
                  <p className="text-xs text-gray-500 mt-1">{s.sanctioning_body}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}