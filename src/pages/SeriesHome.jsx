import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Search } from 'lucide-react';

export default function SeriesHome() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const filteredSeries = series.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageShell>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <h1 className="text-4xl lg:text-5xl font-black mb-4">Racing Series</h1>
            <p className="text-gray-600 text-lg">Explore the world's premier motorsports series</p>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Series Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : filteredSeries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSeries.map((s) => (
                <Link
                  key={s.id}
                  to={createPageUrl(`SeriesDetail?id=${s.id}`)}
                  className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all"
                >
                  {s.logo_url && (
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      className="h-16 mb-4 object-contain"
                    />
                  )}
                  <h2 className="text-xl font-bold mb-2 group-hover:text-gray-600 transition-colors">{s.name}</h2>
                  {s.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{s.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{s.classes?.length || 0} classes</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No series found</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}