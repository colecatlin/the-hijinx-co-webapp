import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { MANAGEMENT_SECTIONS as SECTIONS } from './managementSections';
import { Search, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Build command list from SECTIONS
  const commands = SECTIONS.flatMap(section =>
    section.items.map(item => ({
      name: item.name,
      page: item.page,
      icon: item.icon,
      shortcut: item.shortcut,
      keywords: [item.name.toLowerCase(), section.title.toLowerCase()],
    }))
  );

  const filtered = query
    ? commands.filter(cmd =>
        cmd.keywords.some(keyword => keyword.includes(query.toLowerCase())) ||
        cmd.name.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      // Keyboard shortcuts for quick access (e.g., Cmd+D for Drivers)
      if ((e.metaKey || e.ctrlKey) && !open) {
        const shortcutChar = e.key.toUpperCase();
        const cmd = commands.find(c => c.shortcut === shortcutChar);
        if (cmd) {
          e.preventDefault();
          navigate(createPageUrl(cmd.page));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, navigate, commands]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    }
  }, [open]);

  const handleSelect = () => {
    if (filtered[selectedIndex]) {
      navigate(createPageUrl(filtered[selectedIndex].page));
      setOpen(false);
      setQuery('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200">
          {/* Input */}
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search management pages..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm outline-none bg-transparent"
            />
            <span className="text-xs text-gray-400">⎋ Close</span>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500">No pages found</p>
              </div>
            ) : (
              <div className="py-2">
                {filtered.map((cmd, index) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.page}
                      onClick={() => {
                        setSelectedIndex(index);
                        handleSelect();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                        index === selectedIndex
                          ? 'bg-gray-900 text-white'
                          : 'hover:bg-gray-50'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{cmd.name}</span>
                      {cmd.shortcut && (
                        <span className="text-xs opacity-50 font-mono">⌘{cmd.shortcut}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
            <div className="flex gap-3">
              <span>↑↓ Navigate</span>
              <span>⏎ Select</span>
            </div>
            <span className="text-[10px]">Cmd+K</span>
          </div>
        </div>
      </div>
    </>
  );
}