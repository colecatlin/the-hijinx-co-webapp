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
      const fullName = (first, last) => `${first} ${last}`.toLowerCase();
      setResults({
        stories: stories.filter(s => 
          s.status === 'published' &&
          (s.title?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q)))
        ).slice(0, 5),
        drivers: drivers.filter(d => 
          fullName(d.first_name || '', d.last_name || '').includes(q) || d.hometown_city?.toLowerCase().includes(q)
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
      className="fixed inset-0 z-[60]"
      style={{ background: 'rgba(5, 8, 10, 0.96)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
    >
      <div className="max-w-3xl mx-auto px-6 pt-24">
        <div className="flex items-center gap-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Search className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search stories, drivers, teams..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-2xl font-light bg-transparent outline-none"
            style={{ color: 'rgba(255,255,255,0.9)', caretColor: '#1DA1A1' }}
          />
          <button onClick={onClose}>
            <X className="w-5 h-5 transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
            />
          </button>
        </div>

        {query.length >= 2 && (
          <div className="mt-8 space-y-8">
            {loading && <p className="font-mono text-xs tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>SEARCHING...</p>}

            {!loading && !hasResults && (
              <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>No results found for "{query}"</p>
            )}

            {results.stories.length > 0 && (
              <div>
                <p className="font-mono text-xs tracking-[0.35em] mb-4" style={{ color: '#1DA1A1' }}>STORIES</p>
                <div className="space-y-1">
                  {results.stories.map(story => (
                    <Link
                      key={story.id}
                      to={createPageUrl('OutletStoryPage') + `?id=${story.id}`}
                      onClick={onClose}
                      className="flex items-start gap-3 p-3 rounded-lg transition-all group"
                      style={{ color: 'rgba(255,255,255,0.75)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <FileText className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
                      <div>
                        <p className="font-semibold" style={{ color: 'rgba(255,255,255,0.88)' }}>{story.title}</p>
                        <p className="text-xs font-mono mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{story.category} · {story.author}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results.drivers.length > 0 && (
              <div>
                <p className="font-mono text-xs tracking-[0.35em] mb-4" style={{ color: '#1DA1A1' }}>DRIVERS</p>
                <div className="space-y-1">
                  {results.drivers.map(driver => (
                    <Link
                      key={driver.id}
                      to={createPageUrl('DriverProfile') + `?id=${driver.id}`}
                      onClick={onClose}
                      className="flex items-start gap-3 p-3 rounded-lg transition-all group"
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Flag className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
                      <div>
                        <p className="font-semibold" style={{ color: 'rgba(255,255,255,0.88)' }}>{driver.first_name} {driver.last_name}</p>
                        <p className="text-xs font-mono mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{driver.hometown_city || ''}</p>
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