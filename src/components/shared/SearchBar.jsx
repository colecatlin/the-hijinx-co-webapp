import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, FileText, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchBar({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ stories: [], drivers: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ stories: [], drivers: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const [stories, drivers] = await Promise.all([
        base44.entities.OutletStory.list('-created_date', 50),
        base44.entities.Driver.list('-created_date', 50),
      ]);
      const q = query.toLowerCase();
      setResults({
        stories: stories.filter(s => 
          s.status === 'published' &&
          (s.title?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q)))
        ).slice(0, 5),
        drivers: drivers.filter(d => 
          d.name?.toLowerCase().includes(q) || d.team_name?.toLowerCase().includes(q) || d.hometown?.toLowerCase().includes(q)
        ).slice(0, 5),
      });
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const hasResults = results.stories.length > 0 || results.drivers.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-white"
    >
      <div className="max-w-3xl mx-auto px-6 pt-24">
        <div className="flex items-center gap-4 border-b-2 border-[#0A0A0A] pb-4">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search stories, drivers, teams..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-2xl font-light bg-transparent outline-none placeholder:text-gray-300"
          />
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400 hover:text-[#0A0A0A] transition-colors" />
          </button>
        </div>

        {query.length >= 2 && (
          <div className="mt-8 space-y-8">
            {loading && <p className="font-mono text-xs text-gray-400 tracking-wider">SEARCHING...</p>}

            {!loading && !hasResults && (
              <p className="font-mono text-sm text-gray-400">No results found for "{query}"</p>
            )}

            {results.stories.length > 0 && (
              <div>
                <p className="font-mono text-xs tracking-[0.2em] text-gray-400 mb-4">STORIES</p>
                <div className="space-y-3">
                  {results.stories.map(story => (
                    <Link
                      key={story.id}
                      to={createPageUrl('OutletStoryPage') + `?id=${story.id}`}
                      onClick={onClose}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors group"
                    >
                      <FileText className="w-4 h-4 mt-1 text-gray-300 group-hover:text-[#0A0A0A] transition-colors" />
                      <div>
                        <p className="font-semibold text-[#0A0A0A] group-hover:underline">{story.title}</p>
                        <p className="text-xs text-gray-400 font-mono mt-1">{story.category} · {story.author}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results.drivers.length > 0 && (
              <div>
                <p className="font-mono text-xs tracking-[0.2em] text-gray-400 mb-4">DRIVERS</p>
                <div className="space-y-3">
                  {results.drivers.map(driver => (
                    <Link
                      key={driver.id}
                      to={createPageUrl('DriverProfile') + `?id=${driver.id}`}
                      onClick={onClose}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors group"
                    >
                      <Flag className="w-4 h-4 mt-1 text-gray-300 group-hover:text-[#0A0A0A] transition-colors" />
                      <div>
                        <p className="font-semibold text-[#0A0A0A] group-hover:underline">{driver.name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-1">{driver.team_name} · {driver.hometown}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}