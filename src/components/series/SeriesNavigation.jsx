import React, { useState, useEffect } from 'react';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'format', label: 'Format' },
  { id: 'classes', label: 'Classes' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'teams', label: 'Teams' },
  { id: 'drivers', label: 'Drivers' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'standings', label: 'Standings' },
  { id: 'media', label: 'Media' },
  { id: 'governance', label: 'Governance' },
];

export default function SeriesNavigation({ activeSection, onSectionChange }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className={`sticky top-16 z-40 border-b border-gray-200 bg-white transition-all ${scrolled ? 'shadow-sm' : ''}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-8 overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`px-0 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeSection === section.id
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-600 hover:text-black'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}