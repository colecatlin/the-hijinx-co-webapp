/**
 * R9CX Phase 1 — UserPickerInput
 * Replaces raw UUID entry fields for assigning officials and investigators.
 * Searches users by name, email, or role. Returns user_id on selection.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, User, X } from 'lucide-react';

export default function UserPickerInput({ value, onChange, placeholder = 'Search users…', disabled = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users_picker'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
    staleTime: 120_000,
  });

  // Find selected user for display
  const selectedUser = useMemo(() => users.find(u => u.id === value), [users, value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return users.slice(0, 8);
    const q = query.toLowerCase();
    return users.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [users, query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (user) => {
    onChange(user.id);
    setOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected display or search input */}
      {selectedUser && !open ? (
        <div className="flex items-center gap-2 w-full bg-white/[0.04] border border-white/[0.08] rounded px-2.5 py-1.5">
          <User className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-gray-200 font-medium truncate">{selectedUser.full_name}</p>
            <p className="text-[10px] text-gray-500 truncate">{selectedUser.email} · {selectedUser.role}</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 w-full bg-white/[0.04] border border-white/[0.08] rounded px-2.5 py-1.5 focus-within:border-teal-600/50">
          <Search className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none text-[12px] text-gray-200 placeholder-gray-600 min-w-0"
          />
        </div>
      )}

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded border border-white/[0.12] bg-[#141818] shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-[11px] text-gray-600 text-center">
              {query ? `No users matching "${query}"` : 'No users found'}
            </div>
          ) : (
            filtered.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.06] transition-colors text-left border-b border-white/[0.04] last:border-0"
              >
                <div className="w-6 h-6 rounded-full bg-teal-900/40 border border-teal-700/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-teal-400">
                    {user.full_name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-gray-200 truncate">{user.full_name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600 flex-shrink-0">
                  {user.role}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}