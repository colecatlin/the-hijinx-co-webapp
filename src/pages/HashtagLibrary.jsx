import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PageShell from '@/components/shared/PageShell';

const HASHTAG_THEMES = [
  {
    title: 'HIJINX Associated',
    hashtags: ['#hijinx', '#inmotionwithpurpose', '#thehijinxco', '#inmotion', '#withpurpose'],
  },
  {
    title: 'Motorsports Culture',
    hashtags: ['#motorsports', '#racinglife', '#grassrootsracing', '#racingcommunity', '#itsracingtime'],
  },
  {
    title: 'INDEX46 Directory',
    hashtags: ['#index46', '#drivers', '#teams', '#tracks', '#series'],
  },
  {
    title: 'The Outlet',
    hashtags: ['#theoutlet', '#motorsportsmedia', '#racingstories', '#racingculture', '#pitlanelive'],
  },
  {
    title: 'Apparel & Lifestyle',
    hashtags: ['#hijinxapparel', '#weartheculture', '#racingstyle', '#paddocklife', '#garagestyle'],
  },
  {
    title: 'Race Day',
    hashtags: ['#raceday', '#flagtoflag', '#chaosonthetracks', '#greenwhitecheckered', '#postrace'],
  },
];

export default function HashtagLibrary() {
  const [selected, setSelected] = useState([]);
  const [copied, setCopied] = useState(false);

  const toggleHashtag = (tag) => {
    setSelected(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleCopySelected = () => {
    if (selected.length === 0) return;
    navigator.clipboard.writeText(selected.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectAll = () => {
    const all = HASHTAG_THEMES.flatMap(t => t.hashtags);
    setSelected(prev => prev.length === all.length ? [] : all);
  };

  const allTags = HASHTAG_THEMES.flatMap(t => t.hashtags);
  const allSelected = selected.length === allTags.length;

  return (
    <PageShell className="bg-[#0A0A0A] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-[2px] bg-[#FF6B35]" />
            <span className="font-mono text-[10px] tracking-[0.45em] text-[#FF6B35] uppercase font-bold">
              Community
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-3">
            Hashtag Library
          </h1>
          <p className="text-white/40 text-sm max-w-lg">
            Select the hashtags you want to use, then copy them all at once to paste into your posts.
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between mb-8 sticky top-20 z-10 py-3 px-4 bg-[#111] border border-white/10">
          <button
            onClick={handleSelectAll}
            className="text-xs font-mono text-white/50 hover:text-white transition-colors"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <div className="flex items-center gap-3">
            {selected.length > 0 && (
              <span className="font-mono text-[10px] text-white/30">{selected.length} selected</span>
            )}
            <button
              onClick={handleCopySelected}
              disabled={selected.length === 0}
              className={`px-5 py-2 text-xs font-bold border transition-all ${
                selected.length > 0
                  ? 'border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35]/10'
                  : 'border-white/10 text-white/20 cursor-not-allowed'
              }`}
            >
              {copied ? '✓ Copied!' : `Copy Selected${selected.length > 0 ? ` (${selected.length})` : ''}`}
            </button>
          </div>
        </div>

        {/* Themes grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {HASHTAG_THEMES.map((theme, i) => (
            <motion.div
              key={theme.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="p-6 flex flex-col gap-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] tracking-[0.3em] text-[#FF6B35] uppercase font-bold">{theme.title}</p>
                <button
                  onClick={() => {
                    const themeSelected = theme.hashtags.every(t => selected.includes(t));
                    if (themeSelected) {
                      setSelected(prev => prev.filter(t => !theme.hashtags.includes(t)));
                    } else {
                      setSelected(prev => [...new Set([...prev, ...theme.hashtags])]);
                    }
                  }}
                  className="text-[9px] font-mono text-white/30 hover:text-white/60 transition-colors"
                >
                  {theme.hashtags.every(t => selected.includes(t)) ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                {theme.hashtags.map(tag => (
                  <label key={tag} className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => toggleHashtag(tag)}
                      className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center transition-all ${
                        selected.includes(tag)
                          ? 'border-[#FF6B35] bg-[#FF6B35]'
                          : 'border-white/20 group-hover:border-white/40'
                      }`}
                    >
                      {selected.includes(tag) && (
                        <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 10 10">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span
                      onClick={() => toggleHashtag(tag)}
                      className={`font-mono text-sm transition-colors ${
                        selected.includes(tag) ? 'text-white' : 'text-white/50 group-hover:text-white/70'
                      }`}
                    >
                      {tag}
                    </span>
                  </label>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}