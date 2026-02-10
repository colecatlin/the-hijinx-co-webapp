import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { buildProfileUrl } from '@/components/utils/routingContract';

export default function SeriesCard({ series }) {
  const disciplineColors = {
    'Asphalt Oval': 'bg-blue-100 text-blue-800',
    'Road Racing': 'bg-red-100 text-red-800',
    'Off Road': 'bg-orange-100 text-orange-800',
    'Snowmobile': 'bg-cyan-100 text-cyan-800',
    'Rallycross': 'bg-purple-100 text-purple-800',
    'Mixed': 'bg-gray-100 text-gray-800',
  };

  return (
    <Link
      to={buildProfileUrl('Series', series.slug)}
      className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-gray-300 transition-all"
    >
      <div className="mb-4">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${disciplineColors[series.discipline] || 'bg-gray-100 text-gray-800'}`}>
          {series.discipline}
        </span>
      </div>

      <h3 className="text-lg font-black mb-2 group-hover:text-gray-600 transition-colors">{series.name}</h3>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{series.description_summary}</p>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          <div>Founded: {series.founded_year || '—'}</div>
          <div>{series.region}</div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          series.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {series.status}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-4 text-gray-400 group-hover:text-gray-700 transition-colors">
        <span className="text-xs font-semibold">View Series</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </Link>
  );
}