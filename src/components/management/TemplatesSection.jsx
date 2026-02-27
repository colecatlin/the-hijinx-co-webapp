import React from 'react';
import { Download } from 'lucide-react';
import AmsoilResultsTemplate from '@/components/management/AmsoilResultsTemplate';

export default function TemplatesSection() {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
        Templates
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all group">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-900 transition-colors">
              <Download className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">AMSOIL Results</h3>
              <p className="text-sm text-gray-600 mb-4">Bulk import race results via CSV</p>
              <AmsoilResultsTemplate />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}