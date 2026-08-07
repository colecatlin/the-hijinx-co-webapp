import React from 'react';
import { Wrench, Calendar, Flag, Trophy } from 'lucide-react';

export default function VehicleEngineHistory({ engine }) {
  if (!engine || (!engine.platform && !engine.manufacturer && !engine.displacement)) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No engine history available. Add an engine platform and manufacturer to enable engine tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {engine.platform && (
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Platform</div>
              <div className="text-base font-semibold text-[#232323]">{engine.platform}</div>
            </div>
          )}
          {engine.manufacturer && (
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Manufacturer</div>
              <div className="text-base font-semibold text-[#232323]">{engine.manufacturer}</div>
            </div>
          )}
          {engine.displacement && (
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Displacement</div>
              <div className="text-base font-semibold text-[#232323]">{engine.displacement}</div>
            </div>
          )}
          {engine.configuration && (
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Configuration</div>
              <div className="text-base font-semibold text-[#232323]">{engine.configuration}</div>
            </div>
          )}
          {engine.builder && (
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Builder</div>
              <div className="text-base font-semibold text-[#232323]">{engine.builder}</div>
            </div>
          )}
        </div>
        {engine.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Notes</div>
            <p className="text-sm text-gray-700">{engine.notes}</p>
          </div>
        )}
      </div>

      {engine.season_usage && engine.season_usage.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Season Usage</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Season</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">Starts</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">Wins</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">Best Finish</th>
                </tr>
              </thead>
              <tbody>
                {engine.season_usage.map((s, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-[#232323]">{s.season}</td>
                    <td className="text-center py-2 px-3 text-gray-600">{s.starts ?? 0}</td>
                    <td className="text-center py-2 px-3 text-gray-600">{s.wins ?? 0}</td>
                    <td className="text-center py-2 px-3 text-gray-600">{s.best_finish ? `P${s.best_finish}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}