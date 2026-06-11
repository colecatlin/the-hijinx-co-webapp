/**
 * R9CQ — CheckInSearchBar
 * Fast search by name, car number, or transponder.
 */
import React from 'react';
import { Search, X } from 'lucide-react';

export default function CheckInSearchBar({ value, onChange, placeholder = 'Search name, #number, transponder…' }) {
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded text-[11px] text-gray-200 placeholder-gray-600 pl-8 pr-8 py-1.5 outline-none focus:border-teal-600/50 transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 text-gray-500 hover:text-gray-300"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}