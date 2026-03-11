import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export default function AccessSuccessBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('access_updated') === '1') {
      setVisible(true);
      // Clean up URL param without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('access_updated');
      window.history.replaceState({}, '', url.toString());
      const timer = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
        <p className="text-sm font-medium text-green-800">Your entity access has been updated.</p>
      </div>
      <button onClick={() => setVisible(false)} className="text-green-500 hover:text-green-700 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}