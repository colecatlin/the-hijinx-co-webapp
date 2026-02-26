import React from 'react';
import { Clock } from 'lucide-react';

export default function SeriesNameHistory({ series }) {
  const history = series?.name_history;
  const foundedYear = series?.founded_year;

  if (!foundedYear && (!history || history.length === 0)) return null;

  // Sort history by year_start ascending
  const sorted = history ? [...history].sort((a, b) => (a.year_start || 0) - (b.year_start || 0)) : [];

  return (
    <div className="bg-white border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-[#232323] mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5" /> Series History
      </h2>

      {foundedYear && (
        <p className="text-sm text-gray-500 mb-6">
          Founded in <span className="font-semibold text-[#232323]">{foundedYear}</span>
        </p>
      )}

      {sorted.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" />

          <div className="space-y-0">
            {sorted.map((entry, idx) => {
              const isCurrent = !entry.year_end;
              const isLast = idx === sorted.length - 1;
              return (
                <div key={idx} className="relative flex items-start gap-6 pb-8">
                  {/* Dot */}
                  <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    isCurrent
                      ? 'bg-[#00FFDA] border-[#00FFDA]'
                      : 'bg-white border-gray-300'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-[#232323]' : 'bg-gray-400'}`} />
                  </div>

                  <div className="flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-base font-bold text-[#232323]">{entry.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono uppercase bg-[#00FFDA] text-[#232323] px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-mono mb-1">
                      {entry.year_start}
                      {entry.year_end ? ` – ${entry.year_end}` : ' – Present'}
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}